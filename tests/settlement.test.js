import test from "node:test";
import assert from "node:assert/strict";
import {
  getSharedSubscriptions,
  buildSettlementRequest,
  getSettlementDue,
  buildShareTarget,
} from "../src/lib/settlement.js";

// 1. 공동 구독 필터 (sharingEnabled && shareCount > 1 && status !== "cancelled")
test("getSharedSubscriptions: 공동 구독 필터링이 올바르게 동작한다", () => {
  const subscriptions = [
    {
      subscriptionId: "sub-1",
      name: "넷플릭스",
      sharingEnabled: true,
      shareCount: 4,
      status: "active",
    },
    {
      subscriptionId: "sub-2",
      name: "유튜브 프리미엄",
      sharingEnabled: false,
      shareCount: 4,
      status: "active",
    },
    {
      subscriptionId: "sub-3",
      name: "디즈니+",
      sharingEnabled: true,
      shareCount: 1, // 1명인 경우 제외
      status: "active",
    },
    {
      subscriptionId: "sub-4",
      name: "티빙",
      sharingEnabled: true,
      shareCount: 2,
      status: "cancelled", // 해지된 경우 제외
    },
    {
      subscriptionId: "sub-5",
      name: "웨이브",
      sharingEnabled: true,
      shareCount: 3,
      status: "active",
    },
  ];

  const result = getSharedSubscriptions(subscriptions);
  assert.equal(result.length, 2);
  assert.deepEqual(
    result.map((s) => s.subscriptionId),
    ["sub-1", "sub-5"]
  );
});

// 2. 1인 금액 및 총액 계산 (grossAmount 우선, 없으면 amount * shareCount, 반올림 규칙)
test("buildSettlementRequest: 1인 금액과 총액이 올바르게 계산된다", () => {
  const fixedNow = new Date(2026, 9, 1); // 2026-10-01

  // grossAmount가 지정된 경우 (17,000원 ÷ 4 = 4,250원)
  const sub1 = {
    subscriptionId: "sub-1",
    name: "Netflix",
    plan: "프리미엄",
    grossAmount: 17000,
    amount: 4250,
    sharingEnabled: true,
    shareCount: 4,
    dueDay: 15,
    billingCycle: "매월",
    status: "active",
  };

  const req1 = buildSettlementRequest(sub1, { now: fixedNow });
  assert.equal(req1.subscriptionId, "sub-1");
  assert.equal(req1.total, 17000);
  assert.equal(req1.perPerson, 4250);
  assert.equal(req1.members, 4);
  assert.equal(req1.others, 3);
  assert.equal(req1.chargeDate.getDate(), 15);

  // grossAmount가 없고 3명으로 나눌 때 반올림 처리 (10,000 ÷ 3 = 3,333원)
  const sub2 = {
    subscriptionId: "sub-2",
    name: "Apple One",
    amount: 3333,
    sharingEnabled: true,
    shareCount: 3,
    dueDay: 20,
    billingCycle: "매월",
  };
  // total = 3333 * 3 = 9999, 9999 / 3 = 3333
  const req2 = buildSettlementRequest(sub2, { now: fixedNow });
  assert.equal(req2.total, 9999);
  assert.equal(req2.perPerson, 3333);

  // grossAmount가 10000일 때
  const sub3 = {
    subscriptionId: "sub-3",
    name: "Apple One",
    grossAmount: 10000,
    amount: 3333,
    sharingEnabled: true,
    shareCount: 3,
    dueDay: 20,
    billingCycle: "매월",
  };
  const req3 = buildSettlementRequest(sub3, { now: fixedNow });
  assert.equal(req3.total, 10000);
  assert.equal(req3.perPerson, 3333);
});

// 3. 문구에 금액, 인원, 결제일 포함 여부 확인
test("buildSettlementRequest: 정산 메시지에 서비스명, 결제일, 총액, 인원, 1인 금액이 포함된다", () => {
  const fixedNow = new Date(2026, 9, 1); // 2026-10-01
  const sub = {
    subscriptionId: "sub-netflix",
    name: "Netflix",
    plan: "프리미엄",
    grossAmount: 17000,
    amount: 4250,
    sharingEnabled: true,
    shareCount: 4,
    dueDay: 15,
    billingCycle: "매월",
  };

  const req = buildSettlementRequest(sub, { now: fixedNow });
  assert.ok(req.message.includes("[꾸독 정산] Netflix 프리미엄"));
  assert.ok(req.message.includes("10월 15일 결제 ₩17,000 ÷ 4명"));
  assert.ok(req.message.includes("1인 ₩4,250 보내 주세요."));
});

// 4. memo의 10자리 이상 긴 숫자 가림 (계좌번호, 카드번호 마스킹)
test("buildSettlementRequest: memo에 포함된 10자리 이상 연속 숫자를 '***'로 가린다", () => {
  const fixedNow = new Date(2026, 9, 1);
  const sub = {
    subscriptionId: "sub-1",
    name: "Netflix",
    grossAmount: 17000,
    sharingEnabled: true,
    shareCount: 4,
    dueDay: 15,
    billingCycle: "매월",
  };

  // 계좌번호(11자리, 12자리 등) 및 일반 텍스트
  const memoWithAccount = "카카오뱅크 3333012345678 로 보내줘";
  const req = buildSettlementRequest(sub, { now: fixedNow, memo: memoWithAccount });

  assert.ok(req.message.includes("카카오뱅크 *** 로 보내줘"));
  assert.ok(!req.message.includes("3333012345678"));

  // 9자리 숫자는 유지되고, 10자리 이상 숫자는 마스킹됨
  const memoMixed = "9자리 123456789 와 10자리 1234567890";
  const reqMixed = buildSettlementRequest(sub, { now: fixedNow, memo: memoMixed });
  assert.ok(reqMixed.message.includes("9자리 123456789"));
  assert.ok(reqMixed.message.includes("10자리 ***"));
});

// 5. 결제일 임박(0~withinDays일) 건만 반환
test("getSettlementDue: 결제일이 0~withinDays일 남은 공동 구독만 반환한다", () => {
  const fixedNow = new Date(2026, 9, 14); // 2026-10-14 기준

  const subscriptions = [
    {
      subscriptionId: "sub-today",
      name: "서비스 오늘",
      grossAmount: 10000,
      sharingEnabled: true,
      shareCount: 2,
      dueDay: 14, // 오늘 (0일 남음)
      billingCycle: "매월",
    },
    {
      subscriptionId: "sub-tomorrow",
      name: "서비스 내일",
      grossAmount: 12000,
      sharingEnabled: true,
      shareCount: 3,
      dueDay: 15, // 내일 (1일 남음)
      billingCycle: "매월",
    },
    {
      subscriptionId: "sub-later",
      name: "서비스 4일후",
      grossAmount: 16000,
      sharingEnabled: true,
      shareCount: 4,
      dueDay: 18, // 4일 후
      billingCycle: "매월",
    },
  ];

  // withinDays = 1 (오늘과 내일 결제건만)
  const dueList1 = getSettlementDue(subscriptions, { now: fixedNow, withinDays: 1 });
  assert.equal(dueList1.length, 2);
  assert.deepEqual(
    dueList1.map((d) => d.subscriptionId),
    ["sub-today", "sub-tomorrow"]
  );

  // withinDays = 0 (오늘 결제건만)
  const dueList0 = getSettlementDue(subscriptions, { now: fixedNow, withinDays: 0 });
  assert.equal(dueList0.length, 1);
  assert.equal(dueList0[0].subscriptionId, "sub-today");
});

// 6. 해지된 구독 제외
test("getSettlementDue: 해지(cancelled) 상태인 구독은 결제일이 임박해도 제외된다", () => {
  const fixedNow = new Date(2026, 9, 14);
  const subscriptions = [
    {
      subscriptionId: "sub-active",
      name: "유지 중인 구독",
      grossAmount: 10000,
      sharingEnabled: true,
      shareCount: 2,
      dueDay: 14,
      billingCycle: "매월",
      status: "active",
    },
    {
      subscriptionId: "sub-cancelled",
      name: "해지된 구독",
      grossAmount: 10000,
      sharingEnabled: true,
      shareCount: 2,
      dueDay: 14,
      billingCycle: "매월",
      status: "cancelled",
    },
  ];

  const dueList = getSettlementDue(subscriptions, { now: fixedNow, withinDays: 1 });
  assert.equal(dueList.length, 1);
  assert.equal(dueList[0].subscriptionId, "sub-active");
});

// 7. buildShareTarget 검증
test("buildShareTarget: Web Share 및 클립보드 복사용 객체를 반환한다", () => {
  const request = {
    title: "[꾸독 정산] Netflix 정산 요청",
    message: "[꾸독 정산] Netflix\n10월 15일 결제 ₩17,000 ÷ 4명\n1인 ₩4,250 보내 주세요.",
  };

  const shareTarget = buildShareTarget(request);
  assert.equal(shareTarget.title, "[꾸독 정산] Netflix 정산 요청");
  assert.equal(shareTarget.text, request.message);
  assert.equal(shareTarget.fallbackText, request.message);
});

test("정산 메모의 하이픈·공백으로 끊은 계좌·전화번호도 가린다", () => {
  const sub = { subscriptionId: "y", name: "YouTube", amount: 4975, grossAmount: 19900, sharingEnabled: true, shareCount: 4, dueDay: 5, billingCycle: "매월", status: "active" };
  const message = buildSettlementRequest(sub, { now: new Date(2026, 9, 4), memo: "신한 110-123-456789 / 010 1234 5678 / 3명" }).message;
  assert.ok(!/110-123-456789/.test(message));
  assert.ok(!/010 1234 5678/.test(message));
  assert.match(message, /3명/);
});
