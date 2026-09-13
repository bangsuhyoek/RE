#!/usr/bin/env python3
from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else "/mnt/data/re_rc2_src")

def replace_once(path: Path, old: str, new: str, label: str):
    text = path.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"{label} target not found in {path}")
    path.write_text(text.replace(old, new, 1))

# Version/build identity.
index = root / "index.html"
text = index.read_text()
text = text.replace('content="apk1-release-candidate-1"', 'content="apk1-release-candidate-3"', 1)
index.write_text(text)

for rel in ["release-config.js", "release-manifest.json"]:
    p = root / rel
    t = p.read_text()
    t = t.replace("apk1-release-candidate-1", "apk1-release-candidate-3")
    p.write_text(t)

# Keep the latest 2-page product structure, but remove forced copy breaks and make
# feature cards use the final visual language (large line icon, bold title, supporting copy, chevron).
text = index.read_text()
text = text.replace(
    '이번 달부터 앞으로 1년까지,<br /><span>구독 흐름을 함께 정리해요.</span>',
    '이번 달부터 앞으로 1년까지, <span>구독 흐름을 함께 정리해요.</span>',
    1,
)
text = text.replace(
    '놓치기 쉬운 변화를,<br /><span>RE.가 먼저 챙겨드려요.</span>',
    '놓치기 쉬운 변화를, <span>RE.가 먼저 챙겨드려요.</span>',
    1,
)
replacements = {
    '<article><svg><use href="#i-chart" /></svg><div><strong>월간·연간 지출</strong><span>예상과 결제 완료를 따로 살펴봐요.</span></div></article>':
    '<article><span class="landing-feature-icon"><svg><use href="#i-chart" /></svg></span><div><strong>월간·연간 지출</strong><span>예상과 결제 완료를 따로 살펴봐요.</span></div><span class="landing-feature-chevron" aria-hidden="true">›</span></article>',
    '<article><svg><use href="#i-calendar" /></svg><div><strong>결제 캘린더·직접 알림</strong><span>예정·완료·변경과 원하는 날짜를 함께 모아요.</span></div></article>':
    '<article><span class="landing-feature-icon"><svg><use href="#i-calendar" /></svg></span><div><strong>결제 캘린더·직접 알림</strong><span>예정·완료·변경과 원하는 날짜를 함께 모아요.</span></div><span class="landing-feature-chevron" aria-hidden="true">›</span></article>',
    '<article><svg><use href="#i-bell" /></svg><div><strong>알림 기반 결제 입력</strong><span>원문은 남기지 않고 확인할 후보만 보여드려요.</span></div></article>':
    '<article><span class="landing-feature-icon"><svg><use href="#i-bell" /></svg></span><div><strong>알림 기반 결제 입력</strong><span>원문은 남기지 않고 확인할 후보만 보여드려요.</span></div><span class="landing-feature-chevron" aria-hidden="true">›</span></article>',
    '<article><svg><use href="#i-gift" /></svg><div><strong>가격 변화·공식 소식·혜택</strong><span>프로모션 종료, GPT 모델 업데이트, 절약 혜택을 모아요.</span></div></article>':
    '<article><span class="landing-feature-icon"><svg><use href="#i-gift" /></svg></span><div><strong>가격 변화·공식 소식·혜택</strong><span>프로모션 종료, GPT 모델 업데이트, 절약 혜택을 모아요.</span></div><span class="landing-feature-chevron" aria-hidden="true">›</span></article>',
}
for old, new in replacements.items():
    if old in text:
        text = text.replace(old, new, 1)
index.write_text(text)

# Internal APK legal documents are real packaged documents with an explicit version/effective date.
# Production safety remains in release-preflight: production requires HTTPS env URLs.
release_config = root / "release-config.js"
t = release_config.read_text()
t = t.replace(
    'terms: Object.freeze({ url: "", version: "", effectiveDate: "" }),\n    privacy: Object.freeze({ url: "", version: "", effectiveDate: "" }),',
    'terms: Object.freeze({ url: "./legal/terms.html", version: "2026-09", effectiveDate: "2026-09-12" }),\n    privacy: Object.freeze({ url: "./legal/privacy.html", version: "2026-09", effectiveDate: "2026-09-12" }),',
    1,
)
release_config.write_text(t)

integration = root / "src/re-integration.js"
t = integration.read_text()
t = t.replace(
    'const localTermsUrl = import.meta.env.DEV ? "./legal/terms.html" : "";\nconst localPrivacyUrl = import.meta.env.DEV ? "./legal/privacy.html" : "";\nconst localLegalVersion = import.meta.env.DEV ? "draft-2026-09" : "";\nconst localLegalEffectiveDate = import.meta.env.DEV ? "2026-09-12" : "";',
    'const localTermsUrl = "./legal/terms.html";\nconst localPrivacyUrl = "./legal/privacy.html";\nconst localLegalVersion = "2026-09";\nconst localLegalEffectiveDate = "2026-09-12";',
    1,
)
t = t.replace(
    'emailRedirectTo: Capacitor.isNativePlatform() ? "reapp://auth/callback" : window.location.origin,',
    'emailRedirectTo: Capacitor.isNativePlatform() ? nativeAuthCallbackUrl : window.location.origin,',
    1,
)
integration.write_text(t)

# Google login should not be blocked by signup legal-consent validation; Google registration still is.
app = root / "app.js"
t = app.read_text()
old = '''    const terms = getCompleteLegalDocument("terms");
    const privacy = getCompleteLegalDocument("privacy");
    if (!terms || !privacy) {
      setFormStatus(form, "약관 주소·버전·시행일이 연결되기 전에는 Google 계정을 사용할 수 없어요.", "error");
      return;
    }
    if (form.dataset.authForm === "register") {
      const termsConsent = form.elements.namedItem("consent-terms");
      const privacyConsent = form.elements.namedItem("consent-privacy");
'''
new = '''    const isRegistration = form.dataset.authForm === "register";
    const terms = isRegistration ? getCompleteLegalDocument("terms") : null;
    const privacy = isRegistration ? getCompleteLegalDocument("privacy") : null;
    if (isRegistration && (!terms || !privacy)) {
      setFormStatus(form, "약관 주소·버전·시행일이 연결되기 전에는 Google 가입을 시작할 수 없어요.", "error");
      return;
    }
    if (isRegistration) {
      const termsConsent = form.elements.namedItem("consent-terms");
      const privacyConsent = form.elements.namedItem("consent-privacy");
'''
if old not in t:
    raise SystemExit("Google legal gate target missing")
t = t.replace(old, new, 1)
old2 = '''        legal: {
          terms: { version: terms.version, effectiveDate: terms.effectiveDate },
          privacy: { version: privacy.version, effectiveDate: privacy.effectiveDate },
        },
'''
new2 = '''        legal: isRegistration ? {
          terms: { version: terms.version, effectiveDate: terms.effectiveDate },
          privacy: { version: privacy.version, effectiveDate: privacy.effectiveDate },
        } : undefined,
'''
if old2 not in t:
    raise SystemExit("Google legal payload target missing")
t=t.replace(old2,new2,1)
app.write_text(t)

# Internal-test preflight accepts packaged reviewed documents; production still requires public HTTPS URLs.
preflight = root / "scripts/release-preflight.mjs"
t = preflight.read_text()
t = t.replace(
    'pass(integration.includes(\'import.meta.env.DEV ? "./legal/terms.html" : ""\') && integration.includes(\'import.meta.env.DEV ? "./legal/privacy.html" : ""\'), "운영 빌드에서는 공개 법률 URL이 없을 때 로컬 초안으로 가입을 허용하면 안 됩니다.");',
    'pass(integration.includes(\'const localTermsUrl = "./legal/terms.html"\') && integration.includes(\'const localPrivacyUrl = "./legal/privacy.html"\'), "내부 APK에 버전이 고정된 법률 문서가 포함되어야 합니다.");',
    1,
)
needle = 'if (target === "internal-test") {\n'
insert = '''if (target === "internal-test") {\n  pass(/^\\.\\/legal\\/terms\\.html$/.test(config.legal?.terms?.url || "") && /^\\.\\/legal\\/privacy\\.html$/.test(config.legal?.privacy?.url || ""), "내부 APK 약관 주소가 번들 문서에 연결되어야 합니다.");\n  pass(config.legal?.terms?.version === "2026-09" && config.legal?.privacy?.version === "2026-09", "내부 APK 약관 버전이 연결되어야 합니다.");\n  pass(config.legal?.terms?.effectiveDate === "2026-09-12" && config.legal?.privacy?.effectiveDate === "2026-09-12", "내부 APK 약관 시행일이 연결되어야 합니다.");\n'''
if needle in t and '내부 APK 약관 주소' not in t:
    t=t.replace(needle,insert,1)
env_marker = '    pass(/^https:\\/\\/.+\\.supabase\\.co$/i.test(env.VITE_SUPABASE_URL || ""), "실제 Supabase URL이 필요합니다.");\n'
env_extra = env_marker + '    pass(/^https:\\/\\//i.test(env.VITE_TERMS_URL || ""), "공개 이용약관 HTTPS URL이 필요합니다.");\n    pass(/^https:\\/\\//i.test(env.VITE_PRIVACY_URL || ""), "공개 개인정보처리방침 HTTPS URL이 필요합니다.");\n'
if env_marker in t and '공개 이용약관 HTTPS URL이 필요합니다.' not in t:
    t=t.replace(env_marker,env_extra,1)
preflight.write_text(t)

# Update source-contract test from old dev-only rule to the internal-vs-production boundary.
test_file = root / "tests/release-contract.test.mjs"
t = test_file.read_text()
old = '''test("운영 빌드는 승인된 법률 URL이 없으면 가입을 차단한다", () => {
  const integration = read("src/re-integration.js");
  assert.match(integration, /import\\.meta\\.env\\.DEV \\? "\\.\\/legal\\/terms\\.html" : ""/);
  assert.match(integration, /import\\.meta\\.env\\.DEV \\? "\\.\\/legal\\/privacy\\.html" : ""/);
  assert.match(read("app.js"), /약관 주소·버전·시행일이 모두 연결되기 전에는 가입할 수 없어요/);
});
'''
new = '''test("내부 APK는 버전이 고정된 약관을 연결하고 production은 공개 URL을 요구한다", () => {
  const integration = read("src/re-integration.js");
  const config = read("release-config.js");
  const preflight = read("scripts/release-preflight.mjs");
  assert.match(integration, /const localTermsUrl = "\\.\\/legal\\/terms\\.html"/);
  assert.match(integration, /const localPrivacyUrl = "\\.\\/legal\\/privacy\\.html"/);
  assert.match(config, /version: "2026-09"/);
  assert.match(config, /effectiveDate: "2026-09-12"/);
  assert.match(preflight, /공개 이용약관 HTTPS URL이 필요합니다/);
  assert.match(preflight, /공개 개인정보처리방침 HTTPS URL이 필요합니다/);
  assert.match(read("app.js"), /약관 주소·버전·시행일이 모두 연결되기 전에는 가입할 수 없어요/);
});
'''
if old not in t:
    raise SystemExit("release legal contract test target missing")
t=t.replace(old,new,1)
test_file.write_text(t)

# Version code/name.
gradle = root / "android/app/build.gradle"
t = gradle.read_text()
t=t.replace('versionCode 2','versionCode 3',1)
t=t.replace('versionName "1.0.0-rc2"','versionName "1.0.0-rc3"',1)
gradle.write_text(t)

# Full visual alignment layer. Latest functional structure wins; this layer translates
# the final 852x1847 visual proportions into responsive mobile proportions.
styles = root / "styles.css"
css = styles.read_text()
marker = "/* APK1 RC3: final-reference proportional refinement. */"
if marker not in css:
    css += r'''

/* APK1 RC3: final-reference proportional refinement. */
:root {
  --ref-side: clamp(14px, 4.7vw, 20px);
  --ref-panel-radius: clamp(16px, 5.1vw, 22px);
  --ref-card-gap: clamp(8px, 2.6vw, 12px);
}

.auth-screen {
  background: linear-gradient(rgba(250,253,255,.04), rgba(244,251,255,.04)), url("./assets/raster/bg-waterlily-auth.webp") center 42% / cover no-repeat;
}
.app-screen[data-screen="home"] { background: linear-gradient(rgba(247,252,255,.08),rgba(247,252,255,.06)), url("./assets/raster/bg-waterlily-home.webp") center 42% / cover no-repeat; }
.app-screen[data-screen="calendar"] { background: linear-gradient(rgba(247,252,255,.08),rgba(247,252,255,.06)), url("./assets/raster/bg-waterlily-calendar.webp") center 42% / cover no-repeat; }
.app-screen[data-screen="subscriptions"],
.app-screen[data-screen="subscription-detail"],
.app-screen[data-screen="benefits"],
.app-screen[data-screen="notifications"],
.app-screen[data-screen="my-page"] { background: linear-gradient(rgba(247,252,255,.08),rgba(247,252,255,.06)), url("./assets/raster/bg-waterlily-content.webp") center 42% / cover no-repeat; }
.auth-screen::before, .auth-screen::after,
.app-bg::before, .app-bg::after { display: none; }

.landing-scroll {
  display: grid;
  grid-template-rows: auto minmax(0,1fr) auto auto auto;
  height: 100%;
  min-height: 100%;
  padding: max(18px, env(safe-area-inset-top)) var(--ref-side) max(12px, env(safe-area-inset-bottom));
}
.landing-brand { min-height: clamp(44px, 12vw, 54px); }
.landing-brand .brand-mark { width: clamp(32px, 9vw, 39px); height: clamp(32px, 9vw, 39px); flex-basis: clamp(32px, 9vw, 39px); }
.landing-brand strong { font-size: clamp(27px, 8.1vw, 35px); }
.landing-pages { min-height: 0; height: 100%; }
.landing-page { min-width: 100%; height: 100%; padding: 2px 0 0; }
.landing-page .landing-copy {
  width: min(57%, 244px);
  margin-top: clamp(8px, 2.5vh, 20px);
  text-shadow: 0 1px 12px rgba(255,255,255,.96);
}
.landing-copy .eyebrow { margin-bottom: 6px; font-size: clamp(10px, 2.8vw, 12px); }
.landing-page .landing-copy h1,
.landing-page .landing-copy h2 {
  max-width: 100%;
  font-family: "Noto Sans KR", Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: clamp(20px, 5.85vw, 25px);
  font-weight: 850;
  line-height: 1.32;
  letter-spacing: -.045em;
  text-wrap: balance;
  word-break: keep-all;
}
.landing-page .landing-copy h1 span,
.landing-page .landing-copy h2 span { display: inline; color: #173a82; }
.landing-page .landing-copy > p:last-child {
  max-width: 235px;
  margin-top: 8px;
  color: #5675a8;
  font-size: clamp(10px, 2.75vw, 12px);
  line-height: 1.52;
  word-break: keep-all;
}
.landing-page .landing-character {
  right: -16px;
  bottom: 27%;
  width: min(57vw, 244px);
  opacity: 1;
  -webkit-mask-image: radial-gradient(ellipse 66% 72% at 62% 52%, #000 66%, transparent 97%);
  mask-image: radial-gradient(ellipse 66% 72% at 62% 52%, #000 66%, transparent 97%);
}
.landing-page .landing-character--second {
  right: 0;
  bottom: 27%;
  width: min(42vw, 180px);
  -webkit-mask-image: none;
  mask-image: none;
}
.landing-feature-grid {
  align-self: end;
  width: 100%;
  gap: clamp(8px, 2.3vw, 10px);
  margin-top: auto;
  margin-bottom: 4px;
  padding-top: clamp(138px, 35vh, 255px);
}
.landing-feature-grid article {
  grid-template-columns: clamp(46px, 13vw, 56px) minmax(0,1fr) 28px;
  gap: clamp(8px, 2.5vw, 11px);
  min-height: clamp(72px, 19vw, 82px);
  padding: clamp(8px, 2.2vw, 10px) clamp(10px, 3vw, 14px);
  border: 1px solid rgba(255,255,255,.84);
  border-radius: clamp(17px, 5vw, 22px);
  background: rgba(255,255,255,.88);
  box-shadow: 0 8px 24px rgba(38,83,144,.12);
  backdrop-filter: blur(10px);
}
.landing-feature-icon {
  display: grid;
  place-items: center;
  width: clamp(46px, 13vw, 56px);
  height: clamp(46px, 13vw, 56px);
  border-radius: 50%;
  color: #4b82db;
  background: radial-gradient(circle at 38% 32%, rgba(255,255,255,.98), rgba(229,243,255,.9));
  box-shadow: inset 0 0 0 1px rgba(86,145,217,.10);
}
.landing-feature-icon svg { width: clamp(30px, 8.8vw, 38px); height: clamp(30px, 8.8vw, 38px); stroke-width: 1.9; }
.landing-feature-grid strong,
.landing-feature-grid span { display: block; }
.landing-feature-grid strong {
  color: #173a82;
  font-family: "Noto Sans KR", Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: clamp(13px, 3.75vw, 16px);
  font-weight: 850;
  line-height: 1.25;
  letter-spacing: -.035em;
  word-break: keep-all;
}
.landing-feature-grid article > div > span {
  margin-top: 5px;
  color: #637aa3;
  font-size: clamp(10px, 2.8vw, 12px);
  line-height: 1.42;
  word-break: keep-all;
}
.landing-feature-chevron {
  display: grid !important;
  place-items: center;
  align-self: center;
  width: 28px;
  height: 28px;
  color: #1762e9;
  font-size: 28px;
  font-weight: 400;
  line-height: 1;
}
.pager-dots { gap: 0; margin: 0; min-height: 34px; align-items: center; }
.pager-dots button {
  position: relative;
  appearance: none;
  -webkit-appearance: none;
  width: 44px;
  height: 44px;
  min-height: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent !important;
  transform: none !important;
  filter: none !important;
}
.pager-dots button::before {
  content: "";
  position: absolute;
  inset: 0;
  width: 8px;
  height: 8px;
  margin: auto;
  border-radius: 50%;
  background: #b8c8e6;
  transform: none !important;
}
.pager-dots button.active::before {
  width: 10px;
  height: 10px;
  background: #1762e9;
  box-shadow: 0 0 0 2px rgba(23,98,233,.08);
  transform: none !important;
}
.landing-actions button { height: clamp(48px, 13vw, 56px); font-size: clamp(15px, 4.2vw, 18px); }
.landing-actions .primary-button { justify-content: center; gap: 0; position: relative; }
.landing-actions .primary-button span { position: absolute; right: 18px; }
.landing-footer { margin: 6px 0 0; font-family: "Noto Sans KR", Pretendard, sans-serif; font-size: clamp(9px, 2.4vw, 11px); }

.auth-scroll { padding: max(18px, env(safe-area-inset-top)) var(--ref-side) max(16px, env(safe-area-inset-bottom)); }
.auth-header { min-height: clamp(250px, 68vw, 292px); }
.auth-header--compact { min-height: clamp(155px, 43vw, 185px); }
.auth-header .brand-lockup--small { position: relative; z-index: 4; }
.login-screen .auth-copy {
  max-width: 48%;
  margin-top: clamp(62px, 18vw, 80px);
  margin-bottom: auto;
  padding-bottom: 0;
}
.login-screen .auth-copy h1 { font-size: clamp(22px, 6.6vw, 28px); line-height: 1.25; word-break: keep-all; }
.login-screen .auth-copy p { max-width: 150px; font-size: clamp(10px, 2.9vw, 12px); word-break: keep-all; }
.login-screen .auth-avatar {
  right: -18px;
  top: clamp(42px, 11vw, 52px);
  bottom: auto;
  width: min(67vw, 286px);
  height: min(67vw, 286px);
  overflow: visible;
  border-radius: 0;
  -webkit-mask-image: radial-gradient(ellipse 66% 71% at 60% 50%, #000 68%, transparent 97%);
  mask-image: radial-gradient(ellipse 66% 71% at 60% 50%, #000 68%, transparent 97%);
}
.login-screen .auth-avatar img { object-fit: contain; object-position: center; }
.register-screen .auth-copy { max-width: 64%; margin-top: auto; padding-bottom: 8px; }
.register-screen .auth-copy h1 { font-size: clamp(22px, 6.2vw, 26px); }
.register-screen .auth-avatar {
  right: -8px;
  bottom: -4px;
  width: min(43vw, 184px);
  height: min(40vw, 172px);
  overflow: visible;
  border-radius: 0;
  -webkit-mask-image: none;
  mask-image: none;
}
.register-screen .auth-avatar img { object-fit: contain; object-position: center bottom; }
.auth-form {
  gap: 9px;
  padding: clamp(13px, 3.7vw, 16px);
  border-radius: var(--ref-panel-radius);
  background: rgba(255,255,255,.90);
  box-shadow: 0 10px 28px rgba(39,78,136,.12);
  backdrop-filter: blur(10px);
}
.field { font-size: clamp(11px, 3vw, 13px); }
.field input, .field select, .field textarea { font-size: clamp(12px, 3.4vw, 14px); }
.auth-form .primary-button { height: clamp(46px, 12.3vw, 52px); }
.divider { margin-top: 12px; margin-bottom: 9px; }
.social-actions button { min-height: 48px; font-size: clamp(11px, 3vw, 13px); }
.provider-legal { font-size: clamp(8px, 2.15vw, 9px); }
.auth-foot { margin-top: 8px; font-size: clamp(9px, 2.5vw, 11px); }
.legal-consent { background: rgba(250,253,255,.84); }

.screen-content { padding-inline: var(--ref-side); }
.panel, .welcome-card, .stat-card, .subscription-list > article, .benefit-list > article, .notification-list > article,
.settings-group { background-color: rgba(255,255,255,.90); backdrop-filter: blur(10px); }
.page-title { margin-top: 5px; margin-bottom: 10px; }
.page-title h1 {
  font-size: clamp(21px, 6vw, 25px);
  line-height: 1.18;
  word-break: keep-all;
}
.page-title p { font-size: clamp(10px, 2.9vw, 12px); word-break: keep-all; }
.app-header { min-height: clamp(48px, 13vw, 56px); }
.welcome-card { border-radius: var(--ref-panel-radius); }
.section-heading h2 { word-break: keep-all; }

@media (max-width: 350px) {
  .landing-page .landing-copy { width: 60%; }
  .landing-page .landing-copy h1,
  .landing-page .landing-copy h2 { font-size: 19px; }
  .landing-page .landing-character { right: -20px; bottom: 29%; width: 56vw; opacity: 1; }
  .landing-page .landing-character--second { right: 0; bottom: 29%; width: 40vw; }
  .landing-feature-grid { padding-top: 124px; gap: 6px; }
  .landing-feature-grid article { min-height: 66px; padding-block: 7px; }
  .landing-feature-grid strong { font-size: 12px; }
  .landing-feature-grid article > div > span { font-size: 9.5px; }
  .auth-header { min-height: 230px; }
  .auth-header--compact { min-height: 146px; }
}

@media (max-height: 720px) {
  .landing-page .landing-copy { margin-top: 2px; }
  .landing-page .landing-character { bottom: 30%; width: min(50vw, 215px); }
  .landing-page .landing-character--second { bottom: 30%; width: min(38vw, 165px); }
  .landing-feature-grid { padding-top: 112px; gap: 6px; }
  .landing-feature-grid article { min-height: 62px; }
  .pager-dots { min-height: 30px; }
  .landing-actions button { height: 46px; }
  .landing-footer { margin-top: 2px; }
  .auth-header { min-height: 215px; }
  .auth-header--compact { min-height: 136px; }
  .auth-form { gap: 7px; }
  .divider { margin-top: 8px; margin-bottom: 6px; }
}
'''
styles.write_text(css)

print("APK1 RC3 implementation patch applied")
