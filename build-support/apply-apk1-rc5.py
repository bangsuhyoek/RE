#!/usr/bin/env python3
from pathlib import Path
import shutil, sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else "app")

# ---------------------------------------------------------------------------
# 1) Canonical reusable design assets. Keep refresh assets separate from the
#    service-world assets. Existing RE character identity is preserved exactly.
# ---------------------------------------------------------------------------
brand = root / "assets/brand"
chars = root / "assets/characters"
bgs = root / "assets/backgrounds"
for p in (brand, chars, bgs): p.mkdir(parents=True, exist_ok=True)
raster = root / "assets/raster"

# Refresh screens: protected copies of the already-approved final refresh art.
shutil.copyfile(raster / "bg-waterlily-splash.webp", bgs / "bg-refresh-logo-master.webp")
shutil.copyfile(raster / "bg-waterlily-splash.webp", bgs / "bg-refresh-character-master.webp")

# Service-world background asset family. They are separately named assets so a
# future art replacement can happen without touching layout or state logic.
asset_sources = {
    "bg-service-default.webp": "bg-waterlily-home.webp",
    "bg-service-payment-due.webp": "bg-waterlily-calendar.webp",
    "bg-service-benefit.webp": "bg-waterlily-content.webp",
    "bg-service-empty.webp": "bg-waterlily-content.webp",
    "bg-service-guidance.webp": "bg-waterlily-auth.webp",
    "bg-service-success.webp": "bg-waterlily-home.webp",
}
for dst, src in asset_sources.items(): shutil.copyfile(raster / src, bgs / dst)

# Two canonical emotional states based on the existing implemented RE character.
shutil.copyfile(raster / "character-state-login.webp", chars / "character-state-happy.webp")
shutil.copyfile(raster / "character-state-news.webp", chars / "character-state-thinking.webp")

# New service logo: used from landing onward. Refresh logo is intentionally untouched.
(brand / "logo-service-primary.svg").write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="520" height="220" viewBox="0 0 520 220" role="img" aria-label="RE.">
<rect width="520" height="220" fill="none"/><text x="260" y="162" text-anchor="middle" font-family="Georgia,Times New Roman,serif" font-size="172" font-weight="400" letter-spacing="-8" fill="#2D4C9A">RE.</text></svg>''', encoding="utf-8")
(root / "assets/DESIGN_ASSET_MANIFEST.md").write_text('''# RE canonical design assets\n\n- Refresh: existing final logo/background protected.\n- Service logo: `brand/logo-service-primary.svg`\n- Character states: `characters/character-state-happy.webp`, `character-state-thinking.webp`\n- Background states: default, payment-due, benefit, empty, guidance, success.\n\nLayout rule: preserve each approved reference screen's relative frame proportions and scale them into the Android usable frame.\n''', encoding="utf-8")

# ---------------------------------------------------------------------------
# 2) Structural UI alignment for the six approved reference screens.
# ---------------------------------------------------------------------------
index = root / "index.html"
html = index.read_text()
service_brand = '<img class="service-brand-logo" src="./assets/brand/logo-service-primary.svg" alt="RE." />'
html = html.replace('<span class="brand-mark">◌</span><strong>RE.</strong>', service_brand)

# Landing reference: one calm hero frame, not the older feature-card carousel.
html = html.replace(
    '<img class="landing-character" src="./assets/raster/character-concierge-source-crop.png" alt="" />',
    '<img class="landing-character" src="./assets/characters/character-state-happy.webp" alt="" />', 1)
html = html.replace(
    '<p class="landing-footer">지금도, 더 좋은 너를 향해, <strong>RE.</strong></p>',
    '<p class="landing-footer">이미 계정이 있으신가요? <button class="text-button" data-route="login" type="button">로그인</button></p>', 1)

# Home reference uses the canonical happy state.
html = html.replace('./assets/raster/character-avatar-source-crop.png', './assets/characters/character-state-happy.webp', 1)

# Empty/permission contexts use the canonical thinking state.
# Add first-login payment-detection onboarding. Permission state itself becomes
# the feature ON/OFF state; there is no second in-app toggle.
marker = '      <div class="app-toast" role="status" aria-live="polite" hidden></div>'
if marker in html and 'data-payment-onboarding' not in html:
    onboarding = '''      <section class="payment-onboarding" data-payment-onboarding hidden aria-modal="true" role="dialog" aria-labelledby="payment-onboarding-title">
        <div class="payment-onboarding-card">
          <img src="./assets/characters/character-state-thinking.webp" alt="" />
          <h2 id="payment-onboarding-title">결제 알림, RE.가 함께 챙겨드릴게요</h2>
          <p>카드·간편결제·메시지 앱의 결제 알림에서 구독으로 보이는 결제를 찾아 등록 후보로 보여드려요.</p>
          <small>알림 원문은 저장하지 않고, 구독 확인에 필요한 정보만 정리해요.</small>
          <p class="payment-onboarding-status" data-payment-onboarding-status hidden></p>
          <button class="primary-button" data-payment-onboarding-enable type="button">자동으로 찾아보기</button>
          <button class="text-button" data-payment-onboarding-later type="button">나중에 설정할게요</button>
        </div>
      </section>\n'''
    html = html.replace(marker, onboarding + marker, 1)
index.write_text(html)

# ---------------------------------------------------------------------------
# 3) Empty state becomes the approved thinking-character composition.
# ---------------------------------------------------------------------------
app = root / "app.js"
js = app.read_text()
old = 'overlay.innerHTML = `<div class="state-symbol" aria-hidden="true">${symbol}</div><h2>${copy[0]}</h2><p>${copy[1]}</p><button class="primary-button" type="button" data-state-retry${actionAttribute}${routeAttribute}>${buttonLabel}</button>`;'
new = '''overlay.innerHTML = state === "empty"
      ? `<img class="state-character" src="./assets/characters/character-state-thinking.webp" alt="" /><h2>${copy[0]}</h2><p>${copy[1]}</p><div class="state-actions"><button class="primary-button" type="button" data-state-retry${actionAttribute}${routeAttribute}>${buttonLabel}</button><button class="secondary-button" type="button" data-state-action="add-subscription">직접 구독 추가하기</button><button class="text-button" type="button" data-state-route="benefits">추천 서비스 둘러보기</button></div>`
      : `<div class="state-symbol" aria-hidden="true">${symbol}</div><h2>${copy[0]}</h2><p>${copy[1]}</p><button class="primary-button" type="button" data-state-retry>다시 시도</button>`;'''
if old in js: js = js.replace(old, new, 1)

# First-login permission onboarding.
if 'const paymentOnboardingKey = "re.payment-capture-onboarding.v1";' not in js:
    anchor = 'const STATE_COPY = {'
    helpers = '''const paymentOnboardingKey = "re.payment-capture-onboarding.v1";
function paymentOnboardingNode() { return document.querySelector("[data-payment-onboarding]"); }
function hidePaymentOnboarding(value = "done") {
  const node = paymentOnboardingNode();
  if (node) node.hidden = true;
  try { localStorage.setItem(paymentOnboardingKey, value); } catch (_error) {}
}
function showPaymentOnboarding() {
  if (qaMode || sessionState !== "authenticated") return;
  try { if (localStorage.getItem(paymentOnboardingKey)) return; } catch (_error) {}
  const node = paymentOnboardingNode();
  if (node) node.hidden = false;
}
async function refreshPaymentOnboardingAfterSettings() {
  const node = paymentOnboardingNode();
  if (!node || node.hidden) return;
  const status = node.querySelector("[data-payment-onboarding-status]");
  const handler = window.REIntegrations?.actions?.["check-payment-capture"];
  if (typeof handler !== "function") return;
  try {
    const result = await withIntegrationTimeout(handler({}), "결제 알림 설정 확인");
    if (result?.enabled === true) {
      if (status) { status.hidden = false; status.textContent = "준비됐어요. 이제 구독으로 보이는 결제를 발견하면 RE.가 먼저 알려드릴게요."; }
      window.setTimeout(() => { hidePaymentOnboarding("enabled"); showToast("결제 알림 자동 찾기가 준비됐어요.", "success"); }, 650);
    } else if (status) { status.hidden = false; status.textContent = "아직 설정이 완료되지 않았어요. 알림 접근에서 RE.를 켜 주세요."; }
  } catch (_error) {}
}

'''
    js = js.replace(anchor, helpers + anchor, 1)

# Show once after successful login/home entry.
old = '        setScreen("home");\n'
if old in js and 'showPaymentOnboarding();' not in js[js.find(old):js.find(old)+180]:
    js = js.replace(old, '        setScreen("home");\n        window.setTimeout(showPaymentOnboarding, 350);\n', 1)

# Add onboarding controls.
if 'data-payment-onboarding-enable' not in js:
    anchor = 'document.querySelector("[data-resend-confirmation]")?.addEventListener'
    controls = '''document.querySelector("[data-payment-onboarding-enable]")?.addEventListener("click", async () => {
  const node = paymentOnboardingNode();
  const status = node?.querySelector("[data-payment-onboarding-status]");
  const handler = window.REIntegrations?.actions?.["enable-payment-capture"];
  if (typeof handler !== "function") return;
  if (status) { status.hidden = false; status.textContent = "설정에서 RE.의 알림 접근을 허용한 뒤 돌아와 주세요."; }
  try { await withIntegrationTimeout(handler({}), "결제 알림 자동 찾기 설정"); }
  catch (_error) { if (status) status.textContent = "설정을 열지 못했어요. 잠시 후 다시 시도해 주세요."; }
});
document.querySelector("[data-payment-onboarding-later]")?.addEventListener("click", () => hidePaymentOnboarding("later"));
window.addEventListener("re:app-resumed", () => { void refreshPaymentOnboardingAfterSettings(); });

'''
    js = js.replace(anchor, controls + anchor, 1)

# When Google/deep-link flow returns directly to home, also show onboarding once.
js = js.replace('    } else window.location.replace("?screen=home");', '    } else window.location.replace("?screen=home&paymentOnboarding=1");', 1)
# The replacement above may live in integration rather than app.js; harmless if absent.
app.write_text(js)

integration = root / "src/re-integration.js"
ijt = integration.read_text()
ijt = ijt.replace('    } else window.location.replace("?screen=home");', '    } else window.location.replace("?screen=home&paymentOnboarding=1");', 1)
integration.write_text(ijt)

# On startup after Google OAuth return, show the one-time onboarding.
app = root / "app.js"
js = app.read_text()
needle = '  if (initialParams.get("socialConsent") === "required") {'
if needle in js and 'initialParams.get("paymentOnboarding")' not in js:
    js = js.replace(needle, '  if (initialParams.get("paymentOnboarding") === "1") window.setTimeout(showPaymentOnboarding, 450);\n  ' + needle, 1)
app.write_text(js)

# ---------------------------------------------------------------------------
# 4) Six-screen visual system. The proportions are expressed in vw/vh/clamp so
#    they scale from the approved reference frame into the Android usable frame.
# ---------------------------------------------------------------------------
styles = root / "styles.css"
css = styles.read_text()
if '/* APK1 RC5: approved six-screen proportional design system. */' not in css:
    css += r'''

/* APK1 RC5: approved six-screen proportional design system. */
:root {
  --re-ink: #183a78;
  --re-blue: #406ed0;
  --re-muted: #6d7fa5;
  --re-glass: rgba(255,255,255,.83);
  --re-glass-strong: rgba(255,255,255,.91);
  --re-border: rgba(255,255,255,.72);
  --re-shadow: 0 9px 24px rgba(61,84,150,.12), inset 0 1px 0 rgba(255,255,255,.82);
}
.service-brand-logo { display:block; width: clamp(54px, 17vw, 76px); height:auto; object-fit:contain; }
.landing-brand .service-brand-logo { width: clamp(120px, 38vw, 164px); margin-inline:auto; }
.brand-lockup:has(.service-brand-logo) { gap:0; }

/* Service-world backgrounds. The image files are canonical assets; overlays tune state while preserving world identity. */
.landing-screen { background: linear-gradient(rgba(250,250,255,.28),rgba(249,250,255,.22)), url("./assets/backgrounds/bg-service-default.webp") center 46%/cover no-repeat !important; }
.auth-screen { background: linear-gradient(rgba(252,251,255,.38),rgba(250,250,255,.30)), url("./assets/backgrounds/bg-service-guidance.webp") center 46%/cover no-repeat !important; }
.app-screen[data-screen="home"], .app-screen[data-screen="subscriptions"], .app-screen[data-screen="subscription-detail"], .app-screen[data-screen="notifications"], .app-screen[data-screen="my-page"] { background: linear-gradient(rgba(250,251,255,.26),rgba(250,251,255,.20)), url("./assets/backgrounds/bg-service-default.webp") center 46%/cover no-repeat !important; }
.app-screen[data-screen="calendar"] { background: linear-gradient(rgba(248,251,255,.20),rgba(248,251,255,.16)), url("./assets/backgrounds/bg-service-payment-due.webp") center 48%/cover no-repeat !important; }
.app-screen[data-screen="benefits"] { background: linear-gradient(rgba(255,249,254,.22),rgba(252,250,255,.18)), url("./assets/backgrounds/bg-service-benefit.webp") center 48%/cover no-repeat !important; }

/* Landing approved composition: logo, air, character, CTA, login. */
.landing-scroll { grid-template-rows:auto 1fr auto auto; padding: max(20px,env(safe-area-inset-top)) clamp(18px,5vw,24px) max(14px,env(safe-area-inset-bottom)); }
.landing-brand { justify-content:center; min-height: 25vh; align-items:end; padding-bottom: 1.3vh; }
.landing-brand::after { content:"구독이 가벼워지는 하루"; position:absolute; top:23.5vh; left:0; right:0; text-align:center; color:#5264a5; font-family:Georgia,"Noto Serif KR",serif; font-size:clamp(13px,3.8vw,17px); font-weight:700; }
.landing-pages { height:auto; min-height:0; overflow:visible; }
.landing-page { height:100%; min-height:0; position:relative; }
.landing-page:nth-child(2), .landing-copy, .landing-feature-grid, .pager-dots { display:none !important; }
.landing-page .landing-character { position:absolute; left:50%; right:auto; top:5%; bottom:auto; width:min(82vw,350px); transform:translateX(-50%); opacity:1; mask-image:none; -webkit-mask-image:none; filter:drop-shadow(0 14px 22px rgba(80,75,143,.12)); }
.landing-actions { position:relative; z-index:4; margin-top:auto; }
.landing-actions .primary-button { height:clamp(52px,14.5vw,60px); border-radius:999px; background:linear-gradient(100deg,#6bcaf2 0%,#7398f3 53%,#a374ef 100%); box-shadow:0 10px 23px rgba(80,114,210,.22), inset 0 1px 0 rgba(255,255,255,.45); }
.landing-footer { margin-top:12px; color:#6075a7; font-size:clamp(11px,3vw,13px); }
.landing-footer button { color:#3558a2; font-weight:800; text-decoration:underline; }

/* Login approved composition: service logo + short wish, compact glass form, calm water-lily background. */
.login-screen .auth-header { min-height:clamp(180px,48vw,215px); }
.login-screen .brand-lockup { justify-content:center; width:100%; padding-top:1.5vh; }
.login-screen .brand-lockup .service-brand-logo { width:clamp(105px,31vw,132px); }
.login-screen .auth-avatar { display:none !important; }
.login-screen .auth-copy { position:absolute; top:clamp(93px,27vw,116px); left:12%; right:12%; max-width:none; margin:0; text-align:center; }
.login-screen .auth-copy h1 { font-family:Georgia,"Noto Serif KR",serif; font-size:clamp(16px,4.7vw,20px); font-weight:700; color:#405899; }
.login-screen .auth-copy h1 { font-size:0; }
.login-screen .auth-copy h1::before { content:"오늘도\A 가벼운 하루가 되길"; white-space:pre; font-size:clamp(16px,4.7vw,20px); line-height:1.5; }
.login-screen .auth-copy p { display:none; }
.auth-form { background:var(--re-glass); border:1px solid var(--re-border); border-radius:22px; box-shadow:var(--re-shadow); backdrop-filter:blur(16px); padding:clamp(13px,3.8vw,17px); }
.auth-form .field > span:first-child { display:none; }
.field input, .field select, .field textarea { min-height:52px; border-radius:15px; background:rgba(255,255,255,.74); border:1px solid rgba(120,151,205,.15); }
.login-screen .form-options { padding-inline:3px; }
.login-screen .primary-button { height:54px; border-radius:999px; }
.social-actions button { border-radius:18px; background:rgba(255,255,255,.82); box-shadow:0 6px 16px rgba(70,95,155,.08); }

/* Glass material shared by approved content screens. */
.panel,.welcome-card,.stat-card,.subscription-card,.benefit-card,.notification-card,.summary-row article,.capture-banner,.calendar-reminder-button,.production-state { background:var(--re-glass) !important; border:1px solid var(--re-border) !important; box-shadow:var(--re-shadow) !important; backdrop-filter:blur(15px); }
.app-header { background:transparent; }
.page-title h1,.section-heading h2,.welcome-card h1 { color:var(--re-ink); }

/* Home approved hierarchy: character hero + one strong monthly card + four shortcuts + upcoming payment. */
.home-content { padding-top:6px; }
.home-content .welcome-card { min-height:clamp(190px,54vw,235px); background:transparent !important; border:0 !important; box-shadow:none !important; backdrop-filter:none; overflow:visible; position:relative; padding:8px 8px 0; }
.home-content .welcome-card > div:first-child { position:relative; z-index:3; width:58%; }
.home-content .welcome-card h1 { font-size:clamp(20px,5.9vw,25px); line-height:1.3; }
.home-content .welcome-avatar { position:absolute; right:-4%; bottom:-6%; width:min(68vw,285px); height:min(68vw,285px); border:0; border-radius:0; background:transparent; overflow:visible; }
.home-content .welcome-avatar img { width:100%; height:100%; object-fit:contain; }
.home-content .welcome-note { position:absolute; right:3%; top:24%; width:35%; padding:10px 11px; border-radius:20px; background:rgba(255,255,255,.82); box-shadow:var(--re-shadow); color:#53699f; font-size:clamp(9px,2.7vw,11px); }
.home-content .stats-grid { grid-template-columns:1fr; }
.home-content .stats-grid .stat-card:first-child { min-height:116px; border-radius:22px; padding:18px 20px; }
.home-content .stats-grid .stat-card:first-child strong { font-size:clamp(27px,8vw,34px); }
.home-content .stats-grid .stat-card:not(:first-child) { display:none; }
.home-content .quick-services { display:block; padding:13px; }
.home-content .quick-services .section-heading { display:none; }
.home-content .quick-service-list { grid-template-columns:repeat(4,1fr); gap:9px; }
.home-content .quick-service-list button:nth-child(n+5) { display:none; }
.home-content .quick-service-list button { min-height:74px; border:0; border-radius:18px; background:rgba(255,255,255,.76); box-shadow:inset 0 1px 0 rgba(255,255,255,.8); }
.home-content .home-lower-grid,.home-content .quote-banner { display:none; }

/* Calendar approved hierarchy. */
.calendar-content .page-title { display:none; }
.calendar-content .full-calendar { margin-top:6px; border-radius:24px; padding:15px; }
.calendar-content .full-calendar header h2 { color:var(--re-ink); font-size:clamp(17px,4.8vw,20px); }
.calendar-content .summary-row { display:none; }
.calendar-content .dated-payments { border-radius:22px; margin-top:12px; }
.calendar-content .mini-quote { position:relative; min-height:78px; padding-left:86px; background:rgba(255,255,255,.80); border-radius:21px; }
.calendar-content .mini-quote::before { content:""; position:absolute; left:5px; bottom:-1px; width:82px; height:82px; background:url("./assets/characters/character-state-thinking.webp") center/contain no-repeat; }

/* Benefits approved hierarchy: one luminous hero card followed by compact cards. */
.benefits-content .page-title { margin-bottom:8px; }
.benefits-content .page-title .welcome-avatar { display:none; }
.benefits-content .benefit-list { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.benefits-content .benefit-card { min-width:0; border-radius:20px; padding:12px; }
.benefits-content .benefit-card:first-child { grid-column:1/-1; min-height:154px; background:linear-gradient(120deg,rgba(121,216,218,.78),rgba(255,255,255,.80) 58%,rgba(245,186,229,.72)) !important; }
.benefits-content .benefit-card:first-child h2 { font-size:clamp(17px,5vw,21px); }
.benefits-content .benefit-card:not(:first-child) p,.benefits-content .benefit-card:not(:first-child) small:last-child,.benefits-content .benefit-card:not(:first-child) button { display:none; }
.benefits-content .benefit-card:not(:first-child) { min-height:105px; }

/* Approved empty state: spacious world + thinking character + three gentle actions. */
.production-state:has(.state-character) { min-height:70vh; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding:24px 18px; background:linear-gradient(rgba(252,251,255,.46),rgba(252,251,255,.38)),url("./assets/backgrounds/bg-service-empty.webp") center/cover no-repeat !important; }
.production-state .state-character { width:min(68vw,280px); margin:-8px auto -12px; filter:drop-shadow(0 10px 18px rgba(84,76,140,.10)); }
.production-state .state-actions { display:grid; width:min(100%,340px); gap:9px; margin-top:16px; }
.production-state .state-actions button { min-height:48px; border-radius:18px; }

/* Permission onboarding shares the same RE world and thinking state. */
.payment-onboarding { position:fixed; inset:0; z-index:120; display:grid; place-items:center; padding:20px; background:rgba(244,247,255,.42); backdrop-filter:blur(14px); }
.payment-onboarding[hidden] { display:none; }
.payment-onboarding-card { width:min(100%,390px); max-height:90vh; overflow:auto; text-align:center; padding:18px 18px 16px; border-radius:28px; background:rgba(255,255,255,.91); border:1px solid rgba(255,255,255,.86); box-shadow:0 24px 55px rgba(58,78,142,.20),inset 0 1px 0 rgba(255,255,255,.95); }
.payment-onboarding-card img { width:min(62vw,245px); margin:-8px auto -10px; }
.payment-onboarding-card h2 { color:var(--re-ink); font-size:clamp(20px,5.8vw,24px); line-height:1.35; }
.payment-onboarding-card p { color:#536b9e; line-height:1.55; word-break:keep-all; }
.payment-onboarding-card small { display:block; margin:8px 0 16px; color:#8290af; line-height:1.5; }
.payment-onboarding-status { padding:10px 12px; border-radius:15px; background:#f4f7ff; color:#526aa1 !important; }
.payment-onboarding-card .primary-button { width:100%; height:52px; margin-top:8px; }
.payment-onboarding-card > .text-button { margin-top:11px; }

/* Android usable-frame proportional guardrails. */
.with-bottom-nav .screen-content { padding-bottom:calc(22px + env(safe-area-inset-bottom)); }
.with-bottom-nav .bottom-nav { margin-bottom:env(safe-area-inset-bottom); }
@media(max-width:340px){
  .home-content .welcome-card{min-height:178px}.home-content .welcome-avatar{width:64vw;height:64vw}.landing-brand{min-height:23vh}.landing-page .landing-character{width:78vw}
}
@media(max-height:720px){
  .landing-brand{min-height:21vh}.landing-brand::after{top:20vh}.landing-page .landing-character{width:min(67vw,285px);top:1%}.home-content .welcome-card{min-height:165px}.home-content .welcome-avatar{width:min(56vw,225px);height:min(56vw,225px)}
}
'''
styles.write_text(css)

# Version identity.
gradle = root / "android/app/build.gradle"
g = gradle.read_text().replace('versionCode 4','versionCode 5',1).replace('versionName "1.0.0-rc4"','versionName "1.0.0-rc5"',1)
gradle.write_text(g)

print("APK1 RC5 canonical assets + six-screen proportional design system applied")
