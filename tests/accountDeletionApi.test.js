import test from "node:test";
import assert from "node:assert/strict";
import handler, { _setSupabaseAdmin } from "../api/account-delete.js";
import {
  deleteAccount,
  deleteStorageObjects,
  sha256Hex,
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

test("cancel_difficulty_reports: user_id 대신 sha256(userId)인 owner_hash 컬럼으로 삭제하며 실패 시 전체 탈퇴가 실패한다", async () => {
  const fakeAdminSuccess = createFakeSupabaseAdmin();
  const userId = "test-user-hash-check";
  const expectedHash = sha256Hex(userId);

  await deleteAccount({
    supabaseAdmin: fakeAdminSuccess,
    userId,
    confirmation: "탈퇴",
  });

  const reportDeletion = fakeAdminSuccess.callLog.find(
    (c) => c.type === "table_delete" && c.table === "cancel_difficulty_reports"
  );
  assert.ok(reportDeletion, "cancel_difficulty_reports 삭제 호출이 있어야 함");
  assert.equal(reportDeletion.col, "owner_hash", "user_id가 아닌 owner_hash 컬럼을 사용해야 함");
  assert.equal(reportDeletion.val, expectedHash, "owner_hash 값은 sha256Hex(userId)와 일치해야 함");

  // 실패 시 swallow 되지 않고 전체 탈퇴가 중단되며 auth 사용자가 삭제되지 않는지 검증
  const fakeAdminFail = createFakeSupabaseAdmin({ failOnTable: "cancel_difficulty_reports" });
  await assert.rejects(
    async () => {
      await deleteAccount({
        supabaseAdmin: fakeAdminFail,
        userId,
        confirmation: "탈퇴",
      });
    },
    (err) => {
      assert.equal(err.code, "TABLE_DELETION_FAILED");
      assert.equal(err.table, "cancel_difficulty_reports");
      return true;
    }
  );

  const authCalled = fakeAdminFail.callLog.some((c) => c.type === "auth_delete_user");
  assert.equal(authCalled, false, "cancel_difficulty_reports 삭제 실패 시 auth 사용자가 삭제되어서는 안 됨");
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
    if (String(url).includes("/rpc/")) {
      return new Response(JSON.stringify({ allowed: true, retry_after_seconds: 0 }), { status: 200 });
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

test("account-delete: rate limit 한도 초과 시 429와 Retry-After 헤더를 반환한다", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

  globalThis.fetch = async (url) => {
    if (String(url).includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "user-rate-limited" }), { status: 200 });
    }
    if (String(url).includes("/rpc/")) {
      return new Response(JSON.stringify({ allowed: false, retry_after_seconds: 120 }), { status: 200 });
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

    assert.equal(res.statusCode, 429);
    assert.equal(res.body.code, "RATE_LIMITED");
    assert.equal(res.headers["retry-after"], "120");
    assert.equal(fakeAdmin.callLog.length, 0, "Rate limit에 걸리면 DB 삭제 작업이 실행되어서는 안 됨");
  } finally {
    _setSupabaseAdmin(null);
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("account-delete: rate limit 실패 시 fail-closed 503과 Retry-After: 60을 반환한다", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

  globalThis.fetch = async (url) => {
    if (String(url).includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "user-rate-limited" }), { status: 200 });
    }
    if (String(url).includes("/rpc/")) {
      return new Response(JSON.stringify({ error: "db error" }), { status: 500 });
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

    assert.equal(res.statusCode, 503);
    assert.equal(res.body.code, "RATE_LIMIT_UNAVAILABLE");
    assert.equal(res.headers["retry-after"], "60");
    assert.equal(fakeAdmin.callLog.length, 0, "Rate limit 실패 시 DB 삭제 작업이 실행되어서는 안 됨");
  } finally {
    _setSupabaseAdmin(null);
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("RPC 우선 호출: delete_submate_user_data RPC 성공 시 단일 트랜잭션으로 처리되고 순차 DELETE는 호출되지 않는다", async () => {
  const callLog = [];
  const fakeAdmin = {
    callLog,
    storage: {
      listBuckets: async () => ({ data: [], error: null }),
    },
    rpc: async (fn, args) => {
      callLog.push({ type: "rpc", fn, args });
      return { data: { ok: true }, error: null };
    },
    from: (table) => {
      callLog.push({ type: "table_from", table });
      return {
        delete: () => ({
          eq: async () => ({ data: null, error: null }),
        }),
      };
    },
    auth: {
      admin: {
        deleteUser: async (uid) => {
          callLog.push({ type: "auth_delete_user", uid });
          return { data: { user: { id: uid } }, error: null };
        },
      },
    },
  };

  const userId = "test-rpc-user-1";
  const result = await deleteAccount({
    supabaseAdmin: fakeAdmin,
    userId,
    confirmation: "탈퇴",
  });

  assert.equal(result.ok, true);
  assert.equal(result.deleted, true);
  assert.equal(result.fallback, false, "RPC 성공 시 fallback이 false여야 함");

  const rpcCalls = callLog.filter((c) => c.type === "rpc");
  assert.equal(rpcCalls.length, 1, "delete_submate_user_data RPC가 1회 호출되어야 함");
  assert.equal(rpcCalls[0].fn, "delete_submate_user_data");
  assert.deepEqual(rpcCalls[0].args, { target_user_id: userId });

  const tableCalls = callLog.filter((c) => c.type === "table_from");
  assert.equal(tableCalls.length, 0, "RPC 성공 시 개별 테이블 순차 DELETE가 호출되지 않아야 함");

  const authCalls = callLog.filter((c) => c.type === "auth_delete_user");
  assert.equal(authCalls.length, 1, "auth 사용자가 최종 삭제되어야 함");
});

test("RPC 미배포 시 폴백: 42883 또는 PGRST202 반환 시 순차 DELETE로 안전하게 폴백한다", async () => {
  for (const errCase of [
    { code: "42883", message: "function public.delete_submate_user_data(uuid) does not exist" },
    { code: "PGRST202", message: "Could not find the function in the schema cache" },
    { status: 404, message: "Not Found" },
  ]) {
    const callLog = [];
    const fakeAdmin = {
      callLog,
      storage: {
        listBuckets: async () => ({ data: [], error: null }),
      },
      rpc: async (fn, args) => {
        callLog.push({ type: "rpc", fn, args });
        return { data: null, error: errCase };
      },
      from: (table) => ({
        delete: () => ({
          eq: async (col, val) => {
            callLog.push({ type: "table_delete", table, col, val });
            return { data: null, error: null };
          },
        }),
      }),
      auth: {
        admin: {
          deleteUser: async (uid) => {
            callLog.push({ type: "auth_delete_user", uid });
            return { data: { user: { id: uid } }, error: null };
          },
        },
      },
    };

    const userId = "test-fallback-user";
    const result = await deleteAccount({
      supabaseAdmin: fakeAdmin,
      userId,
      confirmation: "탈퇴",
    });

    assert.equal(result.ok, true);
    assert.equal(result.deleted, true);
    assert.equal(result.fallback, true, "RPC 미배포 시 fallback이 true여야 함");

    const tableDeletions = callLog.filter((c) => c.type === "table_delete");
    assert.ok(tableDeletions.length > 0, "폴백 시 순차 테이블 DELETE가 실행되어야 함");

    const authCalls = callLog.filter((c) => c.type === "auth_delete_user");
    assert.equal(authCalls.length, 1, "auth 사용자 삭제가 정상 수행되어야 함");
  }
});

test("RPC 치명적 오류: DB 실행 에러(50001 등) 시 순차 삭제로 폴백하지 않고 오류를 던지며 auth 사용자도 삭제하지 않는다", async () => {
  const callLog = [];
  const fakeAdmin = {
    callLog,
    storage: {
      listBuckets: async () => ({ data: [], error: null }),
    },
    rpc: async (fn, args) => {
      callLog.push({ type: "rpc", fn, args });
      return { data: null, error: { code: "50001", message: "Deadlock detected in transaction" } };
    },
    from: (table) => ({
      delete: () => ({
        eq: async (col, val) => {
          callLog.push({ type: "table_delete", table, col, val });
          return { data: null, error: null };
        },
      }),
    }),
    auth: {
      admin: {
        deleteUser: async (uid) => {
          callLog.push({ type: "auth_delete_user", uid });
          return { data: { user: { id: uid } }, error: null };
        },
      },
    },
  };

  const userId = "test-error-user";
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
      return true;
    }
  );

  const tableDeletions = callLog.filter((c) => c.type === "table_delete");
  assert.equal(tableDeletions.length, 0, "치명적 RPC 오류 시 순차 삭제를 시도하지 않아야 함");

  const authCalls = callLog.filter((c) => c.type === "auth_delete_user");
  assert.equal(authCalls.length, 0, "치명적 RPC 오류 시 auth 사용자를 삭제하지 않아야 함");
});

test("재귀 스토리지 삭제: 하위 폴더(id/metadata null)를 재귀 탐색하여 중첩된 파일 경로들을 수집하고 삭제한다", async () => {
  const userId = "test-storage-tree-user";
  const removedPaths = [];
  const listedPrefixes = [];

  const tree = {
    [userId]: [
      { name: "root-receipt.png", id: "id-1", metadata: { size: 1024 } },
      { name: "docs", id: null, metadata: null },
    ],
    [`${userId}/docs`]: [
      { name: "statement.pdf", id: "id-2", metadata: { size: 2048 } },
      { name: "2026", id: null, metadata: null },
    ],
    [`${userId}/docs/2026`]: [
      { name: "october.json", id: "id-3", metadata: { size: 512 } },
    ],
  };

  const fakeAdmin = {
    storage: {
      listBuckets: async () => ({
        data: [{ id: "user-assets" }],
        error: null,
      }),
      from: () => ({
        list: async (prefix) => {
          listedPrefixes.push(prefix);
          return { data: tree[prefix] || [], error: null };
        },
        remove: async (paths) => {
          removedPaths.push(...paths);
          return { data: paths, error: null };
        },
      }),
    },
  };

  const result = await deleteStorageObjects(fakeAdmin, userId);
  assert.equal(result.ok, true);
  assert.equal(result.deletedCount, 3, "중첩된 3개 파일이 모두 삭제 집계되어야 함");

  assert.deepEqual(removedPaths, [
    `${userId}/root-receipt.png`,
    `${userId}/docs/statement.pdf`,
    `${userId}/docs/2026/october.json`,
  ]);

  assert.deepEqual(listedPrefixes, [
    userId,
    `${userId}/docs`,
    `${userId}/docs/2026`,
  ]);
});

test("스토리지 안전 검증: 최대 재귀 깊이(5) 초과 탐색 중단 및 경로 순회(..) 방지", async () => {
  const userId = "test-depth-safety-user";
  const removedPaths = [];
  const listedPrefixes = [];

  // 깊이 6까지 이어지는 폴더 트리 및 악의적 .. 경로 포함
  const fakeAdmin = {
    storage: {
      listBuckets: async () => ({
        data: [{ id: "test-bucket" }],
        error: null,
      }),
      from: () => ({
        list: async (prefix) => {
          listedPrefixes.push(prefix);
          const parts = prefix.split("/");
          const depth = parts.length;
          if (depth === 1) {
            return {
              data: [
                { name: "d1", id: null, metadata: null },
                { name: "../secret.key", id: "bad", metadata: {} },
              ],
              error: null,
            };
          }
          if (depth >= 2 && depth <= 5) {
            return {
              data: [
                { name: `file-${depth}.txt`, id: `f-${depth}`, metadata: {} },
                { name: `d${depth}`, id: null, metadata: null },
              ],
              error: null,
            };
          }
          // depth 6 이상
          return {
            data: [{ name: "unreachable.txt", id: "unreach", metadata: {} }],
            error: null,
          };
        },
        remove: async (paths) => {
          removedPaths.push(...paths);
          return { data: paths, error: null };
        },
      }),
    },
  };

  const result = await deleteStorageObjects(fakeAdmin, userId);
  assert.equal(result.ok, true);

  // 깊이 5 초과 경로는 탐색되지 않음 (최대 5레벨까지만 탐색)
  assert.ok(!listedPrefixes.some((p) => p.split("/").length > 5));
  // 악의적 경로는 절대 삭제 대상에 포함되지 않음
  assert.ok(!removedPaths.some((p) => p.includes("..") || !p.startsWith(`${userId}/`)));
});

test("스토리지 삭제 페이지네이션: 100건 초과(101건) 시 다음 페이지를 조회해 모두 삭제하고 페이지 상한(20페이지)에서 멈춘다", async () => {
  const userId = "test-pagination-user";
  const removedPaths = [];
  const listCalls = [];

  // 1. 101개 파일 페이지네이션 검증 (1페이지 100건, 2페이지 1건)
  const page1Files = Array.from({ length: 100 }, (_, i) => ({
    name: `file-${i + 1}.png`,
    id: `id-${i + 1}`,
    metadata: { size: 100 },
  }));
  const page2Files = [
    { name: "file-101.png", id: "id-101", metadata: { size: 100 } },
  ];

  const fakeAdmin101 = {
    storage: {
      listBuckets: async () => ({
        data: [{ id: "receipts" }],
        error: null,
      }),
      from: () => ({
        list: async (prefix, options) => {
          listCalls.push({ prefix, options });
          const offset = options?.offset || 0;
          if (offset === 0) return { data: page1Files, error: null };
          if (offset === 100) return { data: page2Files, error: null };
          return { data: [], error: null };
        },
        remove: async (paths) => {
          removedPaths.push(...paths);
          return { data: paths, error: null };
        },
      }),
    },
  };

  const res101 = await deleteStorageObjects(fakeAdmin101, userId);
  assert.equal(res101.ok, true);
  assert.equal(res101.deletedCount, 101, "101개 파일이 모두 삭제 집계되어야 함");
  assert.equal(removedPaths.length, 101, "remove에 101개 경로가 모두 전달되어야 함");
  assert.equal(listCalls.length, 2, "list가 2페이지(offset 0, offset 100) 호출되어야 함");
  assert.equal(listCalls[0].options.offset, 0);
  assert.equal(listCalls[1].options.offset, 100);

  // 2. 페이지 상한(MAX_STORAGE_PAGES_PER_FOLDER = 20)에서 무한 루프 없이 중단되는지 검증
  let infiniteListCalls = 0;
  const infinitePage = Array.from({ length: 100 }, (_, i) => ({
    name: `loop-file-${i}.txt`,
    id: `loop-${i}`,
    metadata: {},
  }));

  const fakeAdminInfinite = {
    storage: {
      listBuckets: async () => ({
        data: [{ id: "infinite-bucket" }],
        error: null,
      }),
      from: () => ({
        list: async () => {
          infiniteListCalls++;
          return { data: infinitePage, error: null };
        },
        remove: async (paths) => ({ data: paths, error: null }),
      }),
    },
  };

  const resInfinite = await deleteStorageObjects(fakeAdminInfinite, userId);
  assert.equal(resInfinite.ok, true);
  assert.equal(infiniteListCalls, 20, "페이지 상한인 20회에서 호출이 중단되어야 함");
  assert.equal(resInfinite.deletedCount, 2000, "20페이지 분량(2000건)만 수집되어야 함");
});

