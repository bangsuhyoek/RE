import test from "node:test";
import assert from "node:assert/strict";
import { getCancelGuide, getCommonCancelSteps, verifiedCancelGuideIds } from "../src/data/cancelGuides.js";
import { serviceCatalog } from "../src/data/subscriptionData.js";

const catalogIds = new Set(serviceCatalog.map((service) => service.id));

test("공식 확인 가이드는 카탈로그에 있는 서비스만 가리킨다", () => {
  for (const id of verifiedCancelGuideIds) {
    assert.ok(catalogIds.has(id), `카탈로그에 없는 가이드 id: ${id}`);
  }
});

test("공식 확인 가이드는 출처, 확인일, 번호가 이어지는 단계를 갖는다", () => {
  for (const id of verifiedCancelGuideIds) {
    const service = serviceCatalog.find((item) => item.id === id);
    const guide = getCancelGuide(id, { name: service.name, cancelUrl: service.cancelUrl });
    assert.equal(guide.verified, true, id);
    assert.ok(guide.sources.length > 0, `${id}: 출처 없음`);
    guide.sources.forEach((source) => assert.match(source, /^https:\/\//, `${id}: ${source}`));
    assert.match(guide.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(guide.steps.length >= 2, `${id}: 단계가 너무 적음`);
    guide.steps.forEach((step, index) => {
      assert.equal(step.stepNumber, index + 1, id);
      assert.ok(step.title && step.description, id);
    });
    guide.altRoutes.forEach((route) => route.steps.forEach((step, index) => assert.equal(step.stepNumber, index + 1, id)));
  }
});

test("확인하지 못한 서비스는 공통 안내와 공식 링크만 준다", () => {
  for (const service of serviceCatalog) {
    if (verifiedCancelGuideIds.includes(service.id)) continue;
    const guide = getCancelGuide(service.id, { name: service.name, cancelUrl: service.cancelUrl });
    assert.equal(guide.verified, false, service.id);
    assert.deepEqual(guide.steps, getCommonCancelSteps(service.name), service.id);
    assert.match(guide.helpUrl, /^https:\/\//, `${service.id}: 공식 링크 없음`);
  }
});

test("카탈로그에는 공통 해지 문구가 남아 있지 않다", () => {
  for (const service of serviceCatalog) {
    assert.equal(service.guideSteps, undefined, service.id);
  }
});
