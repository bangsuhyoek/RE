import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Android package contract includes Capacitor, local notifications and Supabase client", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.ok(pkg.dependencies["@capacitor/core"]);
  assert.ok(pkg.dependencies["@capacitor/android"]);
  assert.ok(pkg.dependencies["@capacitor/local-notifications"]);
  assert.ok(pkg.dependencies["@supabase/supabase-js"]);
});

test("final mobile css is loaded last", () => {
  const source = read("src/main.jsx");
  assert.match(source, /import "\.\/mobile-final\.css";/);
  const lastCss = source.lastIndexOf('import "./mobile-final.css";');
  assert.ok(lastCss > source.lastIndexOf('import "./landing-parity-v6.css";'));
});

test("unimplemented browse and social auth are not wired as fake working actions", () => {
  const source = read("src/components/MobileAuthScreens.jsx");
  assert.match(source, /둘러보기/);
  assert.match(source, /aria-disabled="true"/);
  assert.doesNotMatch(source, /onGuest\s*\(/);
});

test("database migration only covers already implemented persisted domains", () => {
  const sql = read("supabase/migrations/202609060001_mobile_existing_features.sql");

  // The team Supabase already owns public.subscriptions. Preserve it and only
  // extend it with the client metadata required by the mobile app.
  for (const table of ["profiles", "cancellation_history", "notifications"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
  }
  assert.match(sql, /alter table public\.subscriptions/);
  assert.match(sql, /add column if not exists subscription_id text/);
  assert.doesNotMatch(sql, /create table if not exists public\.subscriptions/);

  assert.doesNotMatch(sql, /create table if not exists public\.(payments|card_payments|transactions)/i);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /auth\.uid\(\)[^\n]*=\s*user_id/);
});

test("runtime DB sync requires an existing authenticated Supabase user", () => {
  const source = read("src/lib/remoteStore.js");
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /if \(!user\) return \{ skipped: true, reason: "no-auth-session" \}/);
  assert.doesNotMatch(source, /signInAnonymously|signUp\(|signInWithOAuth/);
});

test("mobile notification route is a full screen route", () => {
  const source = read("src/App.jsx");
  assert.match(source, /"notifications"/);
  assert.match(source, /<NotificationScreen/);
  assert.doesNotMatch(source, /<NotificationCenterModal/);
});

test("native API bridge only rewrites relative API calls on native platform", () => {
  const source = read("src/lib/apiBase.js");
  assert.match(source, /Capacitor\.isNativePlatform\(\)/);
  assert.match(source, /input\.startsWith\("\/api\/"\)/);
  assert.match(source, /VITE_API_BASE_URL/);
});

test("final mobile runtime does not inject sample subscription or promotion brands", () => {
  const source = read("src/components/MobileFinalScreens.jsx");
  assert.doesNotMatch(source, /Netflix|YouTube Premium|Spotify|Disney\+/);
  assert.doesNotMatch(source, /128,400|52,000|17,000|14,900/);
});
