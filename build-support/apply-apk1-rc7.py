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
        raise SystemExit(f"RC7 target missing: {label}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")

replace_once(
    "src/re-integration.js",
    'const nativeAuthCallbackUrl = "reapp://auth/callback";\nlet rememberSession = (() => {',
    '''const nativeAuthCallbackUrl = "reapp://auth/callback";
const nativeOAuthReturnGraceMs = 15000;
let nativeOAuthCallbackInFlight = false;
let nativeOAuthCallbackSeenAt = 0;
let nativeOAuthResumeTimer = null;

function cancelNativeOAuthResumeTimer() {
  if (nativeOAuthResumeTimer !== null) {
    window.clearTimeout(nativeOAuthResumeTimer);
    nativeOAuthResumeTimer = null;
  }
}

let rememberSession = (() => {''',
    "native OAuth callback state",
)

replace_once(
    "src/re-integration.js",
    '''  const isRegistration = mode === "register";
  storePendingOAuthMode(mode);''',
    '''  const isRegistration = mode === "register";
  cancelNativeOAuthResumeTimer();
  nativeOAuthCallbackInFlight = false;
  nativeOAuthCallbackSeenAt = 0;
  storePendingOAuthMode(mode);''',
    "OAuth start reset",
)

old_callback = '''window.addEventListener("re:auth-callback", async (event) => {
  try {
    const url = new URL(event.detail?.url || "");
    const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
    const oauthErrorCode = url.searchParams.get("error_code") || url.searchParams.get("error") || fragment.get("error_code") || fragment.get("error");
    const oauthError = url.searchParams.get("error_description") || fragment.get("error_description") || oauthErrorCode;
    if (oauthError) {
      const failure = new Error(oauthError);
      failure.code = oauthErrorCode || "oauth_callback_failed";
      throw failure;
    }
    const code = url.searchParams.get("code") || fragment.get("code");
    if (!code) {
      const failure = new Error("OAuth 인증 코드가 없습니다.");
      failure.code = "oauth_code_missing";
      throw failure;
    }
    checked(await requireClient().auth.exchangeCodeForSession(code));
    const recovery = url.searchParams.get("mode") === "recovery";
    const hasPendingConsent = Boolean(readPendingLegalAcceptance());
    if (!recovery && hasPendingConsent) await recordPendingLegalAcceptances();
    else if (!recovery && !(await hasCurrentLegalAcceptances())) {
      await requireClient().auth.signOut({ scope: "local" });
      await Browser.close().catch(() => {});
      clearPendingOAuthMode();
      window.location.replace("?screen=register&socialConsent=required");
      return;
    }
    clearPendingOAuthMode();
    await Browser.close().catch(() => {});
    if (recovery) {
      window.REPasswordRecoveryPending = true;
      window.dispatchEvent(new CustomEvent("re:password-recovery"));
    } else window.location.replace("?screen=home&paymentOnboarding=1");
  } catch (error) {
    await supabase?.auth.signOut({ scope: "local" }).catch(() => {});
    const code = String(error?.code || "oauth_callback_failed").replace(/[^a-z0-9_-]/gi, "").slice(0, 64) || "oauth_callback_failed";
    clearPendingOAuthMode();
    clearPendingLegalAcceptance();
    window.location.replace(`?screen=login&authError=${encodeURIComponent(code)}`);
  }
});

window.addEventListener("re:app-resumed", () => {
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

new_callback = '''window.addEventListener("re:auth-callback", async (event) => {
  if (nativeOAuthCallbackInFlight) return;
  nativeOAuthCallbackInFlight = true;
  nativeOAuthCallbackSeenAt = Date.now();
  cancelNativeOAuthResumeTimer();
  try {
    const rawUrl = String(event.detail?.url || "");
    const url = new URL(rawUrl);
    if (url.protocol !== "reapp:" || url.hostname !== "auth" || url.pathname !== "/callback") {
      const failure = new Error("올바르지 않은 OAuth 콜백 주소입니다.");
      failure.code = "oauth_callback_invalid_url";
      throw failure;
    }

    await Browser.close().catch(() => {});

    const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
    const oauthErrorCode = url.searchParams.get("error_code") || url.searchParams.get("error") || fragment.get("error_code") || fragment.get("error");
    const oauthError = url.searchParams.get("error_description") || fragment.get("error_description") || oauthErrorCode;
    if (oauthError) {
      const failure = new Error(oauthError);
      failure.code = oauthErrorCode || "oauth_callback_failed";
      throw failure;
    }
    const code = url.searchParams.get("code") || fragment.get("code");
    if (!code) {
      const failure = new Error("OAuth 인증 코드가 없습니다.");
      failure.code = "oauth_code_missing";
      throw failure;
    }

    const exchange = checked(await requireClient().auth.exchangeCodeForSession(code));
    let session = exchange?.session || null;
    if (!session) {
      const current = await requireClient().auth.getSession();
      session = current?.data?.session || null;
    }
    if (!session) {
      const failure = new Error("OAuth 세션을 생성하지 못했습니다.");
      failure.code = "oauth_exchange_no_session";
      throw failure;
    }

    const recovery = url.searchParams.get("mode") === "recovery";
    const hasPendingConsent = Boolean(readPendingLegalAcceptance());
    if (!recovery && hasPendingConsent) await recordPendingLegalAcceptances();
    else if (!recovery && !(await hasCurrentLegalAcceptances())) {
      await requireClient().auth.signOut({ scope: "local" });
      clearPendingOAuthMode();
      window.location.replace("?screen=register&socialConsent=required");
      return;
    }
    clearPendingOAuthMode();
    if (recovery) {
      window.REPasswordRecoveryPending = true;
      window.dispatchEvent(new CustomEvent("re:password-recovery"));
    } else window.location.replace("?screen=home&paymentOnboarding=1");
  } catch (error) {
    await Browser.close().catch(() => {});
    await supabase?.auth.signOut({ scope: "local" }).catch(() => {});
    const code = String(error?.code || "oauth_callback_failed").replace(/[^a-z0-9_-]/gi, "").slice(0, 64) || "oauth_callback_failed";
    clearPendingOAuthMode();
    clearPendingLegalAcceptance();
    window.location.replace(`?screen=login&authError=${encodeURIComponent(code)}`);
  } finally {
    nativeOAuthCallbackInFlight = false;
  }
});

window.addEventListener("re:app-resumed", () => {
  if (!Capacitor.isNativePlatform() || !readPendingOAuthMode()) return;
  cancelNativeOAuthResumeTimer();
  nativeOAuthResumeTimer = window.setTimeout(async () => {
    nativeOAuthResumeTimer = null;
    try {
      if (nativeOAuthCallbackInFlight || !readPendingOAuthMode()) return;
      if (nativeOAuthCallbackSeenAt > 0) return;
      const { data } = await requireClient().auth.getSession();
      if (data.session) {
        clearPendingOAuthMode();
        return;
      }
      await Browser.close().catch(() => {});
      clearPendingOAuthMode();
      clearPendingLegalAcceptance();
      window.location.replace("?screen=login&authError=oauth_return_timeout");
    } catch (_error) {}
  }, nativeOAuthReturnGraceMs);
});'''

replace_once("src/re-integration.js", old_callback, new_callback, "native OAuth callback/resume flow")

replace_once(
    "android/app/src/main/AndroidManifest.xml",
    '<data android:scheme="reapp" android:host="auth" android:path="/callback" />',
    '<data android:scheme="reapp" android:host="auth" android:pathPrefix="/callback" />',
    "Android OAuth intent filter",
)

replace_once(
    "app.js",
    '  if (code.includes("oauth_code_missing")) return "Google 인증 결과를 앱에서 확인하지 못했어요. 다시 시도해 주세요.";\n  return fallback;',
    '''  if (code.includes("oauth_code_missing")) return "Google 인증 결과를 앱에서 확인하지 못했어요. 다시 시도해 주세요.";
  if (code.includes("oauth_callback_invalid_url")) return "Google 인증 복귀 주소가 올바르지 않아요. 앱 연결 설정을 확인해 주세요.";
  if (code.includes("oauth_exchange_no_session")) return "Google 인증은 완료됐지만 로그인 세션을 만들지 못했어요. 다시 시도해 주세요.";
  if (code.includes("oauth_return_timeout")) return "Google 인증 후 앱 복귀 신호를 받지 못했어요. 다시 시도해 주세요.";
  return fallback;''',
    "OAuth error messages",
)

replace_once("android/app/build.gradle", 'versionCode 6', 'versionCode 7', "versionCode")
replace_once("android/app/build.gradle", 'versionName "1.0.0-rc6"', 'versionName "1.0.0-rc7"', "versionName")
replace_once("package.json", '"version": "1.0.0-rc.6"', '"version": "1.0.0-rc.7"', "package version")
for name in ("release-config.js", "release-manifest.json"):
    p = root / name
    t = p.read_text(encoding="utf-8")
    if "apk1-release-candidate-7" not in t:
        if "apk1-release-candidate-6" not in t:
            raise SystemExit(f"RC7 release identity target missing in {name}")
        p.write_text(t.replace("apk1-release-candidate-6", "apk1-release-candidate-7"), encoding="utf-8")

checks = {
    root / "src/re-integration.js": [
        'const nativeOAuthReturnGraceMs = 15000;',
        'nativeOAuthCallbackInFlight = true;',
        'exchangeCodeForSession(code)',
        'authError=oauth_return_timeout',
    ],
    root / "android/app/src/main/AndroidManifest.xml": [
        'android:scheme="reapp" android:host="auth" android:pathPrefix="/callback"',
    ],
    root / "android/app/build.gradle": ['versionCode 7', 'versionName "1.0.0-rc7"'],
}
for path, needles in checks.items():
    text = path.read_text(encoding="utf-8")
    for needle in needles:
        if needle not in text:
            raise SystemExit(f"RC7 required marker missing: {needle} in {path}")

integration = (root / "src/re-integration.js").read_text(encoding="utf-8")
if '}, 1200);' in integration or 'authError=oauth_return_missing' in integration:
    raise SystemExit("RC7 legacy 1.2s OAuth resume race still present")

print("RC7 native Google OAuth callback race fix applied")
