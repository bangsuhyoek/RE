import test from "node:test";
import assert from "node:assert/strict";
import { resolveRetryUpsert } from "../src/lib/subscriptionSync.js";
import { isPastDueThisCycle, parseLocalDate } from "../src/lib/dates.js";

const queued = (data) => ({ id: data.subscriptionId, type: "upsert", data, ownerUserId: "user-1" });

test("재시도 대기열: 실패한 수정 뒤에 삭제한 구독은 서버에 다시 올리지 않는다", () => {
  const item = queued({ subscriptionId: "sub-1", name: "넷플릭스", updatedAt: "2026-11-01T10:00:00.000Z" });
  const plan = resolveRetryUpsert(item, {
    localList: [],
    tombstones: { "sub-1": "2026-11-01T10:05:00.000Z" },
  });
  assert.deepEqual(plan, { action: "drop" });
});

test("재시도 대기열: 실패 뒤 더 새로 저장한 내용이 있으면 예전 사본 대신 최신 내용을 올린다", () => {
  const item = queued({ subscriptionId: "sub-1", amount: 13500, updatedAt: "2026-11-01T10:00:00.000Z" });
  const latest = { subscriptionId: "sub-1", amount: 17000, updatedAt: "2026-11-02T09:00:00.000Z" };
  const plan = resolveRetryUpsert(item, {
    localList: [{ subscriptionId: "sub-2", updatedAt: "2026-11-05T00:00:00.000Z" }, latest],
    tombstones: {},
  });
  assert.equal(plan.action, "upsert");
  assert.equal(plan.data, latest);
});

test("재시도 대기열: 삭제 기록이 수정보다 오래됐거나 로컬 사본이 없으면 대기 중인 사본을 그대로 올린다", () => {
  const data = { subscriptionId: "sub-1", amount: 9900, updatedAt: "2026-11-03T10:00:00.000Z" };
  const plan = resolveRetryUpsert(queued(data), {
    localList: [],
    tombstones: { "sub-1": "2026-11-01T00:00:00.000Z" },
  });
  assert.equal(plan.action, "upsert");
  assert.equal(plan.data, data);
});

test("재시도 대기열: 대기 사본의 시각을 알 수 없고 삭제 기록이 있으면 삭제가 이긴다", () => {
  const item = queued({ subscriptionId: "sub-1", name: "티빙" });
  const plan = resolveRetryUpsert(item, {
    localList: [{ subscriptionId: "sub-1", updatedAt: "2026-11-01T00:00:00.000Z" }],
    tombstones: { "sub-1": "2026-11-01T10:05:00.000Z" },
  });
  assert.deepEqual(plan, { action: "drop" });
});

test("재시도 대기열: 시각이 같으면 로컬 사본을 보낸다", () => {
  const time = "2026-11-02T09:00:00.000Z";
  const local = { subscriptionId: "sub-1", amount: 17000, updatedAt: time };
  const plan = resolveRetryUpsert(queued({ subscriptionId: "sub-1", amount: 13500, updatedAt: time }), {
    localList: [local],
  });
  assert.equal(plan.data, local);
});

test("재시도 대기열: 시각을 알 수 없어도 로컬 사본이 있으면 로컬 사본을 보낸다", () => {
  const local = { subscriptionId: "sub-1", amount: 17000 };
  const plan = resolveRetryUpsert(queued({ subscriptionId: "sub-1", amount: 13500 }), { localList: [local] });
  assert.equal(plan.data, local);

  const localNoTime = { subscriptionId: "sub-1", amount: 17000 };
  const plan2 = resolveRetryUpsert(
    queued({ subscriptionId: "sub-1", amount: 13500, updatedAt: "2026-11-02T09:00:00.000Z" }),
    { localList: [localNoTime] }
  );
  assert.equal(plan2.data, localNoTime);
});

test("재시도 대기열: 두 시각이 모두 유효하고 대기 사본이 더 새로우면 대기 사본을 보낸다", () => {
  const data = { subscriptionId: "sub-1", amount: 13500, updatedAt: "2026-11-03T09:00:00.000Z" };
  const plan = resolveRetryUpsert(queued(data), {
    localList: [{ subscriptionId: "sub-1", amount: 17000, updatedAt: "2026-11-02T09:00:00.000Z" }],
  });
  assert.equal(plan.data, data);
});

test("재시도 대기열: 데이터가 없는 깨진 항목은 버린다", () => {
  assert.deepEqual(resolveRetryUpsert({ id: "sub-1", type: "upsert", ownerUserId: "user-1" }), { action: "drop" });
  assert.deepEqual(resolveRetryUpsert(null), { action: "drop" });
});

test("재시도 대기열: 같은 카탈로그 id를 쓰는 구독 두 개 중 subscriptionId가 맞는 것만 쓴다", () => {
  const mine = { id: "netflix", subscriptionId: "sub-b", amount: 5500, updatedAt: "2026-11-04T00:00:00.000Z" };
  const other = { id: "netflix", subscriptionId: "sub-a", amount: 17000, updatedAt: "2026-11-05T00:00:00.000Z" };
  const item = {
    id: "sub-b",
    type: "upsert",
    data: { id: "netflix", subscriptionId: "sub-b", amount: 5000, updatedAt: "2026-11-03T00:00:00.000Z" },
  };
  const plan = resolveRetryUpsert(item, { localList: [other, mine] });
  assert.equal(plan.data, mine);

  // 맞는 subscriptionId가 로컬에 없으면 같은 카탈로그 id의 다른 구독을 쓰지 않는다.
  const plan2 = resolveRetryUpsert(item, { localList: [other] });
  assert.equal(plan2.data, item.data);
});

test("날짜: 시간대가 붙은 생성 시각은 기기 시간대의 날짜로 읽는다", () => {
  // 기기 시간 9월 12일 오전 8시. 한국 시간대에서는 UTC로 9월 11일이 된다.
  const createdAt = new Date(2026, 8, 12, 8, 0, 0).toISOString();
  const parsed = parseLocalDate(createdAt);
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 8);
  assert.equal(parsed.getDate(), 12);
  // 날짜만 있는 값은 기존과 같다.
  assert.equal(parseLocalDate("2026-09-15").getDate(), 15);
});

test("갱신 확인: 결제일 당일 아침에 등록한 월간 구독은 이번 주기 확인에서 뺀다", () => {
  const subscription = {
    subscriptionId: "sub-morning",
    billingCycle: "매월",
    dueDay: 12,
    createdAt: new Date(2026, 8, 12, 8, 0, 0).toISOString(),
  };
  assert.equal(isPastDueThisCycle(subscription, new Date(2026, 8, 15)), false);
});

test("갱신 확인: 첫 결제일(무료체험 종료일)이 아직 오지 않은 구독은 결제 여부를 묻지 않는다", () => {
  const trial = {
    subscriptionId: "sub-trial",
    billingCycle: "매월",
    dueDay: 10,
    status: "trial",
    isTrial: true,
    nextBillingDate: "2026-10-10",
    createdAt: "2026-09-01T03:00:00.000Z",
  };
  assert.equal(isPastDueThisCycle(trial, new Date(2026, 8, 15)), false);

  // 지정한 결제일이 이미 지났으면 기존처럼 확인한다.
  const converted = { ...trial, nextBillingDate: "2026-09-10", createdAt: "2026-08-01T03:00:00.000Z" };
  assert.equal(isPastDueThisCycle(converted, new Date(2026, 8, 15)), true);
});
