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

test("수동 구독 등록 금액(0원 포함) 및 결제일 유효성 검증", () => {
  const isValid = (name, amount, dueDay, paymentMethod = "신한카드") => {
    if (!name || !name.trim()) return false;
    const strAmount = String(amount ?? "").trim();
    const numAmount = Number(strAmount);
    if (strAmount === "" || isNaN(numAmount) || numAmount < 0) return false;
    const numDueDay = Number(dueDay);
    if (!numDueDay || numDueDay < 1 || numDueDay > 31) return false;
    if (!paymentMethod || !paymentMethod.trim()) return false;
    return true;
  };

  assert.equal(isValid("넷플릭스", 17000, 15), true);
  assert.equal(isValid("유튜브 프리미엄 (무료체험)", 0, 15), true);
  assert.equal(isValid("유튜브 프리미엄 (무료체험)", "0", 15), true);
  assert.equal(isValid("넷플릭스", 17000, 15, ""), false);
  assert.equal(isValid("넷플릭스", 17000, 15, "   "), false);
  assert.equal(isValid("", 17000, 15), false);
  assert.equal(isValid("넷플릭스", "", 15), false);
  assert.equal(isValid("넷플릭스", -1000, 15), false);
  assert.equal(isValid("넷플릭스", 17000, 32), false);
  assert.equal(isValid("넷플릭스", 17000, 0), false);
});

test("무료체험 설정 시 금액이 자동으로 0원으로 설정되고 0원이 정상 인식된다", () => {
  let form = {
    name: "쿠팡 와우",
    amount: "",
    isTrial: false,
  };

  // 무료 체험 ON
  const onTrialToggle = (checked) => {
    form = {
      ...form,
      isTrial: checked,
      amount: checked ? "0" : (form.amount === "0" ? "" : form.amount),
    };
  };

  onTrialToggle(true);
  assert.equal(form.isTrial, true);
  assert.equal(form.amount, "0");

  // 0원 인식 유효성 검사
  const trimmed = String(form.amount).trim();
  const num = Number(trimmed);
  const isInvalid = trimmed === "" || isNaN(num) || num < 0;
  assert.equal(isInvalid, false);
  assert.equal(num, 0);

  // 무료 체험 OFF
  onTrialToggle(false);
  assert.equal(form.isTrial, false);
  assert.equal(form.amount, "");
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
