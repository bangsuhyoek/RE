import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("Landing states the real AI boundary instead of broad AI management", () => {
  const source = read("src/components/LandingScreen.jsx");
  assert.match(source, /AI 결제 이미지 인식 · 검증형 절약 계산/);
  assert.doesNotMatch(source, /AI 기반 스마트 구독 관리/);
  assert.doesNotMatch(source, /최적의 환승 프로모션/);
});

test("Contest Web Demo exposes AI image entry separately from notification parsing", () => {
  const source = read("src/components/HomeScreen.jsx");
  assert.match(source, /최근 결제에서 구독 찾기/);
  assert.match(source, /AI로 결제 이미지 읽기/);
});

test("AI image results require human review and notification parsing is not labeled AI", () => {
  const add = read("src/components/AddModal.jsx");
  const demo = read("src/components/ContestDemoPanel.jsx");
  assert.match(add, /AI가 읽은 결제 정보예요\. 저장 전 확인해 주세요/);
  assert.match(demo, /결제 알림 판별은 앱과 같은 규칙 기반 로직/);
});

test("Terms separate AI OCR from deterministic message parsing", () => {
  const source = read("src/components/TermsModal.jsx");
  assert.match(source, /영수증 사진은 AI OCR로 읽고, 결제 문자는 규칙 기반 파싱/);
  assert.match(source, /구독 등록 후보를 제시하고 저장 전 회원이 확인/);
});

test("Policy documents keep AI OCR separate from rule-based notification parsing", () => {
  const terms = read("docs/terms/01_TERMS_OF_SERVICE.md");
  const privacy = read("docs/terms/02_PRIVACY_POLICY.md");
  assert.match(terms, /영수증 이미지는 AI OCR로 읽고, 결제 문자는 규칙 기반 파싱/);
  assert.match(terms, /구독 등록 후보를 제시하고, 회원 확인 후 저장/);
  assert.match(privacy, /영수증 이미지는 AI OCR로 읽고, 결제 문자 텍스트는 규칙 기반으로 파싱/);
  assert.doesNotMatch(terms, /AI 영수증\/결제문자 분석 등록/);
  assert.doesNotMatch(privacy, /AI 영수증\/결제문자 분석 서비스/);
});
