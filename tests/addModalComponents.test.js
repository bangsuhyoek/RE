import test from "node:test";
import assert from "node:assert/strict";

import {
  cleanKey,
  findServiceMatch,
  formatWon,
  annualDateLabel,
  makeInitialForm,
  validateImage,
} from "../src/components/addModal/utils.js";

test("cleanKey trims, lowercases, and removes spaces", () => {
  assert.equal(cleanKey(" Netflix Premium "), "netflixpremium");
  assert.equal(cleanKey(""), "");
  assert.equal(cleanKey(null), "null");
  assert.equal(cleanKey(undefined), "");
});

test("findServiceMatch finds exact and alias matches", () => {
  const catalog = [
    { id: "netflix", name: "넷플릭스", category: "OTT" },
    { id: "spotify", name: "Spotify", category: "음악" },
  ];

  assert.equal(findServiceMatch("넷플릭스", catalog)?.id, "netflix");
  assert.equal(findServiceMatch("netflix", catalog)?.id, "netflix");
  assert.equal(findServiceMatch("넷플", catalog)?.id, "netflix");
  assert.equal(findServiceMatch("스포티파이", catalog)?.id, "spotify");
  assert.equal(findServiceMatch("unknown-xyz", catalog), null);
});

test("formatWon formats numbers with Korean won currency", () => {
  assert.equal(formatWon(10000), "10,000원");
  assert.equal(formatWon("5500"), "5,500원");
  assert.equal(formatWon(0), "0원");
  assert.equal(formatWon("abc"), "0원");
});

test("annualDateLabel formats YYYY-MM-DD properly", () => {
  assert.equal(annualDateLabel("2026-10-21"), "매년 10월 21일 결제");
  assert.equal(annualDateLabel(""), "결제일 확인 필요");
  assert.equal(annualDateLabel(null), "결제일 확인 필요");
});

test("makeInitialForm creates form object with defaults", () => {
  const form = makeInitialForm(null, []);
  assert.equal(form.name, "");
  assert.equal(form.billingCycle, "매월");
  assert.equal(form.amount, "");
  assert.equal(form.sourceType, "manual");

  const filled = makeInitialForm({
    name: "유튜브 프리미엄",
    amount: 14900,
    dueDay: 15,
    autoDetected: true,
  }, []);
  assert.equal(filled.name, "유튜브 프리미엄");
  assert.equal(filled.amount, "14900");
  assert.equal(filled.dueDay, "15");
  assert.equal(filled.sourceType, "sms");
});

test("validateImage checks image extensions and sizes", () => {
  assert.equal(validateImage(null), "영수증 또는 결제 화면 이미지를 선택해 주세요.");
  assert.equal(validateImage({ name: "doc.pdf", type: "application/pdf", size: 100 }), "JPG, PNG, WEBP 이미지만 사용할 수 있습니다.");
  assert.equal(validateImage({ name: "img.jpg", type: "image/jpeg", size: 9 * 1024 * 1024 }), "이미지는 8MB 이하만 사용할 수 있습니다.");
  assert.equal(validateImage({ name: "img.jpg", type: "image/jpeg", size: 1024 }), "");
});

test("무료체험 구독은 billingCycle이 매월이라도 nextBillingDate를 보존한다", () => {
  const trialForm = makeInitialForm({
    name: "밀리의 서재",
    amount: 0,
    dueDay: 15,
    billingCycle: "매월",
    nextBillingDate: "2026-11-15",
    isTrial: true,
  }, []);

  assert.equal(trialForm.isTrial, true);
  assert.equal(trialForm.billingCycle, "매월");
  assert.equal(trialForm.nextBillingDate, "2026-11-15");

  // AddModal handleSubmit 저장 규칙:
  // nextBillingDate: form.billingCycle === "매년" || Boolean(form.isTrial) ? form.nextBillingDate || null : null
  const resolveNextBillingDate = (form) =>
    form.billingCycle === "매년" || Boolean(form.isTrial) ? form.nextBillingDate || null : null;

  assert.equal(resolveNextBillingDate(trialForm), "2026-11-15");

  const regularMonthlyForm = makeInitialForm({
    name: "Netflix",
    amount: 17000,
    dueDay: 15,
    billingCycle: "매월",
    nextBillingDate: "2026-11-15",
    isTrial: false,
  }, []);
  assert.equal(resolveNextBillingDate(regularMonthlyForm), null);
});
