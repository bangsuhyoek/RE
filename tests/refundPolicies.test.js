import assert from "node:assert/strict";
import test from "node:test";
import { runAgent, VERIFIED_REFUND_POLICIES } from "../src/lib/subscriptionAgent.js";
import { serviceCatalog } from "../src/data/subscriptionData.js";
import { findMissingPhrases } from "../scripts/crawler/refundPolicyCheck.js";

test("검증 환불 정책은 카탈로그 서비스에만 붙고 공식 출처와 확인일이 있다", () => {
  const ids = new Set(serviceCatalog.map((service) => service.id));
  for (const [id, policy] of Object.entries(VERIFIED_REFUND_POLICIES)) {
    assert.ok(ids.has(id), id + "는 카탈로그에 없는 서비스 ID예요");
    assert.match(policy.sourceUrl, /^https:\/\//);
    assert.match(policy.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(policy.summary.length > 10);
    assert.ok(policy.checkPhrases?.length > 0, id + "는 출처 확인 문구가 없어요");
  }
});

test("출처 확인은 줄바꿈 차이를 무시하고 사라진 문구만 알려준다", () => {
  const page = "만료일 이전에 해지하셔도\n남은 일수 만큼   환불되지 않아요.";
  assert.deepEqual(findMissingPhrases(["만료일 이전에 해지하셔도 남은 일수 만큼 환불되지 않아요", "애플 고객센터"], page), ["애플 고객센터"]);
});

test("환불 요청 시 확인된 서비스는 정책과 출처를 함께 보여준다", () => {
  const now = new Date(2026, 9, 2, 10, 0, 0);
  const subscriptions = [
    { subscriptionId: "s-yt", id: "youtube", name: "YouTube Premium", amount: 14900, dueDay: 1, billingCycle: "매월", paymentMethod: "신한카드 ****4521" },
    { subscriptionId: "s-cplay", id: "coupangplay", name: "쿠팡플레이", amount: 7890, dueDay: 1, billingCycle: "매월", paymentMethod: "신한카드 ****4521" },
  ];
  const youtube = runAgent({ text: "유튜브 환불 받아줘", subscriptions, now });
  assert.equal(youtube.policy.sourceLabel, "YouTube 고객센터 환불 안내");
  // 공식 원문을 확인하지 못한 서비스는 정책을 지어내지 않는다.
  const coupangPlay = runAgent({ text: "쿠팡플레이 환불 받아줘", subscriptions, now });
  assert.equal(coupangPlay.policy, null);
});

test("하이픈이 있는 서비스 ID도 검증 정책을 찾는다", () => {
  const now = new Date(2026, 9, 2, 10, 0, 0);
  const subscriptions = [
    { subscriptionId: "s-ps", id: "ps-plus", name: "PlayStation Plus", amount: 9800, dueDay: 1, billingCycle: "매월", paymentMethod: "신한카드 ****4521" },
  ];
  const response = runAgent({ text: "PlayStation Plus 환불 받아줘", subscriptions, now });
  assert.equal(response.policy?.sourceLabel, "PlayStation Store 환불 규정");
});
