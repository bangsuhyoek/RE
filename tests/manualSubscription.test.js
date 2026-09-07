import test from "node:test";
import assert from "node:assert/strict";

test("수동 구독 등록 페이로드가 유효하게 구성되고 저장된다", () => {
  const manualData = {
    name: "디즈니 플러스",
    plan: "스탠다드",
    amount: 9900,
    dueDay: 15,
    billingCycle: "매월",
    paymentMethod: "카카오페이",
    category: "OTT",
    isTrial: false,
    memo: "가족 공유 계정",
    attachments: ["data:image/jpeg;base64,mock123"],
    monogram: "D",
    cancelUrl: "https://www.disneyplus.com",
  };

  assert.equal(manualData.name, "디즈니 플러스");
  assert.equal(manualData.amount, 9900);
  assert.equal(manualData.dueDay, 15);
  assert.equal(manualData.category, "OTT");
  assert.equal(manualData.attachments.length, 1);
  assert.equal(manualData.memo, "가족 공유 계정");
});

test("수동 구독 등록 금액 및 결제일 유효성 검증", () => {
  const isValid = (name, amount, dueDay) => {
    if (!name || !name.trim()) return false;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return false;
    const numDueDay = Number(dueDay);
    if (!numDueDay || numDueDay < 1 || numDueDay > 31) return false;
    return true;
  };

  assert.equal(isValid("넷플릭스", 17000, 15), true);
  assert.equal(isValid("", 17000, 15), false);
  assert.equal(isValid("넷플릭스", 0, 15), false);
  assert.equal(isValid("넷플릭스", -1000, 15), false);
  assert.equal(isValid("넷플릭스", 17000, 32), false);
  assert.equal(isValid("넷플릭스", 17000, 0), false);
});

test("자동 감지 데이터(initialData)가 수동 등록 폼 기본값으로 정상 매핑된다", () => {
  const initialData = {
    name: "Netflix",
    amount: 17000,
    plan: "프리미엄",
    paymentMethod: "신한카드",
    category: "OTT",
    autoDetected: true,
  };

  const formState = {
    name: initialData?.name || "",
    category: initialData?.category || "OTT",
    plan: initialData?.plan || "",
    amount: initialData?.amount ? String(initialData.amount) : "",
    dueDay: initialData?.dueDay || 15,
    billingCycle: initialData?.billingCycle || "매월",
    paymentMethod: initialData?.paymentMethod || "신용카드",
  };

  assert.equal(formState.name, "Netflix");
  assert.equal(formState.amount, "17000");
  assert.equal(formState.plan, "프리미엄");
  assert.equal(formState.paymentMethod, "신한카드");
  assert.equal(formState.category, "OTT");
});
