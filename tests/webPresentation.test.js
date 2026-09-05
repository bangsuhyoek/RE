import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("공개 랜딩에서 앱 시작 시 스플래시를 거친다", async () => {
  const app = await read("src/App.jsx");
  assert.match(app, /initialRoute = !requestedAtBoot\.route\s*\? "landing"/);
  assert.match(app, /const startAppFromLanding = \(intent = "default"\)/);
  assert.match(app, /navigate\("splash"\)/);
  assert.match(app, /<LandingScreen onStart=\{\(\) => startAppFromLanding\("default"\)\}/);
});

test("서비스 소개는 introSeen과 분리된 최초 1회 상태를 사용한다", async () => {
  const app = await read("src/App.jsx");
  const storage = await read("src/lib/storage.js");
  assert.match(storage, /introSeen:/);
  assert.match(app, /if \(!introSeenRef\.current\) \{\s*navigate\("intro"/);
  assert.match(app, /introSeenRef\.current = true/);
});

test("저장 effect는 cleanup 반환값을 만들지 않는다", async () => {
  const app = await read("src/App.jsx");
  assert.doesNotMatch(app, /useEffect\(\(\) => writeStoredValue/);
  assert.doesNotMatch(app, /useEffect\(\(\) => saveStoredNotifications/);
  assert.match(app, /useEffect\(\(\) => \{\s*writeStoredValue\(storageKeys\.profile, profile\);/);
});

test("웹 랜딩과 최초 소개는 고해상도 아트와 실제 HTML CTA를 분리한다", async () => {
  const entry = await read("src/components/EntryScreens.jsx");
  assert.match(entry, /className="re-web-landing-art"/);
  assert.match(entry, /<Button className="min-w-\[180px\]" onClick=\{onStart\}>시작하기/);
  assert.match(entry, /className="re-intro-art"/);
  assert.match(entry, /로그인하고 시작하기/);
});

test("데스크톱은 좌측 rail, 모바일은 세로 랜딩을 사용한다", async () => {
  const css = await read("src/web.css");
  assert.match(css, /@media \(min-width: 1024px\)/);
  assert.match(css, /> nav\[aria-label="주요 탐색"\]/);
  assert.match(css, /margin-left: 232px/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /\.re-web-hero \{[\s\S]*display: flex/);
});
