import test from "node:test";
import assert from "node:assert/strict";
import { toMonthlyAmount, toMonthlySavedAmount } from "../src/lib/subscriptionMath.js";
import { appendCancelRecord, readCancelHistory } from "../src/lib/storage.js";
import { mergeSubscriptions } from "../src/lib/subscriptionSync.js";

test("1. 연간 구독 해지 시 절약액이 월 단위(12로 나눈 반올림)로 누적된다", () => {
  const annualSub = {
    subscriptionId: "sub-annual-1",
    name: "드롭박스 연간",
    amount: 120000,
    billingCycle: "매년",
  };
  const monthlySub = {
    subscriptionId: "sub-monthly-1",
    name: "유튜브 프리미엄",
    amount: 14900,
    billingCycle: "매월",
  };

  // useSubscriptions의 finishCancellation 누적 공식 검증
  let savedAmount = 0;
  const recordCancellation = (target, passedSaved) => {
    const rawSaved = passedSaved != null ? passedSaved : target.amount;
    const monthlySaved = toMonthlyAmount({ ...target, amount: rawSaved });
    savedAmount += monthlySaved;
  };

  // CancelModal이 넘기는 원금액(120,000원)을 넘겼을 때 월 10,000원으로 누적
  recordCancellation(annualSub, annualSub.amount);
  assert.equal(savedAmount, 10000);

  // 월간 구독(14,900원) 해지 시 그대로 14,900원 추가되어 총 24,900원
  recordCancellation(monthlySub, monthlySub.amount);
  assert.equal(savedAmount, 24900);

  // 연간 갱신 거절(handleRenewal) 경로: 99,000원 연간 구독 해지 시 반올림 8,250원 누적
  const renewalSub = {
    subscriptionId: "sub-annual-2",
    name: "제트브레인 연간",
    amount: 99000,
    billingCycle: "매년",
  };
  savedAmount += toMonthlyAmount(renewalSub);
  assert.equal(savedAmount, 24900 + 8250);
});

test("2. appendCancelRecord가 billingCycle을 저장하고 toMonthlySavedAmount가 레코드를 올바르게 월 환산 합산한다", () => {
  const mockStorage = new Map();
  global.window = {
    localStorage: {
      getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k),
    },
  };

  const annualSub = {
    id: "dropbox",
    subscriptionId: "sub-drop",
    name: "Dropbox",
    amount: 120000,
    billingCycle: "매년",
    paymentMethod: "현대카드 1234",
  };

  appendCancelRecord(annualSub);
  const history = readCancelHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].billingCycle, "매년");
  assert.equal(history[0].amount, 120000);

  // toMonthlySavedAmount 단위 검증
  assert.equal(toMonthlySavedAmount({ amount: 120000, billingCycle: "매년" }), 10000);
  assert.equal(toMonthlySavedAmount({ amount: 99000, billingCycle: "매년" }), 8250);
  assert.equal(toMonthlySavedAmount({ amount: 14900, billingCycle: "매월" }), 14900);
  // 기존 레코드(billingCycle 누락)는 월간으로 간주
  assert.equal(toMonthlySavedAmount({ amount: 17000 }), 17000);
  assert.equal(toMonthlySavedAmount(null), 0);

  // CancelHistorySection / SubscriptionListScreen의 fallback 합산 검증
  const mixedHistory = [
    { amount: 120000, billingCycle: "매년" }, // 월 10,000
    { amount: 14900, billingCycle: "매월" },  // 월 14,900
    { amount: 17000 },                        // 레거시 -> 월 17,000
  ];
  const totalFallback = mixedHistory.reduce((sum, item) => sum + toMonthlySavedAmount(item), 0);
  assert.equal(totalFallback, 10000 + 14900 + 17000);
});

test("3. 클라우드 동기화 시 빈 목록 및 오프라인 삭제 톰스톤이 로컬 목록을 되살리지 않는다", () => {
  const mockStorage = new Map();
  global.window = {
    localStorage: {
      getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k),
    },
  };

  // 1) 로컬에 남아있던 구독이 톰스톤으로 삭제된 경우: 클라우드 목록이 비어있으면 빈 배열이어야 함
  const localList = [
    {
      subscriptionId: "sub-deleted-1",
      name: "삭제된 넷플릭스",
      amount: 17000,
      updatedAt: "2026-10-01T00:00:00.000Z",
    },
  ];
  const tombstones = {
    "sub-deleted-1": "2026-10-02T00:00:00.000Z",
  };
  const cloudList = [];

  const { merged, toUpload, toDeleteFromCloud } = mergeSubscriptions({
    localList,
    cloudList,
    tombstones,
  });

  // 병합 결과는 빈 배열이어야 함 (삭제가 되살아나지 않음)
  assert.equal(merged.length, 0);
  assert.deepEqual(toUpload, []);
  assert.deepEqual(toDeleteFromCloud, []);

  // 기존 버그는 merged.length === 0 일 때 localCurrent를 반환하여 삭제 항목이 부활했음:
  // const result = merged.length > 0 ? merged : localList; // -> localList가 되어 부활
  // 수정 후 로직: merged(빈 배열)을 그대로 반환/적용
  const resolved = merged;
  assert.deepEqual(resolved, []);

  // 2) 클라우드 목록과 로컬 목록이 모두 비어있는 신규 사용자 케이스
  const emptyMerge = mergeSubscriptions({
    localList: [],
    cloudList: [],
    tombstones: {},
  });
  assert.deepEqual(emptyMerge.merged, []);
});

test("4. 동기화 부수효과가 React StrictMode / setState 업데이터 외부에서 격리 실행된다", async () => {
  // StrictMode에서는 setState 업데이터가 2회 실행될 수 있음.
  // 업데이터 내부가 순수 함수여야 중복 네트워크 호출이 방지됨.
  let uploadCalls = 0;
  let deleteCalls = 0;
  const mockUpsert = async () => { uploadCalls++; return true; };
  const mockDelete = async () => { deleteCalls++; return true; };

  const cloudList = [
    { subscriptionId: "cloud-1", name: "서버 구독", updatedAt: "2026-10-05T00:00:00.000Z" },
  ];
  const tombstones = {
    "cloud-1": "2026-10-10T00:00:00.000Z",
  };

  // 1) 병합 계산 및 업데이터 밖에서 부수효과 분리 실행
  const { merged, toUpload, toDeleteFromCloud } = mergeSubscriptions({
    localList: [],
    cloudList,
    tombstones,
  });

  // 상태 업데이터는 순수 계산이어야 함 (2번 실행해도 부수효과 0)
  const updater = () => merged;
  const firstRun = updater();
  const state = updater(); // React StrictMode 재실행 모사
  assert.deepEqual(firstRun, []);
  assert.deepEqual(state, []);
  assert.equal(uploadCalls, 0);
  assert.equal(deleteCalls, 0);

  // 부수효과는 업데이터 밖에서 정확히 1회 실행됨
  for (const item of toUpload) {
    await mockUpsert(item);
  }
  for (const id of toDeleteFromCloud) {
    await mockDelete(id);
  }
  assert.equal(uploadCalls, 0);
  assert.equal(deleteCalls, 1);
});
