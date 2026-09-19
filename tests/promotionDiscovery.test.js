import test from "node:test";
import assert from "node:assert/strict";
import {
  discoverPromotionCandidatesFromHtml,
  rediscoverCampaign,
} from "../scripts/crawler/promotionDiscovery.js";
import {
  validatePromotion,
} from "../scripts/crawler/promotionValidator.js";

const source = {
  id: "official-partner",
  partnerType: "MEMBERSHIP",
  partnerId: "official-membership",
  partnerName: "공식 멤버십",
  listUrl: "https://partner.example/events",
  allowedOrigins: ["https://partner.example"],
};

const services = [
  {
    id: "netflix",
    name: "Netflix",
    aliases: ["넷플릭스"],
  },
];

function htmlResponse(html) {
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
test("Case H: 공식 목록의 신규 이벤트를 발견하고 검증 후 ACTIVE가 된다", async () => {
  const candidates = discoverPromotionCandidatesFromHtml({
    source,
    services,
    now: Date.parse("2026-09-20T00:00:00+09:00"),
    html: `
      <main>
        <a href="/events/netflix-september">
          Netflix 기존 고객 할인 이벤트
        </a>
      </main>
    `,
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].audience, "BOTH");
  assert.deepEqual(candidates[0].targetServiceIds, ["netflix"]);

  const result = await validatePromotion(candidates[0], {
    now: "2026-09-20T00:00:00+09:00",
    fetchImpl: async () => htmlResponse(`
      <html>
        <head>
          <title>Netflix 할인 이벤트</title>
          <meta name="description"
            content="Netflix 할인 이벤트 2026.09.01 ~ 2026.09.30" />
        </head>
        <body>Netflix 공식 제휴 할인 이벤트</body>
      </html>
    `),
  });

  assert.equal(result.status, "ACTIVE");
  assert.equal(result.reason, "VERIFIED");
});
test("Case I: 이벤트 종료일이 지나면 EXPIRED가 된다", async () => {
  const promotion = {
    id: "expired-event",
    url: "https://partner.example/events/old",
    allowedOrigins: ["https://partner.example"],
    serviceName: "Netflix",
    brandTokens: ["Netflix"],
    campaignTokens: ["Netflix", "할인"],
    periodText: "2026.09.01 ~ 2026.09.10",
  };

  let fetched = false;
  const result = await validatePromotion(promotion, {
    now: "2026-09-20T00:00:00+09:00",
    fetchImpl: async () => {
      fetched = true;
      return htmlResponse("<html></html>");
    },
  });

  assert.equal(result.status, "EXPIRED");
  assert.equal(result.reason, "DEADLINE_PASSED");
  assert.equal(fetched, false);
});

test("Case J: URL이 바뀌어도 동일 제휴 캠페인을 재식별한다", () => {
  const previous = {
    id: "stable-event-id",
    partnerId: "official-membership",
    targetServiceIds: ["netflix"],
    title: "Netflix 9월 제휴 할인",
    sourceUrl: "https://partner.example/events/old-url",
  };
  const candidates = [
    {
      id: "new-generated-id",
      partnerId: "official-membership",
      targetServiceIds: ["netflix"],
      title: "Netflix 9월 제휴 할인 이벤트",
      sourceUrl: "https://partner.example/events/new-url",
    },
    {
      id: "unrelated",
      partnerId: "official-membership",
      targetServiceIds: ["netflix"],
      title: "Netflix 겨울 무료 쿠폰",
      sourceUrl: "https://partner.example/events/other",
    },
  ];

  const rediscovered = rediscoverCampaign(previous, candidates);
  assert.equal(
    rediscovered?.sourceUrl,
    "https://partner.example/events/new-url"
  );
});
