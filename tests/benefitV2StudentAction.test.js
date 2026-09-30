import test from "node:test";
import assert from "node:assert/strict";
import { OFFICIAL_BENEFIT_SOURCES } from "../scripts/crawler/officialBenefitSources.js";
import { classifyPage, discoverActionCandidates,
  probeFirstHttpsRedirect } from "../scripts/benefit-v2/sourceFetcher.js";
import { canonicalizeOffer } from "../scripts/benefit-v2/canonicalizer.js";
import { evaluatePublishGate } from "../scripts/benefit-v2/publishGate.js";
import { extractCandidate, isVerifiedAuthBoundaryFailure,
  isVerifiedAuthBoundarySuccess,
  isVerifiedAuthBoundaryFirstHop } from "../scripts/benefit-v2/pipeline.js";

const student = OFFICIAL_BENEFIT_SOURCES.find((source) =>
  source.id === "spotify-official-trials").seedPages.find((seed) =>
  seed.variantId === "spotify-student-1m-trial");
const now = Date.parse("2026-09-29T09:00:00+09:00");
const studentText = "학생은 1개월 동안 무료로 Premium 서비스를 이용할 수 있습니다. " +
  "이후 매월 6,000원이 부과됩니다(부가세 별도). 매월 ₩6,600이 청구됩니다. " +
  "승인된 대학 교육 기관에 등록된 학생에게만 제공됩니다. 이미 Premium을 체험해본 사용자는 제외됩니다.";

function primary(withCta = true) {
  const html = `<html><body><header><nav><a href="/kr-ko/signup/">가입하기</a></nav></header>` +
    `<main><header>${studentText}${withCta ?
      `<a href="/kr-ko/student/verification/" aria-label="Premium 학생 요금제를 이용하세요">Premium 가입</a>` :
      ""}</header></main><footer><a href="/kr-ko/signup/">가입하기</a></footer></body></html>`;
  const base = { ok: true, url: student.url, finalUrl: student.url,
    title: "Premium 학생 요금제 - Spotify (KR)", text: studentText, html,
    actionCandidates: discoverActionCandidates(html, student.url),
    observedAt: new Date(now).toISOString(), jsonLd: [] };
  return { ...base, ...classifyPage(base) };
}

test("a product hero header is inspected while global navigation stays excluded", () => {
  const actions = primary(true).actionCandidates;
  assert.equal(actions.length, 1);
  assert.equal(actions[0].url, student.preferredPlanActionUrl);
  assert.match(actions[0].label, /Premium 가입/);
  assert.equal(primary(false).actionCandidates.length, 0);
});

function candidate() {
  return { url: student.url, variantId: student.variantId, serviceIds: ["spotify"],
    trustedConstraints: {
      trustedEvidenceVerified: true, targetServiceId: "spotify", partnerId: "spotify",
      targetPlan: "학생", trustedAudience: "NEW", categoryHint: "NEW_USER_FREE_TRIAL",
      trustedOfferBillingCycle: "MONTHLY", actionUrl: student.actionUrlHint,
      preferredPlanActionUrl: student.preferredPlanActionUrl,
      actionRequiresLogin: student.actionRequiresLoginHint,
    } };
}

test("Spotify student selects only the exact official verification CTA", async () => {
  assert.equal(student.preferredPlanActionUrl,
    "https://www.spotify.com/kr-ko/student/verification/");
  for (const withCta of [true, false]) {
    const selected = await extractCandidate({ candidate: candidate(),
      services: [{ id: "spotify", name: "Spotify", plan: "개인" }],
      authorityRegistry: [{ domain: "spotify.com", type: "OFFICIAL_SERVICE", name: "Spotify" }],
      env: {}, now, store: null,
      snapshotFetcher: async (url) => url === student.url ? primary(withCta) : {
        ok: false, url, httpStatus: 403,
        finalUrl: "https://accounts.spotify.com/login?continue=student",
        observedAt: new Date(now).toISOString(), reason: "HTTP_403",
      },
    });
    const observations = Object.fromEntries(selected.processed.observations
      .map((item) => [item.field, item.value]));
    if (withCta) {
      assert.equal(observations.action_url, student.preferredPlanActionUrl);
      assert.equal(observations.actionability_status, "VERIFIED_ENTRYPOINT");
      assert.equal(observations.requires_login, true);
    } else {
      assert.equal(observations.actionability_status, undefined);
      assert.equal(observations.action_url, student.actionUrlHint);
    }
  }
});

test("a failed fetch certifies only the observed official auth boundary", () => {
  const constraints = candidate().trustedConstraints;
  const observed = [{ field: "action_url", value: student.preferredPlanActionUrl,
    extractor: "DOM_RULE" }];
  const failure = { ok: false, httpStatus: 403,
    finalUrl: "https://accounts.spotify.com/login?continue=student" };
  const check = (page, source = observed) => isVerifiedAuthBoundaryFailure(
    student.preferredPlanActionUrl, page, constraints, "VERIFIED_ENTRYPOINT", source);
  assert.equal(check(failure), true);
  assert.equal(check({ ...failure, finalUrl: "https://attacker.example/login" }), false);
  assert.equal(check({ ...failure, finalUrl: student.preferredPlanActionUrl }), false);
  assert.equal(check({ ...failure, httpStatus: 500 }), false);
  assert.equal(check({ ...failure, finalUrl: undefined }), false);
  assert.equal(check(failure, []), false);
});

test("a successful official login redirect retains the observed source evidence", async () => {
  const constraints = candidate().trustedConstraints;
  const actionUrl = student.preferredPlanActionUrl;
  const redirected = { ok: true, url: actionUrl, httpStatus: 200,
    finalUrl: "https://accounts.spotify.com/login?continue=student",
    actionability: "UNKNOWN", actionCandidates: [],
    observedAt: new Date(now).toISOString() };
  const sourceObservation = [{ field: "action_url", value: actionUrl,
    extractor: "DOM_RULE" }];
  assert.equal(isVerifiedAuthBoundarySuccess(actionUrl, redirected, constraints,
    "VERIFIED_ENTRYPOINT", sourceObservation), true);
  assert.equal(isVerifiedAuthBoundarySuccess(actionUrl,
    { ...redirected, finalUrl: "https://attacker.example/login" }, constraints,
    "VERIFIED_ENTRYPOINT", sourceObservation), false);
  assert.equal(isVerifiedAuthBoundarySuccess(actionUrl, redirected, constraints,
    "VERIFIED_ENTRYPOINT", []), false);

  for (const withCta of [true, false]) {
    const selected = await extractCandidate({ candidate: candidate(),
      services: [{ id: "spotify", name: "Spotify", plan: "개인" }],
      authorityRegistry: [{ domain: "spotify.com", type: "OFFICIAL_SERVICE",
        serviceId: "spotify", name: "Spotify" }],
      env: {}, now, store: null,
      snapshotFetcher: async (url) => url === student.url ? primary(withCta) : redirected,
    });
    const status = selected.processed.observations.find((item) =>
      item.field === "actionability_status");
    const offer = canonicalizeOffer({ offerId: "test-student", category: "NEW_USER_FREE_TRIAL",
      serviceId: "spotify", observations: selected.processed.observations, now });
    const gate = evaluatePublishGate(offer, { now });
    if (withCta) {
      assert.equal(status?.value, "VERIFIED_ENTRYPOINT");
      assert.equal(status?.sourceUrl, student.url);
      assert.ok(status?.authorityScore >= 500);
      assert.equal(gate.failures.some((failure) =>
        failure.startsWith("actionability_status:") || failure === "ACTION_NOT_VERIFIED"), false);
    } else {
      assert.notEqual(status?.sourceUrl, student.url);
      assert.ok(gate.failures.some((failure) =>
        failure.startsWith("actionability_status:") || failure === "ACTION_NOT_VERIFIED"));
    }
  }
});

test("first-hop official redirect proves only the observed auth entrypoint", async () => {
  const actionUrl = student.preferredPlanActionUrl;
  const response = (location, status = 302) => ({
    status, url: actionUrl,
    headers: { get: (name) => name === "location" ? location : null },
  });
  const observe = (res) => probeFirstHttpsRedirect(actionUrl, {
    fetchImpl: async (_url, options) => {
      assert.equal(options.redirect, "manual");
      return res;
    },
    now,
  });
  const login = await observe(response(
    "https://accounts.spotify.com/login?continue=student"));
  assert.equal(login.ok, true);
  const exactLink = [{ field: "action_url", value: actionUrl,
    extractor: "DOM_RULE" }];
  assert.equal(isVerifiedAuthBoundaryFirstHop(actionUrl, login,
    candidate().trustedConstraints, "VERIFIED_ENTRYPOINT", exactLink), true);
  assert.equal(isVerifiedAuthBoundaryFirstHop(actionUrl, login,
    candidate().trustedConstraints, "VERIFIED_ENTRYPOINT", []), false);
  const other = await observe(response("https://attacker.example/login"));
  assert.equal(isVerifiedAuthBoundaryFirstHop(actionUrl, other,
    candidate().trustedConstraints, "VERIFIED_ENTRYPOINT", exactLink), false);
  const noRedirect = await observe(response(
    "https://accounts.spotify.com/login", 200));
  assert.equal(noRedirect.ok, false);

  let probes = 0;
  for (const withCta of [true, false]) {
    const selected = await extractCandidate({ candidate: candidate(),
      services: [{ id: "spotify", name: "Spotify", plan: "개인" }],
      authorityRegistry: [{ domain: "spotify.com", type: "OFFICIAL_SERVICE",
        serviceId: "spotify", name: "Spotify" }],
      env: {}, now, store: null,
      snapshotFetcher: async (url) => url === student.url ? primary(withCta) : {
        ok: false, url, reason: "FETCH_FAILED",
        observedAt: new Date(now).toISOString(),
      },
      firstRedirectProbe: async () => { probes++; return login; },
    });
    const offer = canonicalizeOffer({ offerId: "test-student", category: "NEW_USER_FREE_TRIAL",
      serviceId: "spotify", observations: selected.processed.observations, now });
    const gate = evaluatePublishGate(offer, { now });
    assert.equal(gate.failures.some((failure) =>
      failure.startsWith("actionability_status:")), !withCta);
    assert.equal(Boolean(selected.authRedirectProbe?.verified), withCta);
  }
  assert.equal(probes, 1);
});
