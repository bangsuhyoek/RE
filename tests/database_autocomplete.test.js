import test from "node:test";
import assert from "node:assert/strict";
import { matchServicesFromCatalog, searchHybridCatalog } from "../src/lib/supabase.js";

// 1. 샘플 카탈로그 (DB subscription_services & service_plans 구조 모사)
const mockCatalog = [
  {
    id: "netflix",
    name: "Netflix",
    category: "OTT",
    aliases: ["netflix", "넷플릭스", "netflix.com"],
    service_plans: [
      { id: "netflix-ad", name: "광고형 스탠다드", amount_krw: 7000, billing_cycle: "매월" },
      { id: "netflix-std", name: "스탠다드", amount_krw: 13500, billing_cycle: "매월" },
      { id: "netflix-prem", name: "프리미엄", amount_krw: 17000, billing_cycle: "매월" },
    ],
  },
  {
    id: "youtube",
    name: "YouTube",
    category: "OTT",
    aliases: ["youtube", "유튜브", "youtube premium", "유튜브 프리미엄", "youtube music"],
    service_plans: [
      { id: "yt-lite", name: "Premium Lite", amount_krw: 8500, billing_cycle: "매월" },
      { id: "yt-ind", name: "개인 멤버십", amount_krw: 14900, billing_cycle: "매월" },
    ],
  },
  {
    id: "coupang",
    name: "쿠팡 와우",
    category: "쇼핑",
    aliases: ["coupang wow", "coupang", "쿠팡 와우", "쿠팡와우", "쿠팡", "쿠팡플레이"],
    service_plans: [
      { id: "cp-wow", name: "와우 멤버십", amount_krw: 7890, billing_cycle: "매월" },
    ],
  },
  {
    id: "melon",
    name: "멜론",
    category: "음악",
    aliases: ["melon", "멜론", "카카오엔터테인먼트"],
    service_plans: [
      { id: "melon-stream", name: "스트리밍 클럽", amount_krw: 8900, billing_cycle: "매월" },
    ],
  },
  {
    id: "adobe",
    name: "Adobe Creative Cloud",
    category: "생산성",
    aliases: ["adobe", "어도비", "creative cloud", "포토샵"],
    service_plans: [
      { id: "adobe-photo", name: "포토그래피 플랜", amount_krw: 11000, billing_cycle: "매월" },
      { id: "adobe-all", name: "모든 앱", amount_krw: 61600, billing_cycle: "매월" },
    ],
  },
  {
    id: "kakao-talkdrive",
    name: "카카오톡 톡서랍 플러스",
    category: "생활/플랫폼",
    aliases: ["톡서랍 플러스", "톡서랍", "카카오 톡서랍"],
    service_plans: [
      { id: "drive-100", name: "100GB", amount_krw: 990, billing_cycle: "매월" },
      { id: "drive-250", name: "250GB", amount_krw: 1900, billing_cycle: "매월" },
    ],
  },
];

test("사용자 한글 검색어('넷플')로 넷플릭스 서비스와 요금제가 매칭된다", () => {
  const matches = matchServicesFromCatalog(mockCatalog, "넷플");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, "netflix");
  assert.equal(matches[0].name, "Netflix");
  assert.equal(matches[0].category, "OTT");
  assert.equal(matches[0].plans.length, 3);
  assert.equal(matches[0].plans[0].name, "광고형 스탠다드");
  assert.equal(matches[0].plans[0].amount_krw, 7000);
});

test("별칭('포토샵') 입력 시 Adobe 서비스와 요금제가 정상 매칭된다", () => {
  const matches = matchServicesFromCatalog(mockCatalog, "포토샵");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, "adobe");
  assert.equal(matches[0].name, "Adobe Creative Cloud");
  assert.equal(matches[0].plans.length, 2);
  assert.equal(matches[0].plans[0].amount_krw, 11000);
});

test("공백이 포함되거나 대소문자가 다른 영문 검색어('  youTUBE ')도 매칭된다", () => {
  const matches = matchServicesFromCatalog(mockCatalog, "  youTUBE ");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, "youtube");
});

test("줄임말 '톡서랍' 입력 시 카카오톡 톡서랍 플러스가 매칭된다", () => {
  const matches = matchServicesFromCatalog(mockCatalog, "톡서랍");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, "kakao-talkdrive");
  assert.equal(matches[0].name, "카카오톡 톡서랍 플러스");
  assert.equal(matches[0].plans[0].amount_krw, 990);
});

test("검색어가 비어있거나 매칭되는 항목이 없으면 빈 배열을 반환한다", () => {
  assert.deepEqual(matchServicesFromCatalog(mockCatalog, ""), []);
  assert.deepEqual(matchServicesFromCatalog(mockCatalog, "   "), []);
  assert.deepEqual(matchServicesFromCatalog(mockCatalog, "존재하지않는서비스XYZ"), []);
});

test("searchHybridCatalog는 로컬 캐시 일치 항목이 있으면 즉시 반환한다", async () => {
  const results = await searchHybridCatalog(mockCatalog, "넷플");
  assert.equal(results.length, 1);
  assert.equal(results[0].id, "netflix");
});

test("searchHybridCatalog는 로컬 캐시에 일치 항목이 없고 Supabase가 비활성 상태일 때 안전하게 빈 배열을 반환한다", async () => {
  const results = await searchHybridCatalog(mockCatalog, "완전히새로운미등록서비스");
  assert.deepEqual(results, []);
});
