import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildPromotionCandidates,
  buildPromotionFilters,
  computeMonthlySaving,
  formatDisplayText,
  formatVerifiedDate,
  getEligibilityNote,
  pickTopPromotion,
  resolveFilter,
  splitPromotionSections,
} from "../src/lib/promotionFilters.js";
import { promotionCatalog, serviceCatalog } from "../src/data/subscriptionData.js";

// 대상 제한 혜택의 판정은 라이브 노출 여부와 무관하므로 마스터 카탈로그를 기준으로 검증한다.
const masterCatalog = JSON.parse(fs.readFileSync(new URL("../public/catalog/promotions-master.json", import.meta.url), "utf8"));

const NOW = Date.parse("2026-10-29T00:00:00+09:00");

function makeCandidates({ subscribedServiceIds = [], subscribedCategories = [], personalized = true, promotions = promotionCatalog } = {}) {
  return buildPromotionCandidates(promotions, {
    personalized,
    serviceCatalog,
    subscribedServiceIds: new Set(subscribedServiceIds),
    subscribedCategories: new Set(subscribedCategories),
    now: NOW,
  });
}

const ids = (list) => list.map((p) => p.id);
const applyFilter = (candidates, filter) => candidates.filter((p) => resolveFilter(p, filter));

const spotifyUser = makeCandidates({ subscribedServiceIds: ["spotify", "netflix"], subscribedCategories: ["음악", "OTT"] });

test("필터 칩은 전체 / 구독 중 서비스 / 결합 할인 / 무료 체험이고, 구독이 없으면 '구독 중 서비스'를 숨긴다", () => {
  assert.deepEqual(buildPromotionFilters({ personalized: true }).map((f) => f.label), ["전체", "구독 중 서비스", "결합 할인", "무료 체험"]);
  assert.deepEqual(buildPromotionFilters({ personalized: false }).map((f) => f.label), ["전체", "결합 할인", "무료 체험"]);
});

test("'전체'는 만료되지 않은 모든 혜택, '구독 중 서비스'는 내 구독과 직접 연결된 혜택만", () => {
  assert.equal(applyFilter(makeCandidates({ personalized: false }), "all").length, promotionCatalog.length);
  assert.equal(applyFilter(spotifyUser, "all").length, spotifyUser.length);
  const subscribed = applyFilter(spotifyUser, "subscribed");
  assert.ok(subscribed.length > 0);
  assert.ok(subscribed.every((p) => p.isDirectMatch));
  assert.ok(ids(subscribed).includes("naver-spotify-link"));
  assert.ok(!ids(subscribed).includes("nintendo-7d-free"));
});

test("'결합 할인'은 묶음·멤버십 연동 혜택, '무료 체험'은 처음 0원으로 써 보는 혜택", () => {
  const bundle = ids(applyFilter(spotifyUser, "bundle"));
  assert.ok(bundle.includes("disney-bundle-37"));
  assert.ok(bundle.includes("naverplus-netflix"));
  assert.ok(!bundle.includes("youtube-lite-43"));

  const trial = ids(applyFilter(makeCandidates({ personalized: false }), "trial"));
  assert.ok(trial.includes("nintendo-7d-free"));
  assert.ok(trial.includes("spotify-promo"));
  assert.ok(!trial.includes("naverplus-netflix"), "멤버십 연동은 체험이 아니다");
  assert.ok(!trial.includes("notion-student-free"), "학생 무료는 체험이 아니다");
});

test("매달 아끼는 금액: 필요한 멤버십을 아직 안 쓰면 그 요금(카탈로그 월 요금)을 뺀다", () => {
  const promo = promotionCatalog.find((p) => p.id === "naver-spotify-link");
  const naverplus = serviceCatalog.find((s) => s.id === "naverplus");
  const membershipPrice = naverplus.plans[0].amount;

  const notMember = computeMonthlySaving(promo, { serviceCatalog, subscribedServiceIds: new Set(["spotify"]) });
  assert.equal(notMember.amount, promo.saving - membershipPrice);
  assert.deepEqual(notMember.memberships.map((m) => m.id), ["naverplus"]);

  const member = computeMonthlySaving(promo, { serviceCatalog, subscribedServiceIds: new Set(["spotify", "naverplus"]) });
  assert.equal(member.amount, promo.saving);
  assert.equal(member.memberships.length, 0);
});

test("체험·첫 달·연간 결제 혜택은 매달 아끼는 금액을 만들지 않는다", () => {
  for (const id of ["nintendo-7d-free", "spotify-promo", "naverplus-promo", "disney-annual-16", "ps-plus-promo", "the-joongang-plus-promo"]) {
    const promo = promotionCatalog.find((p) => p.id === id);
    assert.equal(computeMonthlySaving(promo, { serviceCatalog }), null, id);
  }
  // 멤버십 요금을 알 수 없으면 금액을 정하지 않는다
  const unknownMembership = { id: "x", saving: 5000, sourceServiceIds: ["spotify", "mystery"] };
  const catalogWithMystery = [...serviceCatalog, { id: "mystery", name: "미스터리 멤버십" }];
  assert.equal(computeMonthlySaving(unknownMembership, { serviceCatalog: catalogWithMystery }), null);
});

test("가장 많이 아낄 수 있는 혜택은 내 구독과 직접 연결된 것 중 매달 금액이 가장 큰 것", () => {
  const top = pickTopPromotion(spotifyUser);
  const direct = spotifyUser.filter((p) => p.isDirectMatch && p.monthlySaving);
  assert.ok(top.isDirectMatch);
  assert.equal(top.monthlySaving.amount, Math.max(...direct.map((p) => p.monthlySaving.amount)));

  const member = makeCandidates({ subscribedServiceIds: ["spotify", "naverplus"], subscribedCategories: ["음악"] });
  assert.equal(pickTopPromotion(member).id, "naver-spotify-link");

  assert.equal(pickTopPromotion(makeCandidates({ promotions: [promotionCatalog.find((p) => p.id === "spotify-promo")] })), null);
});

test("목록은 '구독 중인 서비스 혜택'과 '새로 시작하면 좋은 혜택'으로 나뉘고, 만료된 혜택은 빠진다", () => {
  const { subscribed, discover } = splitPromotionSections(spotifyUser);
  assert.ok(subscribed.every((p) => p.isDirectMatch));
  assert.ok(discover.every((p) => !p.isDirectMatch));
  assert.equal(subscribed.length + discover.length, spotifyUser.length);

  const expired = makeCandidates({
    promotions: [
      { id: "old", deadline: "2026-01-01", saving: 1000 },
      { id: "dead", verifiedStatus: "EXPIRED", saving: 1000 },
      { id: "live", saving: 1000 },
    ],
  });
  assert.deepEqual(ids(expired), ["live"]);
});

test("확인 날짜는 한국 시간 'M월 D일'로 표기한다", () => {
  assert.equal(formatDisplayText("개인 요금제 1개월 ₩0 무료 · 1년에 ₩61,600 절약"), "개인 요금제 1개월 0원 무료 · 1년에 61,600원 절약");
  assert.equal(formatVerifiedDate("2026-10-18T16:28:31.740Z"), "10월 19일");
  assert.equal(formatVerifiedDate("2026-10-18T01:00:00.000Z"), "10월 18일");
  assert.equal(formatVerifiedDate(null), null);
  assert.equal(formatVerifiedDate("not-a-date"), null);
});

test("학생·교사·신규 가입자처럼 대상이 정해진 혜택은 맨 위 추천에서 빠지고, 목록에는 조건과 함께 남는다", () => {
  const adobeUser = makeCandidates({ subscribedServiceIds: ["adobe"], subscribedCategories: ["SaaS"], promotions: masterCatalog });
  const student = adobeUser.find((p) => p.id === "adobe-student-66");
  assert.ok(student, "목록에는 남는다");
  assert.equal(student.eligibilityNote, "학생·교사 대상");
  assert.equal(getEligibilityNote(masterCatalog.find((p) => p.id === "adobe-new-user-25")), "신규 가입자 대상");

  const top = pickTopPromotion(adobeUser);
  assert.ok(!top || !top.eligibilityNote, "대상이 정해진 혜택은 추천하지 않는다");
  assert.notEqual(top?.id, "adobe-student-66");

  // 대상 제한 혜택만 있으면 추천 카드가 없다
  const onlyRestricted = makeCandidates({ promotions: masterCatalog.filter((p) => ["adobe-student-66", "ms365-promo"].includes(p.id)) });
  assert.equal(pickTopPromotion(onlyRestricted), null);
  assert.equal(getEligibilityNote(masterCatalog.find((p) => p.id === "youtube-lite-43")), null);
});

test("이미 구독 중인 서비스의 신규 가입 체험은 보여주지 않고, 구독하지 않은 서비스의 체험은 '새로 시작하면 좋은 혜택'에 남는다", () => {
  const user = makeCandidates({ subscribedServiceIds: ["spotify"], subscribedCategories: ["음악"] });
  const { subscribed, discover } = splitPromotionSections(user);
  assert.ok(!ids(user).includes("spotify-promo"), "스포티파이 구독자에게 스포티파이 1개월 무료 체험은 없다");
  assert.ok(!ids(subscribed).some((id) => ["spotify-promo"].includes(id)));
  assert.ok(ids(subscribed).includes("naver-spotify-link"), "반복 혜택은 구독 중 목록에 남는다");
  assert.ok(ids(discover).includes("applemusic-promo"), "구독하지 않은 서비스의 체험은 새로 시작 목록에 있다");
  assert.ok(subscribed.every((p) => !(p.sourceServiceIds?.[0] === "spotify" && /체험/.test(p.kind))));

  const guest = makeCandidates({ personalized: false });
  assert.ok(ids(guest).includes("spotify-promo"), "구독이 없으면 체험이 그대로 보인다");
});


