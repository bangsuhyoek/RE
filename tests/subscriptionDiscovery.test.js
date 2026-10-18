import test from "node:test";
import assert from "node:assert/strict";
import {
  inferServiceByPriceFingerprint,
  scanHubPageText,
  scanStatementText,
  SUBSCRIPTION_HUBS,
} from "../src/lib/subscriptionDiscovery.js";
import { sharedTextToDetected } from "../src/lib/shareIntake.js";

test("PG사/인앱결제 마스킹('구글플레이 14,900원')을 가격 지문으로 YouTube Premium에 매칭한다", () => {
  const spec = inferServiceByPriceFingerprint(14900);
  assert.ok(spec);
  assert.equal(spec.id, "youtube");
  assert.equal(spec.name, "YouTube Premium");
});

test("동일 가격대(9,900원) 후보가 여러 개일 때 기기에 설치된 앱(millie)을 최우선으로 특정한다", () => {
  const spec = inferServiceByPriceFingerprint(9900, ["millie"]);
  assert.ok(spec);
  assert.equal(spec.id, "millie");
  assert.equal(spec.name, "밀리의 서재");
});

test("명세서·결제내역 텍스트 일괄 스캔 시 일반 쇼핑/편의점 결제는 걸러내고 구독만 추출한다", () => {
  const sampleStatement = [
    "2026.10.01 신한카드 승인 GS25역삼점 4,500원 일시불",
    "2026.10.03 신한카드 승인 쿠팡 34,200원 일시불",
    "2026.10.05 신한카드 승인 넷플릭스 17,000원 일시불",
    "2026.10.07 KB국민카드 승인 구글플레이 14,900원 일시불",
    "2026.10.09 현대카드 승인 쿠팡(와우멤버십) 7,890원 일시불",
    "2026.10.11 토스페이 결제 네이버파이낸셜 4,900원",
    "2026.10.12 신한카드 승인취소 왓챠 7,900원",
  ].join("\n");

  const result = scanStatementText(sampleStatement, {
    installedServiceIds: ["youtube", "netflix"],
  });

  const ids = result.items.map((item) => item.serviceId);
  assert.deepEqual(ids, ["netflix", "youtube", "coupang", "naver"]);

  const yt = result.items.find((item) => item.serviceId === "youtube");
  assert.equal(yt.amount, 14900);
  assert.equal(yt.dueDay, 7);
});

test("카탈로그에 없는 생소한 서비스라도 명세서에서 2회 이상 동일 금액 반복 결제되면 정기구독으로 잡아낸다", () => {
  const sampleStatement = [
    "2026.08.15 신한카드 승인 어썸뉴스레터 5,900원 일시불",
    "2026.09.15 신한카드 승인 어썸뉴스레터 5,900원 일시불",
    "2026.10.15 신한카드 승인 어썸뉴스레터 5,900원 일시불",
    "2026.10.16 신한카드 승인 스타벅스 4,500원 일시불",
  ].join("\n");

  const result = scanStatementText(sampleStatement);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].name, "어썸뉴스레터");
  assert.equal(result.items[0].amount, 5900);
  assert.equal(result.items[0].occurrences, 3);
});

test("무료 체험 시작 알림/문자를 0원 체험 구독으로 감지한다", () => {
  const sample = "[Google Play] Duolingo Super 무료 체험이 시작되었습니다. 10월 25일 체험 종료 후 월 14,000원 자동결제";
  const result = scanStatementText(sample);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].serviceId, "duolingo-super");
  assert.equal(result.items[0].isTrial, true);
});

test("공유받은 익명 인앱결제 문자('[KB국민카드] 구글플레이 14,900원 승인')도 가격 지문으로 유튜브 프리미엄을 자동 채운다", () => {
  const detected = sharedTextToDetected("[KB국민카드] 구글플레이 14,900원 일시불 승인 10/12");
  assert.ok(detected);
  assert.equal(detected.serviceId, "youtube");
  assert.equal(detected.name, "YouTube Premium");
  assert.equal(detected.amount, 14900);
});

test("5대 결제 허브 바로가기 목록이 정의되어 있다", () => {
  assert.ok(SUBSCRIPTION_HUBS.length >= 5);
  assert.ok(SUBSCRIPTION_HUBS.some((h) => h.id === "google-play"));
  assert.ok(SUBSCRIPTION_HUBS.some((h) => h.id === "naver-pay"));
});

test("구글 플레이 정기 결제 화면 글에서 활성 구독만 읽고, 취소된 구독은 빼고, 연간 구독은 다음 결제일을 채운다", () => {
  const page = [
    "정기 결제",
    "활성",
    "YouTube Premium",
    "₩14,900/월",
    "다음 결제일: 2026. 11. 5.",
    "구독 취소",
    "Duolingo Super",
    "₩89,000/년",
    "다음 결제일: 2027. 3. 2.",
    "관리",
    "밀리의 서재",
    "₩9,900/월",
    "취소됨 · 2026. 10. 30.에 만료",
    "마이폼 노트",
    "₩3,300/월",
    "다음 결제일: 2026. 11. 12.",
  ].join("\n");

  const { items } = scanHubPageText(page, { hubName: "Google Play 정기 결제", now: new Date(2026, 9, 19) });
  const byName = Object.fromEntries(items.map((item) => [item.serviceId || item.name, item]));

  assert.deepEqual(Object.keys(byName).sort(), ["duolingo-super", "youtube", "마이폼 노트"].sort());
  assert.equal(byName.youtube.amount, 14900);
  assert.equal(byName.youtube.dueDay, 5);
  assert.equal(byName.youtube.billingCycle, "매월");
  assert.equal(byName["duolingo-super"].billingCycle, "매년");
  assert.equal(byName["duolingo-super"].nextBillingDate, "2027-03-02");
  assert.equal(byName["마이폼 노트"].amount, 3300);
  assert.equal(byName["마이폼 노트"].dueDay, 12);
});

test("명세서의 연간 결제는 다음 해 같은 날을 다음 결제일로 잡는다", () => {
  const { items } = scanStatementText("2026.03.02 신한카드 승인 듀오링고 연간 89,000원", { now: new Date(2026, 9, 19) });
  assert.equal(items[0].billingCycle, "매년");
  assert.equal(items[0].nextBillingDate, "2027-03-02");
});
