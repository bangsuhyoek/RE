import test from "node:test";
import assert from "node:assert/strict";
import { parseTerms, parseClaim, matchClaim, extractDeadline, extractMonthlyPrices } from "../scripts/crawler/promotions/offerExtractor.js";
import { getPromotionSource } from "../scripts/crawler/promotions/sources.js";
import { classifyPage, PageState } from "../scripts/crawler/promotions/pageFetcher.js";
import { verifyPromotion, applyResult, Verdict } from "../scripts/crawler/runPromotionPipeline.js";

const NOW = Date.parse("2026-09-29T00:00:00+09:00");
const LONG_FILLER = "\n" + "안내 문구 ".repeat(200);

function fakeLoader(pages) {
  return async (url) => {
    const text = pages[url];
    if (text === undefined) return { requestedUrl: url, finalUrl: url, status: 404, text: "", state: PageState.NOT_FOUND };
    return { requestedUrl: url, finalUrl: url, status: 200, text, state: classifyPage({ requestedUrl: url, finalUrl: url, status: 200, text }) };
  };
}

test("parseTerms는 기간·금액·할인율을 뽑고 무료반품 같은 비혜택 '무료'는 제외한다", () => {
  const t = parseTerms("₩0에 1개월 동안 이용, 이후 ₩11,990/월, 연간 40% 할인");
  assert.deepEqual(t.durations.map((d) => d.days), [30]);
  assert.ok(t.prices.includes(0) && t.prices.includes(11990));
  assert.deepEqual(t.percents, [40]);
  assert.equal(t.free, true);

  assert.equal(parseTerms("로켓배송 상품 30일 무료반품").free, false);
  assert.equal(parseTerms("$0.50/week for your first year").durations[0].unit, "year");
});

test("parseClaim은 카탈로그 문구를 판정 방식으로 분류한다", () => {
  assert.equal(parseClaim({ kind: "3개월 0원 무료 체험" }).type, "free");
  assert.equal(parseClaim({ kind: "연간 이용권 16% 할인" }).type, "percent");
  assert.equal(parseClaim({ kind: "첫 달 100% 페이백" }).type, "payback");
  assert.equal(parseClaim({ kind: "스페셜 혜택" }).type, "manual");
  assert.equal(parseClaim({ kind: "아무 문구" }, { patterns: ["패밀리"] }).type, "pattern");
});

test("matchClaim: 같은 조건이면 확인, 기간이 바뀌었으면 변경 후보로 돌려준다", () => {
  const page = "제한 없이 감상하세요.\n₩0에 1개월 동안 Premium 개인 요금제를 이용해 보세요.\n이후에는 ₩11,990/월이 부과됩니다.";
  const threeMonths = matchClaim(parseClaim({ kind: "3개월 0원 무료 체험" }), page);
  assert.equal(threeMonths.confirmed, false);
  assert.ok(threeMonths.variants.some((v) => v.includes("1개월")));

  const oneMonth = matchClaim(parseClaim({ kind: "1개월 무료 체험" }), page);
  assert.equal(oneMonth.confirmed, true);
  assert.match(oneMonth.evidence, /1개월/);
});

test("matchClaim: '30일 무료반품'을 30일 무료 체험 근거로 쓰지 않는다", () => {
  const result = matchClaim(parseClaim({ kind: "와우 멤버십 30일 무료" }), "로켓배송 상품 30일 무료반품\n쿠팡캐시 적립");
  assert.equal(result.confirmed, false);
});

test("extractDeadline은 '9월 30일에 종료' 같은 마감 표기를 날짜로 바꾼다", () => {
  assert.equal(extractDeadline("혜택은 9월 30일에 종료됩니다", { now: NOW }), "2026-09-30");
  assert.equal(extractDeadline("상시 진행", { now: NOW }), null);
});

test("classifyPage는 404·로그인 이동·봇 차단·빈 페이지를 구분한다", () => {
  const url = "https://example.com/premium";
  assert.equal(classifyPage({ requestedUrl: url, finalUrl: url, status: 404, text: "" }), PageState.NOT_FOUND);
  assert.equal(classifyPage({ requestedUrl: url, finalUrl: "https://example.com/login?next=1", status: 200, text: "로그인" + LONG_FILLER }), PageState.LOGIN_REQUIRED);
  assert.equal(classifyPage({ requestedUrl: url, finalUrl: url, status: 403, text: "Just a moment..." }), PageState.BLOCKED);
  assert.equal(classifyPage({ requestedUrl: url, finalUrl: url, status: 200, text: "" }), PageState.EMPTY);
  assert.equal(classifyPage({ requestedUrl: url, finalUrl: url, status: 200, text: "1개월 무료 체험" + LONG_FILLER }), PageState.OK);
});

const spotifyPage = "₩0에 1개월 동안 Premium 개인 요금제를 이용해 보세요.\n이후에는 ₩11,990/월이 부과됩니다." + LONG_FILLER;

test("verifyPromotion: 페이지 조건이 카탈로그와 다르면 CHANGED와 페이지 문구를 돌려준다", async () => {
  const promotion = { id: "test-spotify", kind: "3개월 0원 무료 체험", link: "https://www.spotify.com/kr-ko/premium/", originalPrice: 11990, campaignPeriod: "상시 진행" };
  const result = await verifyPromotion(promotion, { loadPage: fakeLoader({ [promotion.link]: spotifyPage }), now: NOW });
  assert.equal(result.verdict, Verdict.CHANGED);
  assert.match(result.pageSays.text[0], /1개월/);
});

test("verifyPromotion: 조건이 같으면 CONFIRMED와 근거 문장을 남긴다", async () => {
  const promotion = { id: "test-yt", kind: "1개월 무료 체험", link: "https://www.spotify.com/kr-ko/premium/", originalPrice: 11990, campaignPeriod: "상시 진행" };
  const result = await verifyPromotion(promotion, { loadPage: fakeLoader({ [promotion.link]: spotifyPage }), now: NOW });
  assert.equal(result.verdict, Verdict.CONFIRMED);
  assert.match(result.evidence.text, /1개월/);
  assert.deepEqual(result.warnings, []);
});

test("verifyPromotion: 캠페인 기간이 지나면 페이지와 무관하게 EXPIRED", async () => {
  const promotion = { id: "test-expired", kind: "1개월 무료 체험", link: "https://www.spotify.com/kr-ko/premium/", campaignPeriod: "2026.08.15 ~ 2026.09.23" };
  const result = await verifyPromotion(promotion, { loadPage: fakeLoader({ [promotion.link]: spotifyPage }), now: NOW });
  assert.equal(result.verdict, Verdict.EXPIRED);
});

test("verifyPromotion: 읽을 수 있는 페이지가 없으면 UNREACHABLE, 앱 링크 404는 경고로 남긴다", async () => {
  const promotion = { id: "test-dead", kind: "1개월 무료 체험", link: "https://example.com/gone", campaignPeriod: "상시 진행" };
  const result = await verifyPromotion(promotion, { loadPage: fakeLoader({}), now: NOW });
  assert.equal(result.verdict, Verdict.UNREACHABLE);
  assert.ok(result.warnings.some((w) => w.includes("404")));
});

// ---------- Gemini 점검 후 회귀 테스트 ----------

test("최종 가격 근거는 혜택 맥락이 있어야 하고 '최소 결제가 100원' 같은 규정 문구는 제외한다", () => {
  const claim = parseClaim({ kind: "첫 달 100원 특가 프로모션", offerPrice: 100 });
  const footnote = "T플러스포인트사용은 최소 결제가 100원(vat 포함)을 제외한 금액의 최대 100%까지 적용 가능합니다." + LONG_FILLER;
  assert.equal(matchClaim(claim, footnote).confirmed, false);

  const annual = parseClaim({ kind: "연간 결제 16% 할인", offerPrice: 99000 });
  assert.equal(matchClaim(annual, "디즈니+ 연간 구독 특별 혜택: 스탠다드 연 ₩99,000").basis, "offerPrice");
});

test("무료 혜택은 무료 기간과 맞아야 하며 '1개월마다' 같은 결제 주기는 기간으로 보지 않는다", () => {
  const claim = parseClaim({ kind: "1개월 0원 무료 체험" });
  assert.equal(matchClaim(claim, "무료 체험 1주일. 이후 1개월마다 19,000원 결제").confirmed, false);
  assert.deepEqual(parseTerms("1개월 무료 체험, 1개월 후 자동으로 결제").durations.map((d) => d.days), [30]);
  assert.deepEqual(parseTerms("10주년 기념 이벤트").durations, []);
});

test("extractDeadline은 자주 쓰는 마감 표기를 모두 읽는다", () => {
  assert.equal(extractDeadline("25% 할인 | 2026. 9. 30.에 프로모션 종료", { now: NOW }), "2026-09-30");
  assert.equal(extractDeadline("2026년 9월 30일 23:59까지", { now: NOW }), "2026-09-30");
  assert.equal(extractDeadline("기간 2026.09.01 ~ 2026.09.30", { now: NOW }), "2026-09-30");
  assert.equal(extractDeadline("상시 진행", { now: NOW }), null);
});

test("verifyPromotion: 근거 문장의 마감일이 지났으면 EXPIRED", async () => {
  const promotion = { id: "test-deadline", kind: "1년 정기결제 25% 할인", link: "https://example.com/ps", campaignPeriod: "상시 진행" };
  const page = "PlayStation Plus\n25% 할인 | 2026. 9. 28.에 프로모션 종료" + LONG_FILLER;
  const result = await verifyPromotion(promotion, { loadPage: fakeLoader({ [promotion.link]: page }), now: NOW });
  assert.equal(result.verdict, Verdict.EXPIRED);
  const live = await verifyPromotion(promotion, { loadPage: fakeLoader({ [promotion.link]: page.replace("9. 28.", "9. 30.") }), now: NOW });
  assert.equal(live.verdict, Verdict.CONFIRMED);
});

test("extractMonthlyPrices는 줄바꿈 뒤 용량 숫자를 월 요금으로 오인하지 않는다", () => {
  assert.deepEqual(extractMonthlyPrices("₩7,500/월\n400GB 스토리지\n월 9,900원"), [7500, 9900]);
});

test("쿠팡플레이: '와우회원이 아니어도 무료'는 와우 연동 혜택의 근거가 아니다", () => {
  const claim = parseClaim({ kind: "쿠팡 와우 회원 연동 100% 무료" }, getPromotionSource("coupangplay-promo").claim);
  assert.equal(matchClaim(claim, "이제 와우회원이 아니어도 쿠팡플레이 무료 시청").confirmed, false);
  assert.equal(matchClaim(claim, "쿠팡 회원이라면 누구나 광고와 함께 무료로 이용할 수 있습니다.\n일부 콘텐츠는 와우 멤버십 가입 후 시청").confirmed, false);
  assert.equal(matchClaim(claim, "와우회원은 추가 비용 없이 쿠팡플레이 시청").confirmed, true);
});

test("Figma/Notion: 교육용 무료 문구만으로는 특정 유료 요금제 무료를 확인하지 않는다", () => {
  const figma = parseClaim({ kind: "교육자·학생 Professional 100% 무료" }, getPromotionSource("figma-edu-free").claim);
  assert.equal(matchClaim(figma, "교실에서 사용할 수 있는 최고의 무료 도구로 학생들을 지원하세요").confirmed, false);
  assert.equal(
    matchClaim(figma, "에듀케이션 팀에서 모든 프로페셔널 요금제의 유료 도구에 액세스 하세요.\nFigma와 Google은 학생에게 Chromebook에서 무료로 제공합니다").confirmed,
    false
  );
  assert.equal(matchClaim(figma, "학생과 교육자는 Professional 요금제를 무료로 이용할 수 있습니다").confirmed, true);
  const notion = parseClaim({ kind: "학생·교육자 Plus 플랜 100% 무료" }, getPromotionSource("notion-student-free").claim);
  assert.equal(matchClaim(notion, "Run your student org, for free").confirmed, false);
  assert.equal(matchClaim(notion, "Students get the Plus plan for free with a school email").confirmed, true);
});

test("JetBrains: 카탈로그의 IDE 16종은 페이지의 '10 JetBrains IDEs'로 확인되지 않는다", () => {
  const claim = parseClaim({ kind: "학생·교사 IDE 16종 전 제품 100% 무료" }, getPromotionSource("jetbrains-all-promo").claim);
  assert.equal(matchClaim(claim, "For students: 10 JetBrains IDEs – the full versions, free for students.").confirmed, false);
  assert.equal(matchClaim(claim, "Students get 16 JetBrains IDEs for free").confirmed, true);
});

test("applyResult: 확인·만료만 상태로 남기고, 불확실한 판정은 이전 확인 표시를 지운다", () => {
  const at = "2026-09-29T00:00:00.000Z";
  const stale = { id: "x", verifiedStatus: "LIVE_CONFIRMED", lastVerifiedAt: "2026-01-01T00:00:00.000Z" };
  assert.deepEqual(applyResult(stale, { verdict: Verdict.CONFIRMED }, at), { id: "x", verifiedStatus: "LIVE_CONFIRMED", lastVerifiedAt: at, lastCheckedAt: at });
  assert.equal(applyResult(stale, { verdict: Verdict.EXPIRED }, at).verifiedStatus, "EXPIRED");
  for (const verdict of [Verdict.CHANGED, Verdict.NOT_FOUND, Verdict.UNREACHABLE, Verdict.MANUAL]) {
    const next = applyResult(stale, { verdict }, at);
    assert.equal("verifiedStatus" in next, false, verdict);
    assert.equal(next.lastCheckedAt, at);
  }
  assert.equal(applyResult(stale, undefined, at), stale);
});
