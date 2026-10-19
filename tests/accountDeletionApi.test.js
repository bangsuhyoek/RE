import test from "node:test";
import assert from "node:assert/strict";
import handler, { _setSupabaseAdmin } from "../api/account-delete.js";
import {
  CONFIRMED_USER_TABLES,
  deleteUserData,
  deleteAuthUser,
  deleteAccount,
} from "../api/_lib/accountDeletion.js";

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    end(str) {
      if (str && !this.body) {
        try {
          this.body = JSON.parse(str);
        } catch {
          this.body = str;
        }
      }
      return this;
    },
  };
}

function createFakeSupabaseAdmin({ failOnTable = null, userAlreadyDeleted = false } = {}) {
  const callLog = [];
  const deletedStoragePaths = [];

  return {
    callLog,
    deletedStoragePaths,
    storage: {
      listBuckets: async () => ({
        data: [{ id: "receipts", name: "receipts" }, { id: "avatars", name: "avatars" }],
        error: null,
      }),
      from: (bucketId) => ({
        list: async (prefix) => {
          callLog.push({ type: "storage_list", bucket: bucketId, prefix });
          return { data: [{ name: "file1.png" }, { name: "file2.jpg" }], error: null };
        },
        remove: async (paths) => {
          callLog.push({ type: "storage_remove", bucket: bucketId, paths });
          deletedStoragePaths.push(...paths);
          return { data: paths, error: null };
        },
      }),
    },
    from: (tableName) => ({
      delete: () => ({
        eq: async (col, val) => {
          callLog.push({ type: "table_delete", table: tableName, col, val });
          if (failOnTable && failOnTable === tableName) {
            return { error: { message: `Database error on ${tableName}`, code: "50001" } };
          }
          return { data: null, error: null };
        },
      }),
    }),
    auth: {
      admin: {
        deleteUser: async (uid) => {
          callLog.push({ type: "auth_delete_user", uid });
          if (userAlreadyDeleted) {
            return {
              data: null,
              error: { status: 404, message: "User not found" },
            };
          }
          return { data: { user: { id: uid } }, error: null };
        },
      },
    },
  };
}

test("405: POST 및 OPTIONS 이외의 메서드는 405와 Allow 헤더를 반환한다", async () => {
  const getReq = { method: "GET", headers: {} };
  const getRes = createMockRes();
  await handler(getReq, getRes);

  assert.equal(getRes.statusCode, 405);
  assert.equal(getRes.body.ok, false);
  assert.equal(getRes.body.code, "METHOD_NOT_ALLOWED");
  assert.equal(getRes.headers["allow"], "POST, OPTIONS");

  const putReq = { method: "PUT", headers: {} };
  const putRes = createMockRes();
  await handler(putReq, putRes);
  assert.equal(putRes.statusCode, 405);

  const optionsReq = { method: "OPTIONS", headers: {} };
  const optionsRes = createMockRes();
  await handler(optionsReq, optionsRes);
  assert.equal(optionsRes.statusCode, 204);
});

test("401: 인증 헤더가 없거나 토큰이 유효하지 않으면 401을 반환한다", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

  try {
    // 1. 헤더 없음
    const reqNoHeader = { method: "POST", headers: {}, body: { confirmation: "탈퇴" } };
    const resNoHeader = createMockRes();
    await handler(reqNoHeader, resNoHeader);
    assert.equal(resNoHeader.statusCode, 401);
    assert.equal(resNoHeader.body.code, "AUTH_REQUIRED");

    // 2. 유효하지 않은 토큰 (fetch 가 401 반환)
    globalThis.fetch = async () => new Response("Unauthorized", { status: 401 });
    const reqInvalid = {
      method: "POST",
      headers: { authorization: "Bearer invalid-token" },
      body: { confirmation: "탈퇴" },
    };
    const resInvalid = createMockRes();
    await handler(reqInvalid, resInvalid);
    assert.equal(resInvalid.statusCode, 401);
    assert.equal(resInvalid.body.code, "AUTH_REQUIRED");
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("확인값 누락/오류: '탈퇴'가 아니면 400 및 CONFIRMATION_REQUIRED를 반환한다", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

  // auth 성공 모의 응답
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: "user-123", email: "user@example.com" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  try {
    // 확인값 누락
    const reqEmpty = {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: {},
    };
    const resEmpty = createMockRes();
    await handler(reqEmpty, resEmpty);
    assert.equal(resEmpty.statusCode, 400);
    assert.equal(resEmpty.body.code, "CONFIRMATION_REQUIRED");

    // 잘못된 확인값
    const reqWrong = {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: { confirmation: "취소" },
    };
    const resWrong = createMockRes();
    await handler(reqWrong, resWrong);
    assert.equal(resWrong.statusCode, 400);
    assert.equal(resWrong.body.code, "CONFIRMATION_REQUIRED");
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("삭제 순서: 외래키 종속성에 따라 자식 테이블부터 삭제 후 최종 auth 사용자를 삭제한다", async () => {
  const fakeAdmin = createFakeSupabaseAdmin();
  const userId = "test-user-uuid-999";

  const result = await deleteAccount({
    supabaseAdmin: fakeAdmin,
    userId,
    confirmation: "탈퇴",
  });

  assert.equal(result.ok, true);
  assert.equal(result.deleted, true);

  // 테이블 삭제 호출 순서 검증
  const tableDeletions = fakeAdmin.callLog
    .filter((c) => c.type === "table_delete")
    .map((c) => c.table);

  // 1. evidence_items -> evidence_cases 순서
  const itemsIdx = tableDeletions.indexOf("evidence_items");
  const casesIdx = tableDeletions.indexOf("evidence_cases");
  assert.ok(itemsIdx >= 0 && casesIdx >= 0, "evidence 테이블들이 삭제되어야 함");
  assert.ok(itemsIdx < casesIdx, "evidence_items는 evidence_cases보다 먼저 삭제되어야 함");

  // 2. approval_requests -> agent_mandates 순서
  const approvalIdx = tableDeletions.indexOf("approval_requests");
  const mandateIdx = tableDeletions.indexOf("agent_mandates");
  assert.ok(approvalIdx >= 0 && mandateIdx >= 0, "승인/위임 테이블들이 삭제되어야 함");
  assert.ok(approvalIdx < mandateIdx, "approval_requests는 agent_mandates보다 먼저 삭제되어야 함");

  // 3. subscriptions -> receipt_recognitions 순서
  const subIdx = tableDeletions.indexOf("subscriptions");
  const receiptIdx = tableDeletions.indexOf("receipt_recognitions");
  assert.ok(subIdx >= 0 && receiptIdx >= 0, "구독/영수증 테이블들이 삭제되어야 함");
  assert.ok(subIdx < receiptIdx, "subscriptions는 receipt_recognitions보다 먼저 삭제되어야 함");

  // 4. 모든 테이블 삭제 후 마지막에 auth_delete_user 호출
  const authIdx = fakeAdmin.callLog.findIndex((c) => c.type === "auth_delete_user");
  const lastTableIdx = fakeAdmin.callLog.map((c) => c.type).lastIndexOf("table_delete");
  assert.ok(authIdx > lastTableIdx, "auth 사용자 삭제는 모든 테이블 삭제 완료 후에 호출되어야 함");
});

test("부분 실패 시 auth 사용자 미삭제: 테이블 삭제 실패 시 auth 사용자를 삭제하지 않고 오류를 던진다", async () => {
  // subscriptions 테이블 삭제 시 실패하는 모의 환경
  const fakeAdmin = createFakeSupabaseAdmin({ failOnTable: "subscriptions" });
  const userId = "test-user-uuid-failed";

  await assert.rejects(
    async () => {
      await deleteAccount({
        supabaseAdmin: fakeAdmin,
        userId,
        confirmation: "탈퇴",
      });
    },
    (err) => {
      assert.equal(err.code, "TABLE_DELETION_FAILED");
      assert.equal(err.table, "subscriptions");
      return true;
    }
  );

  // auth 사용자 삭제가 호출되지 않았음을 단언
  const authCalled = fakeAdmin.callLog.some((c) => c.type === "auth_delete_user");
  assert.equal(authCalled, false, "테이블 삭제 실패 시 auth 사용자가 삭제되어서는 안 됨");
});

test("멱등 재시도: 이미 삭제된 auth 사용자(404 Not Found)에 대해 재시도해도 성공으로 처리한다", async () => {
  const fakeAdmin = createFakeSupabaseAdmin({ userAlreadyDeleted: true });
  const userId = "test-user-already-deleted";

  const res = await deleteAccount({
    supabaseAdmin: fakeAdmin,
    userId,
    confirmation: "탈퇴",
  });

  assert.equal(res.ok, true);
  assert.equal(res.deleted, true);
});

test("응답 및 오류에 개인정보(PII)가 포함되지 않는다", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

  const sensitiveEmail = "sensitive-user-data@example.com";
  const sensitiveUid = "secret-uuid-12345";

  globalThis.fetch = async (url) => {
    if (String(url).includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: sensitiveUid, email: sensitiveEmail }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  };

  const fakeAdmin = createFakeSupabaseAdmin();
  _setSupabaseAdmin(fakeAdmin);

  try {
    const req = {
      method: "POST",
      headers: { authorization: "Bearer token-value" },
      body: { confirmation: "탈퇴" },
    };
    const res = createMockRes();

    await handler(req, res);

    const bodyString = JSON.stringify(res.body || {});
    assert.equal(bodyString.includes(sensitiveEmail), false, "응답에 이메일이 포함되어서는 안 됨");
    assert.equal(bodyString.includes(sensitiveUid), false, "응답에 사용자 ID가 포함되어서는 안 됨");
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
  } finally {
    _setSupabaseAdmin(null);
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

