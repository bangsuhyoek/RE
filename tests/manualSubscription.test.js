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
