#!/usr/bin/env python3
from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else "app")


def replace_once(path: Path, old: str, new: str, label: str):
    text = path.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"{label} target not found in {path}")
    path.write_text(text.replace(old, new, 1))

# 1) In-app refresh screens: keep the two distinct screens, but align to approved visual hierarchy.
index = root / "index.html"
replace_once(
    index,
    '''        <div class="splash-logo-art" aria-hidden="true"><img src="./assets/raster/logo-transparent-derived.png" alt="" /></div>\n        <h1 id="splash-logo-title" class="visually-hidden">RE.</h1>\n        <p class="splash-tagline">가볍게 떠오르는 구독 관리</p>''',
    '''        <div class="splash-logo-art" aria-hidden="true"><img src="./assets/raster/logo-transparent-derived.png" alt="" /></div>\n        <h1 id="splash-logo-title" class="visually-hidden">RE.</h1>''',
    "logo splash copy",
)
replace_once(
    index,
    '''        <div class="brand-lockup brand-lockup--splash"><span class="brand-mark">◌</span><strong>RE.</strong></div>\n        <h1 id="splash-character-title">가볍게 떠오르는 구독 관리</h1>''',
    '''        <div class="splash-character-logo" aria-hidden="true"><img src="./assets/raster/logo-transparent-derived.png" alt="" /></div>\n        <h1 id="splash-character-title">가볍게 떠오르는 구독 관리 <span aria-hidden="true">✦</span></h1>''',
    "character splash logo",
)

# 2) Restore the original water-lily imagery as the real screen background, not a hidden negative-z pseudo layer.
styles = root / "styles.css"
css = styles.read_text()
marker = "/* APK1 RC2: original water-lily background + approved intro/splash/landing proportions. */"
if marker not in css:
    css += r'''

/* APK1 RC2: original water-lily background + approved intro/splash/landing proportions. */
.splash-screen,
.splash-character-screen {
  background: linear-gradient(rgba(255,255,255,.08), rgba(246,251,255,.06)), url("./assets/raster/bg-waterlily-splash.webp") center 43% / cover no-repeat;
}
.landing-screen {
  background: linear-gradient(rgba(250,253,255,.12), rgba(247,252,255,.08)), url("./assets/raster/bg-waterlily-landing.webp") center 45% / cover no-repeat;
}
.splash-screen::before, .splash-screen::after,
.splash-character-screen::before, .splash-character-screen::after,
.landing-screen::before, .landing-screen::after { display: none; }

.splash-logo-art {
  width: min(64vw, 250px);
  height: auto;
  aspect-ratio: 1045 / 1505;
  margin-top: -2vh;
  filter: drop-shadow(0 10px 18px rgba(55,100,145,.08));
}
.splash-character-screen {
  padding: max(25px, env(safe-area-inset-top)) 18px 0;
  overflow: hidden;
}
.splash-character-logo {
  position: relative;
  z-index: 3;
  width: min(39vw, 152px);
  aspect-ratio: 1045 / 1505;
  margin: -18px auto -50px;
}
.splash-character-logo img { width: 100%; height: 100%; object-fit: contain; }
.splash-character-screen h1 {
  position: relative;
  z-index: 3;
  margin: 0;
  padding: 0 8px;
  color: #174a96;
  font-size: clamp(19px, 5.7vw, 24px);
  text-shadow: 0 1px 12px rgba(255,255,255,.92);
}
.splash-character {
  left: 50%;
  bottom: -2.5%;
  width: min(116vw, 465px);
  max-width: none;
  filter: drop-shadow(0 18px 18px rgba(64,51,110,.16));
}

/* Keep the approved two-page landing and two dots, while restoring the original art hierarchy. */
.landing-scroll {
  padding: max(18px, env(safe-area-inset-top)) 18px max(14px, env(safe-area-inset-bottom));
}
.landing-brand {
  min-height: 38px;
  text-shadow: 0 1px 10px rgba(255,255,255,.84);
}
.landing-brand strong { font-size: 28px; }
.landing-pages { min-height: 0; }
.landing-page { padding: 5px 1px 2px; }
.landing-page .landing-copy {
  width: min(67%, 250px);
  margin-top: 7px;
  text-shadow: 0 1px 10px rgba(255,255,255,.90);
}
.landing-copy .eyebrow { margin-bottom: 5px; color: #2767b8; }
.landing-page .landing-copy h1,
.landing-page .landing-copy h2 {
  font-size: clamp(21px, 6.35vw, 28px);
  line-height: 1.29;
}
.landing-page .landing-copy > p:last-child {
  max-width: 250px;
  margin-top: 7px;
  color: #5875a5;
  font-size: clamp(10px, 3vw, 12px);
  line-height: 1.45;
}
.landing-feature-grid {
  width: min(86%, 314px);
  gap: 7px;
  margin-top: 10px;
}
.landing-feature-grid article {
  grid-template-columns: 42px minmax(0,1fr);
  min-height: 61px;
  padding: 7px 10px;
  background: rgba(255,255,255,.86);
  border-radius: 16px;
}
.landing-feature-grid strong { font-size: 12px; }
.landing-feature-grid span { font-size: 10px; }
.landing-page .landing-character {
  top: auto;
  right: -45px;
  bottom: -18px;
  width: min(60vw, 255px);
  opacity: .98;
  -webkit-mask-image: radial-gradient(ellipse 62% 68% at 64% 52%, #000 63%, transparent 95%);
  mask-image: radial-gradient(ellipse 62% 68% at 64% 52%, #000 63%, transparent 95%);
}
.landing-page .landing-character--second {
  right: -12px;
  bottom: -4px;
  width: min(44vw, 185px);
  -webkit-mask-image: none;
  mask-image: none;
}
.pager-dots { margin: 5px 0 4px; }
.landing-actions button { height: 48px; min-height: 44px; border-radius: 999px; }
.landing-footer {
  margin-top: 5px;
  text-shadow: 0 1px 8px rgba(255,255,255,.95);
}
@media (max-width: 340px) {
  .landing-scroll { padding-left: 14px; padding-right: 14px; }
  .landing-page .landing-copy { width: min(70%, 225px); }
  .landing-page .landing-copy h1,
  .landing-page .landing-copy h2 { font-size: 20px; }
  .landing-feature-grid { width: 88%; gap: 5px; margin-top: 7px; }
  .landing-feature-grid article { min-height: 57px; padding-top: 5px; padding-bottom: 5px; }
  .landing-page .landing-character { right: -56px; width: 65vw; }
}
'''
    styles.write_text(css)

# 3) Normalize native Google OAuth/password-recovery callbacks around one custom scheme and fail closed on OAuth errors.
integration = root / "src/re-integration.js"
text = integration.read_text()
anchor = 'const pendingOAuthModeKey = "re.auth.pending-oauth-mode";'
if 'const nativeAuthCallbackUrl' not in text:
    if anchor not in text:
        raise SystemExit("native auth callback anchor missing")
    text = text.replace(anchor, anchor + '\nconst nativeAuthCallbackUrl = "reapp://auth/callback";', 1)
text = text.replace(
    'redirectTo: Capacitor.isNativePlatform() ? "reapp://auth/callback" : window.location.origin,',
    'redirectTo: Capacitor.isNativePlatform() ? nativeAuthCallbackUrl : window.location.origin,',
    1,
)
text = text.replace(
    'redirectTo: Capacitor.isNativePlatform() ? "reapp://auth/callback?mode=recovery" : `${window.location.origin}?screen=login&mode=recovery`,',
    'redirectTo: Capacitor.isNativePlatform() ? `${nativeAuthCallbackUrl}?mode=recovery` : `${window.location.origin}?screen=login&mode=recovery`,',
    1,
)
old = '''    const code = url.searchParams.get("code");
    if (code) checked(await requireClient().auth.exchangeCodeForSession(code));
    const recovery = url.searchParams.get("mode") === "recovery";
'''
new = '''    const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");
    if (oauthError) throw new Error(oauthError);
    const code = url.searchParams.get("code");
    if (!code) throw new Error("OAuth 인증 코드가 없습니다.");
    checked(await requireClient().auth.exchangeCodeForSession(code));
    const recovery = url.searchParams.get("mode") === "recovery";
'''
if new not in text:
    if old not in text:
        raise SystemExit("OAuth callback exchange target missing")
    text = text.replace(old, new, 1)
integration.write_text(text)

# 4) Android native launch screen becomes neutral so it no longer duplicates the in-app RE logo splash.
styles_xml = root / "android/app/src/main/res/values/styles.xml"
replace_once(
    styles_xml,
    '''    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">\n        <item name="android:background">@drawable/splash</item>\n    </style>''',
    '''    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">\n        <item name="windowSplashScreenBackground">#F4FAFF</item>\n        <item name="windowSplashScreenAnimatedIcon">@drawable/transparent_splash_icon</item>\n        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>\n    </style>''',
    "native launch theme",
)

transparent = root / "android/app/src/main/res/drawable/transparent_splash_icon.xml"
transparent.write_text('''<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="1dp"
    android:height="1dp"
    android:viewportWidth="1"
    android:viewportHeight="1">
    <path android:fillColor="#00000000" android:pathData="M0,0h1v1h-1z" />
</vector>
''')

activity = root / "android/app/src/main/java/kr/co/re/subscription/MainActivity.java"
text = activity.read_text()
if 'import androidx.core.splashscreen.SplashScreen;' not in text:
    anchor = 'import androidx.core.view.WindowInsetsCompat;'
    if anchor not in text:
        raise SystemExit("SplashScreen import anchor missing")
    text = text.replace(anchor, anchor + '\nimport androidx.core.splashscreen.SplashScreen;', 1)
if 'SplashScreen.installSplashScreen(this);' not in text:
    anchor = '    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(PaymentCapturePlugin.class);'
    if anchor not in text:
        raise SystemExit("MainActivity onCreate anchor missing")
    text = text.replace(
        anchor,
        '    public void onCreate(Bundle savedInstanceState) {\n        SplashScreen.installSplashScreen(this);\n        registerPlugin(PaymentCapturePlugin.class);',
        1,
    )
activity.write_text(text)

# 5) Mark the resulting APK candidate as RC2.
gradle = root / "android/app/build.gradle"
text = gradle.read_text()
if 'versionCode 2' not in text:
    if 'versionCode 1' not in text:
        raise SystemExit("versionCode target missing")
    text = text.replace('versionCode 1', 'versionCode 2', 1)
if 'versionName "1.0.0-rc2"' not in text:
    if 'versionName "1.0.0-rc1"' not in text:
        raise SystemExit("versionName target missing")
    text = text.replace('versionName "1.0.0-rc1"', 'versionName "1.0.0-rc2"', 1)
gradle.write_text(text)

print("APK1 RC2 reference alignment patch applied")
