import test from "node:test";
import assert from "node:assert/strict";
import { OFFICIAL_BENEFIT_SOURCES } from "../scripts/crawler/officialBenefitSources.js";
import { discoverOfficialBenefits } from "../scripts/crawler/promotionDiscovery.js";
import { trustedCandidates, extractCandidate } from "../scripts/benefit-v2/pipeline.js";
import { canonicalizeOffer } from "../scripts/benefit-v2/canonicalizer.js";
import { evaluatePublishGate } from "../scripts/benefit-v2/publishGate.js";

const skt = OFFICIAL_BENEFIT_SOURCES.find((source) =>
  source.id === "skt-subscriptions");
const seed = skt.seedPages.find((entry) => entry.variantId === "skt-netflix-best89");
const source = { ...skt, seedPages: [seed] };
const now = Date.parse("2026-09-29T09:00:00+09:00");
const services = [{ id: "netflix", name: "Netflix", plan: "광고형 스탠다드" }];
const registry = [{ domain: "tworld.co.kr", type: "OFFICIAL_PARTNER",
  name: "SKT" }];
const pageText = "베스트 89(넷플릭스) 2027년 6월 30일 " +
  "T 우주 ‘Netflix’ 가입 시 혜택 적용 넷플릭스 광고형 스탠다드를 월 3,500원부터 이용 가능. " +
  "이 혜택 적용 후 고객님께 청구되는 이용요금은 T 우주 구독 상품의 구독 요금이며, " +
  "고객님이 선택한 결제 방법 및 결제 주기에 따라 휴대폰 요금과 별도로 청구됩니다.";

function response(url, html) {
  return { ok: true, status: 200, url,
    headers: { get: (name) => name === "content-type" ? "text/html" : null },
    text: async () => html };
}

async function candidate(text) {
  const discovery = await discoverOfficialBenefits({ sources: [source], services, now,
    fetchImpl: async (url) => response(url,
      url === seed.url ? `<html><title>베스트 89(넷플릭스)</title><body>${text}</body></html>`
        : "<html><body></body></html>"),
  });
  return { discovery, value: trustedCandidates(discovery, [source], now)
    .find((item) => item.variantId === seed.variantId) };
}

test("Best 89 source proves the discounted T universe charge is already the offer price",
  async () => {
    assert.equal(seed.url, "https://m.tworld.co.kr/product/callplan?prod_id=NA00009793");
    assert.equal(seed.requiredMembershipCost, 0);
    assert.ok(seed.requiredEvidenceTerms.every((term) => pageText.includes(term)));
    const found = await candidate(pageText);
    assert.deepEqual(found.discovery.failures, []);
    assert.ok(found.value);
    assert.equal(found.value.trustedConstraints.requiredMembership,
      "T 우주 ‘Netflix’ 가입");
    assert.equal(found.value.trustedConstraints.incrementalPartnerCost, 0);
    const selected = await extractCandidate({
      candidate: found.value, services, authorityRegistry: registry,
      env: {}, now, store: null,
      snapshotFetcher: async (url) => url === seed.url ? {
        ok: true, url, finalUrl: url, observedAt: new Date(now).toISOString(),
        title: "베스트 89(넷플릭스)", text: pageText,
        html: `<html><body>${pageText}</body></html>`,
        actionCandidates: [], jsonLd: [],
      } : {
        ok: true, url, finalUrl: url, observedAt: new Date(now).toISOString(),
        title: "SKT 요금제 신청", text: "요금제 신청하기",
        html: "<html><body>요금제 신청하기</body></html>",
        actionCandidates: [], jsonLd: [],
        actionability: "VERIFIED_ACTION",
        pageType: "ACTION_ENTRYPOINT",
      },
    });
    assert.ok(selected.processed);
    const offer = canonicalizeOffer({ offerId: "skt-best89", category: "PARTNERSHIP_SAVING",
      serviceId: "netflix", observations: selected.processed.observations, now });
    assert.equal(offer.canonical.offer_price, 3500);
    assert.equal(offer.canonical.incremental_partner_cost, 0);
    assert.equal(offer.canonical.required_membership, "T 우주 ‘Netflix’ 가입");
    assert.deepEqual(evaluatePublishGate(offer, { now }).failures, []);
  });

test("Best 89 does not reuse a stale included-cost proof when billing text disappears",
  async () => {
    const found = await candidate(pageText.replace(
      "이 혜택 적용 후 고객님께 청구되는 이용요금은 T 우주 구독 상품의 구독 요금",
      "청구 구조 미확인"));
    assert.equal(found.value, undefined);
    assert.ok(found.discovery.failures.some((failure) =>
      failure.variantId === seed.variantId &&
      failure.reason === "SEED_EVIDENCE_MISSING"));
  });
