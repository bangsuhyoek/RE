import test from "node:test";
import assert from "node:assert/strict";
import {
  build1372Draft,
  buildFtcReportDraft,
  formatKSTDateTime,
  SUBMIT_URLS,
} from "../src/lib/complaintDrafts.js";

test("formatKSTDateTime formats UTC/ISO date string to KST correctly", () => {
  // 2026-10-16T00:00:00.000Z -> KST is +9 hours -> 2026년 10월 16일 09:00
  const kst = formatKSTDateTime("2026-10-16T00:00:00.000Z");
  assert.equal(kst, "2026년 10월 16일 09:00");

  // Invalid date returns null
  assert.equal(formatKSTDateTime("invalid-date"), null);
  assert.equal(formatKSTDateTime(null), null);
});

test("build1372Draft includes all required fields and factual Korean text", () => {
  const draft = build1372Draft({
    serviceName: "넷플릭스",
    amount: 17000,
    cancelledAt: "2026-10-01T03:00:00.000Z", // 12:00 KST
    chargedAt: "2026-10-15T01:30:00.000Z",   // 10:30 KST
    paymentMethod: "신한카드 1234",
    proof: {
      imageDataUrl: "data:image/jpeg;base64,sampleImage",
      cancelledAt: "2026-10-01T03:00:00.000Z",
    },
  });

  assert.ok(draft.title.includes("넷플릭스"));
  assert.ok(draft.title.includes("소비자상담"));
  assert.ok(draft.body.includes("17,000원"));
  assert.ok(draft.body.includes("넷플릭스"));
  assert.ok(draft.body.includes("신한카드 1234"));
  assert.ok(draft.body.includes("2026년 10월 1일 12:00"));
  assert.ok(draft.body.includes("2026년 10월 15일 10:30"));
  assert.ok(draft.body.includes("해지 완료 화면 캡처 보유"));
  assert.ok(draft.body.includes("소비자기본법"));
  assert.ok(draft.body.includes("전자상거래법"));
  assert.equal(draft.submitUrl, "https://www.ccn.go.kr");
  assert.ok(draft.tips.length > 0);
});

test("build1372Draft handles missing fields with bracketed placeholders", () => {
  const draft = build1372Draft({});
  assert.ok(draft.body.includes("[서비스명]"));
  assert.ok(draft.body.includes("[결제 금액]"));
  assert.ok(draft.body.includes("[결제 일시]"));
  assert.ok(draft.body.includes("[해지 일시]"));
  assert.ok(draft.body.includes("[결제수단]"));
  assert.ok(draft.body.includes("해지 완료 시각 기록 보유")); // when no proof imageDataUrl
});

test("buildFtcReportDraft includes dark pattern citation, proof status, and verified FTC URL", () => {
  const draft = buildFtcReportDraft({
    serviceName: "어도비",
    amount: 35200,
    cancelledAt: "2026-09-20T00:00:00.000Z",
    chargedAt: "2026-10-10T00:00:00.000Z",
    paymentMethod: "현대카드 5678",
    proof: {
      imageDataUrl: "data:image/jpeg;base64,proofData",
    },
    darkPatternNotes: "해지 버튼을 4단계에 걸쳐 숨기고 유지 혜택 팝업을 강제 표시함",
  });

  assert.ok(draft.title.includes("불공정거래 신고"));
  assert.ok(draft.title.includes("어도비"));
  assert.ok(draft.body.includes("35,200원"));
  assert.ok(draft.body.includes("현대카드 5678"));
  assert.ok(draft.body.includes("해지 완료 화면 캡처 파일 보유"));
  assert.ok(draft.body.includes("다크패턴"));
  assert.ok(draft.body.includes("2025년 2월 시행"));
  assert.ok(draft.body.includes("해지 버튼을 4단계에 걸쳐 숨기고"));
  assert.equal(draft.submitUrl, SUBMIT_URLS.ftcReport);
  assert.ok(draft.tips.some((tip) => tip.includes("1372")));
});

test("SUBMIT_URLS are verified official websites", () => {
  assert.equal(SUBMIT_URLS.ccn1372, "https://www.ccn.go.kr");
  assert.ok(SUBMIT_URLS.ftcReport.startsWith("https://www.ftc.go.kr"));
});

test("ComplaintDrafts uses formatKSTDateTime instead of toLocaleDateString for cancelledAt", () => {
  const cancelledAt = "2026-10-16T00:00:00.000Z";
  const formatted = formatKSTDateTime(cancelledAt);
  assert.equal(formatted, "2026년 10월 16일 09:00");
  assert.doesNotMatch(formatted, /\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\./);
});
