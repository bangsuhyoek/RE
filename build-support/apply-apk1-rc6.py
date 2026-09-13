#!/usr/bin/env python3
from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else "app")

def replace_once(path, old, new, label):
    p = root / path
    text = p.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"RC6 target missing: {label}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")

index = root / "index.html"
html = index.read_text(encoding="utf-8")

# Service-world uses the approved simple RE. wordmark. Refresh artwork remains untouched.
html = html.replace(
    '<img class="service-brand-logo" src="./assets/brand/logo-service-primary.svg" alt="RE." />',
    '<span class="service-brand-wordmark" aria-label="RE.">RE.</span>'
)

# Use the already-implemented RE character identity; do not introduce a new character.
html = html.replace("./assets/characters/character-state-happy.webp", "./assets/raster/character-state-login.webp")

# Home wording and supported quick actions only.
html = html.replace(
    '좋은 하루예요. 🌸</h1><p>오늘도 더 가벼운 일상을 만들어봐요.</p>',
    '좋은 아침이에요!</h1><p>오늘도 RE.가 함께할게요.</p>'
)
html = html.replace(
    '작은 변화가,<br />더 여유로운 내일을 만들어요.',
    '오늘도<br />잘 챙기고 있어요!'
)
home_anchor = '          <section class="panel upcoming-panel" data-fixture>'
if 'class="home-action-grid"' not in html:
    quick = '''          <section class="home-action-grid" aria-label="빠른 기능">
            <button data-route="subscriptions" type="button"><span class="home-action-icon">▣</span><strong>구독 관리</strong></button>
            <button data-route="calendar" type="button"><span class="home-action-icon">▦</span><strong>캘린더</strong></button>
            <button data-route="benefits" type="button"><span class="home-action-icon">♡</span><strong>혜택 발견</strong></button>
            <button data-route="notifications" type="button"><span class="home-action-icon">♧</span><strong>알림</strong></button>
          </section>
'''
    if home_anchor not in html:
        raise SystemExit("RC6 home quick-action anchor missing")
    html = html.replace(home_anchor, quick + home_anchor, 1)

html = html.replace("등록된 구독이 아직 없어요", "구독이 아직 없어요")
index.write_text(html, encoding="utf-8")

app = root / "app.js"
js = app.read_text(encoding="utf-8")
js = js.replace("./assets/characters/character-state-thinking.webp", "./assets/raster/character-state-news.webp")
js = js.replace("추천 서비스 둘러보기", "혜택 둘러보기")
app.write_text(js, encoding="utf-8")

# OAuth native return hardening.
# The previous app-resume fallback could declare failure after 1.2 seconds while
# exchangeCodeForSession() was still running. Mark callback processing explicitly
# and never let appStateChange race the PKCE code exchange.
integration = root / "src/re-integration.js"
ijt = integration.read_text(encoding="utf-8")
callback_anchor = 'window.addEventListener("re:auth-callback", async (event) => {\n  try {'
callback_replacement = '''let nativeOAuthCallbackInFlight = false;
let nativeOAuthCallbackSeenAt = 0;

window.addEventListener("re:auth-callback", async (event) => {
  nativeOAuthCallbackInFlight = true;
  nativeOAuthCallbackSeenAt = Date.now();
  try {'''
if callback_replacement not in ijt:
    if callback_anchor not in ijt:
        raise SystemExit("RC7 OAuth callback anchor missing")
    ijt = ijt.replace(callback_anchor, callback_replacement, 1)

old_resume = '''window.addEventListener("re:app-resumed", () => {
  if (!Capacitor.isNativePlatform() || !readPendingOAuthMode()) return;
  window.setTimeout(async () => {
    try {
      if (!readPendingOAuthMode()) return;
      const { data } = await requireClient().auth.getSession();
      if (data.session) return;
      await Browser.close().catch(() => {});
      clearPendingOAuthMode();
      clearPendingLegalAcceptance();
      window.location.replace("?screen=login&authError=oauth_return_missing");
    } catch (_error) {}
  }, 1200);
});'''
new_resume = '''window.addEventListener("re:app-resumed", () => {
  if (!Capacitor.isNativePlatform() || !readPendingOAuthMode()) return;
  window.setTimeout(async () => {
    try {
      if (!readPendingOAuthMode()) return;
      if (nativeOAuthCallbackInFlight) return;
      if (nativeOAuthCallbackSeenAt && Date.now() - nativeOAuthCallbackSeenAt < 15000) return;
      const { data } = await requireClient().auth.getSession();
      if (data.session) return;
      await Browser.close().catch(() => {});
      clearPendingOAuthMode();
      clearPendingLegalAcceptance();
      window.location.replace("?screen=login&authError=oauth_return_missing");
    } catch (_error) {}
  }, 10000);
});'''
if new_resume not in ijt:
    if old_resume not in ijt:
        raise SystemExit("RC7 OAuth resume fallback anchor missing")
    ijt = ijt.replace(old_resume, new_resume, 1)

# Clear the in-flight guard after success/failure processing when navigation does
# not immediately replace the document (e.g. password recovery).
catch_tail = '''    clearPendingOAuthMode();
    clearPendingLegalAcceptance();
    window.location.replace(`?screen=login&authError=${encodeURIComponent(code)}`);
  }
});'''
catch_replacement = '''    clearPendingOAuthMode();
    clearPendingLegalAcceptance();
    window.location.replace(`?screen=login&authError=${encodeURIComponent(code)}`);
  } finally {
    nativeOAuthCallbackInFlight = false;
  }
});'''
if catch_replacement not in ijt:
    if catch_tail not in ijt:
        raise SystemExit("RC7 OAuth callback finalizer anchor missing")
    ijt = ijt.replace(catch_tail, catch_replacement, 1)

integration.write_text(ijt, encoding="utf-8")

# Version/build identity.
replace_once("android/app/build.gradle", 'versionCode 5', 'versionCode 7', "versionCode")
replace_once("android/app/build.gradle", 'versionName "1.0.0-rc5"', 'versionName "1.0.0-rc7"', "versionName")
pkg = root / "package.json"
t = pkg.read_text(encoding="utf-8").replace('"version": "1.0.0-rc.7"', '"version": "1.0.0-rc.6"')
pkg.write_text(t, encoding="utf-8")
for name in ("release-config.js", "release-manifest.json"):
    p = root / name
    t = p.read_text(encoding="utf-8").replace("apk1-release-candidate-4", "apk1-release-candidate-7")
    p.write_text(t, encoding="utf-8")

# Append the approved-reference RC6 styling exactly once.
style = root / "styles.css"
css = style.read_text(encoding="utf-8")
marker = "/* APK1 RC6 — final criteria: RE_UI 디자인(1) + 겨울버전 RE_UI 디자인. */"
if marker not in css:
    extra = Path("build-support/rc6.css").read_text(encoding="utf-8")
    style.write_text(css.rstrip() + "\n\n" + extra.rstrip() + "\n", encoding="utf-8")


# RC6 uses an intentionally inset bottom navigation so it stays clear of Android system navigation.
# Keep visual QA strict, but validate the approved 0-12px bottom gap and up-to-10px side insets.
visual = root / "scripts/visual-smoke.mjs"
v = visual.read_text(encoding="utf-8")
old_nav = '''  (item.bottomNavBottom !== null && item.bottomNavBottom !== 0) ||
  (item.bottomNavWidth !== null && item.bottomNavWidth !== item.width)
'''
new_nav = '''  (item.bottomNavBottom !== null && (item.bottomNavBottom < 0 || item.bottomNavBottom > 12)) ||
  (item.bottomNavWidth !== null && (item.bottomNavWidth > item.width || item.bottomNavWidth < item.width - 20))
'''
if old_nav in v:
    visual.write_text(v.replace(old_nav, new_nav), encoding="utf-8")
elif new_nav not in v:
    raise SystemExit("RC6 visual bottom-nav QA target missing")

# Fail closed if unsupported UI was accidentally introduced.
html = index.read_text(encoding="utf-8")
for forbidden in ("data-auth-provider=\"apple\"", "data-auth-provider=\"kakao\"", "data-route=\"report\""):
    if forbidden in html:
        raise SystemExit(f"Unsupported function exposed in RC6: {forbidden}")

print("RC6 final-reference patch applied")
