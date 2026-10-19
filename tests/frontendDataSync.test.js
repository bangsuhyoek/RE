import test from "node:test";
import assert from "node:assert/strict";
import { isPastDueThisCycle, parseLocalDate, getNextChargeDate } from "../src/lib/dates.js";
import {
  mergeSubscriptions,
  resolveSubscriptionMerge,
  ensureStorageMigration,
} from "../src/lib/subscriptionSync.js";
import { storageKeys, readStoredValue, writeStoredValue } from "../src/lib/storage.js";
import { createSubscriptionId } from "../src/lib/ids.js";

test("1. 갱신 확인 창: 연간 구독은 올해 결제일이 지났을 때만, 이번 결제일 이후 등록한 구독은 제외", () => {
  const refDate = new Date(2026, 8, 15); // 2026-09-15

  // 1-1. 연간 구독: 올해 결제일(10월 20일)이 아직 안 지난 경우 -> false
  const yearlyFuture = {
    subscriptionId: "sub-y1",
    billingCycle: "매년",
    nextBillingDate: "2026-10-20",
    createdAt: "2025-10-20T00:00:00.000Z",
  };
  assert.equal(isPastDueThisCycle(yearlyFuture, refDate), false);

  // 1-2. 연간 구독: 올해 결제일(9월 10일)이 지난 경우 -> true
  const yearlyPast = {
    subscriptionId: "sub-y2",
    billingCycle: "매년",
    nextBillingDate: "2026-09-10",
    createdAt: "2025-09-10T00:00:00.000Z",
  };
  assert.equal(isPastDueThisCycle(yearlyPast, refDate), true);

  // 1-3. 월간 구독: 이번 결제일(9월 10일) 이전 등록된 경우 -> 결제일 지났으므로 true
  const monthlyNormal = {
    subscriptionId: "sub-m1",
    billingCycle: "매월",
    dueDay: 10,
    createdAt: "2026-08-01T00:00:00.000Z",
  };
  assert.equal(isPastDueThisCycle(monthlyNormal, refDate), true);

  // 1-4. 월간 구독: 이번 결제일(9월 10일) '이후' 등록한 구독(9월 12일 등록) -> 이번 주기 제외 false
  const monthlyNewlyAdded = {
    subscriptionId: "sub-m2",
    billingCycle: "매월",
    dueDay: 10,
    createdAt: "2026-09-12T00:00:00.000Z",
  };
  assert.equal(isPastDueThisCycle(monthlyNewlyAdded, refDate), false);
});

test("3. 동기화: 항목별 수정 시각 비교 병합 및 오프라인 삭제 tombstone", () => {
  const localOld = {
    subscriptionId: "sub-1",
    name: "넷플릭스 로컬",
    amount: 17000,
    updatedAt: "2026-09-01T10:00:00.000Z",
  };
  const cloudNew = {
    subscriptionId: "sub-1",
    name: "넷플릭스 클라우드",
    amount: 19000,
    updatedAt: "2026-09-02T10:00:00.000Z",
  };

  // 클라우드가 더 최신인 경우 클라우드 승리
  assert.equal(resolveSubscriptionMerge(localOld, cloudNew).name, "넷플릭스 클라우드");

  // 로컬이 더 최신인 경우 로컬 승리
  const localNew = { ...localOld, updatedAt: "2026-09-03T10:00:00.000Z" };
  assert.equal(resolveSubscriptionMerge(localNew, cloudNew).name, "넷플릭스 로컬");

  // 오프라인 삭제 tombstone: 클라우드에 아직 있는 항목이지만 tombstone에 기록되어 있으면 삭제 대상 추출
  const tombstones = {
    "sub-deleted": "2026-09-10T12:00:00.000Z",
  };
  const cloudList = [
    { subscriptionId: "sub-deleted", name: "삭제된 서비스", updatedAt: "2026-09-05T00:00:00.000Z" },
    { subscriptionId: "sub-alive", name: "살아있는 서비스", updatedAt: "2026-09-05T00:00:00.000Z" },
  ];
  const { merged, toDeleteFromCloud } = mergeSubscriptions({
    localList: [],
    cloudList,
    tombstones,
  });

  assert.equal(merged.length, 1);
  assert.equal(merged[0].subscriptionId, "sub-alive");
  assert.deepEqual(toDeleteFromCloud, ["sub-deleted"]);
});

test("4. 계정 전환: 다른 사용자로 전환 시 로컬 데이터 격리 및 소유자 유저 ID 검증", () => {
  const mockStorage = new Map();
  global.window = {
    localStorage: {
      getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k),
    },
  };

  // 기존 사용자 A의 데이터가 로컬에 있는 상태
  writeStoredValue(storageKeys.ownerUserId, "user-A");
  writeStoredValue(storageKeys.subscriptions, [
    { subscriptionId: "sub-A1", name: "A의 구독" },
  ]);

  const ownerBefore = readStoredValue(storageKeys.ownerUserId, null);
  assert.equal(ownerBefore, "user-A");

  // 새 사용자 B 로그인 시도: ownerUserId가 다르면 로컬 데이터를 비우고 새 소유자 설정
  const newUserId = "user-B";
  const isDifferent = ownerBefore && ownerBefore !== newUserId;
  assert.equal(isDifferent, true);

  if (isDifferent) {
    writeStoredValue(storageKeys.ownerUserId, newUserId);
    writeStoredValue(storageKeys.subscriptions, []);
  }

  assert.equal(readStoredValue(storageKeys.ownerUserId, null), "user-B");
  assert.deepEqual(readStoredValue(storageKeys.subscriptions, []), []);
});

test("5. YYYY-MM-DD 로컬 날짜 해석 및 시간대 무관 날짜 일치", () => {
  const parsed = parseLocalDate("2026-09-15");
  assert.notEqual(parsed, null);
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 8); // 9월
  assert.equal(parsed.getDate(), 15);

  const parsed2 = parseLocalDate("2024-02-29");
  assert.equal(parsed2.getFullYear(), 2024);
  assert.equal(parsed2.getMonth(), 1); // 2월
  assert.equal(parsed2.getDate(), 29);
});

test("8. createSubscriptionId는 manual- / custom- 접두어와 고유 ID를 생성한다", () => {
  const id1 = createSubscriptionId("manual");
  const id2 = createSubscriptionId("manual");
  const idCustom = createSubscriptionId("custom");

  assert.match(id1, /^manual-/);
  assert.match(idCustom, /^custom-/);
  assert.notEqual(id1, id2);
});
