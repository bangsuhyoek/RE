import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("V5는 V4의 전체 앱 폭 정책을 유지하면서 축소 랜딩 썸네일 문제를 수정한다", () => {
  const theme = read("src/landing-parity-v5.css");
  assert.ok(theme.includes("width: 100% !important"));
  assert.ok(theme.includes("max-width: none !important"));
  assert.ok(theme.includes("grid-template-columns: repeat(4,minmax(0,1fr))"));
});

test("수련 배경은 단일 cover가 아니라 초광폭에서도 보이도록 여러 위치에 배치한다", () => {
  const theme = read("src/landing-parity-v5.css");
  const matches = theme.match(/url\("\/re-assets\/bg_plate\.jpg"\)/g) || [];
  assert.ok(matches.length >= 3);
  assert.ok(theme.includes("background-position: center, -82px 88%"));
});

test("고퀄리티 이미지 슬롯은 SD로 강제 치환하지 않는다", () => {
  const theme = read("src/landing-parity-v5.css");
  assert.ok(theme.includes("content: normal !important"));
  const home = read("src/components/HomeScreen.jsx");
  assert.ok(home.includes('re-concierge-card__character re-character-hq'));
});

test("등록 서비스 아이콘은 metadata-backed pastel tone을 사용한다", () => {
  const serviceData = read("src/data/subscriptionData.js");
  const serviceBrand = read("src/lib/serviceBrand.js");
  for (const tone of ["youtube", "spotify", "disney", "netflix"]) {
    assert.ok(serviceData.includes(`markTone: "${tone}"`));
    assert.ok(serviceBrand.includes(`${tone}:`));
  }
});
