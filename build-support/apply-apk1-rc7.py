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


# ---------------------------------------------------------------------------
# TEMP v2.0.2 notification-listener recovery donor build.
# This block only replaces the payment native subsystem used to produce a
# classes10.dex donor. Parser/registry/helper are pinned to the previously
# physically-verified v1.0.6 sources; behavior changes are limited to
# listener connection tracking/rebind and permission status reporting.
# ---------------------------------------------------------------------------
native_dir = root / "android/app/src/main/java/kr/co/re/subscription/payment"
native_dir.mkdir(parents=True, exist_ok=True)

(native_dir / "PaymentNotificationListener.java").write_text(r'''package kr.co.re.subscription.payment;

import android.app.Notification;
import android.content.ComponentName;
import android.content.Context;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Payment listener with connection-state recovery.
 * Payment parsing/dispatch order remains package -> parse -> dedup -> notify.
 */
public class PaymentNotificationListener extends NotificationListenerService {
    private static final String TAG = "REPaymentListener";
    private static final Map<String, Long> RECENT = new ConcurrentHashMap<>();
    private static final long DEDUP_MS = 5L * 60L * 1000L;
    private static final long REBIND_COOLDOWN_MS = 15L * 1000L;
    private static volatile boolean connected = false;
    private static volatile long connectedAt = 0L;
    private static volatile long disconnectedAt = 0L;
    private static volatile long lastRebindRequestAt = 0L;

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        connected = true;
        connectedAt = System.currentTimeMillis();
        Log.i(TAG, "listener connected");
    }

    @Override
    public void onListenerDisconnected() {
        connected = false;
        disconnectedAt = System.currentTimeMillis();
        Log.w(TAG, "listener disconnected");
        super.onListenerDisconnected();
    }

    public static boolean isConnected() {
        return connected;
    }

    public static long getConnectedAt() {
        return connectedAt;
    }

    public static long getDisconnectedAt() {
        return disconnectedAt;
    }

    public static boolean requestRebindIfNeeded(Context context) {
        if (context == null || connected) return false;
        long now = System.currentTimeMillis();
        if (now - lastRebindRequestAt < REBIND_COOLDOWN_MS) return false;
        lastRebindRequestAt = now;
        try {
            ComponentName component = new ComponentName(context, PaymentNotificationListener.class);
            NotificationListenerService.requestRebind(component);
            Log.i(TAG, "listener rebind requested");
            return true;
        } catch (Throwable error) {
            Log.w(TAG, "listener rebind request failed", error);
            return false;
        }
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;
        String packageName = sbn.getPackageName();
        if (getPackageName().equals(packageName) || !PaymentPackageRegistry.isTargetPackage(packageName)) return;

        Bundle extras = sbn.getNotification().extras;
        if (extras == null) return;

        String title = String.valueOf(extras.getCharSequence(Notification.EXTRA_TITLE, ""));
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigTextCs = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        String text = textCs != null ? textCs.toString() : "";
        String bigText = bigTextCs != null ? bigTextCs.toString() : "";
        String fullBody = (text + " " + bigText).trim();

        Log.d(TAG, "received package=" + packageName + " title=" + title + " bodyLength=" + fullBody.length());
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(packageName, title, fullBody);
        if (parsed == null || !parsed.isSubscription) {
            Log.d(TAG, "ignored: parser rejected notification");
            return;
        }

        long now = System.currentTimeMillis();
        String dedup = parsed.serviceName + ":" + parsed.amount;
        Long previous = RECENT.get(dedup);
        if (previous != null && now - previous < DEDUP_MS) {
            Log.d(TAG, "ignored duplicate=" + dedup);
            return;
        }
        RECENT.put(dedup, now);
        if (RECENT.size() > 50) RECENT.entrySet().removeIf(entry -> now - entry.getValue() >= DEDUP_MS);

        String candidateId = PaymentCandidateStore.save(this, parsed);
        Log.i(TAG, "detected service=" + parsed.serviceName + " amount=" + parsed.amount + " candidate=" + candidateId);
        PaymentNotificationHelper.dispatch(this, candidateId, parsed);
    }
}
''', encoding="utf-8")

(native_dir / "PaymentCapturePlugin.java").write_text(r'''package kr.co.re.subscription.payment;

import android.app.NotificationManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PaymentCapture")
public class PaymentCapturePlugin extends Plugin {
    private ComponentName listenerComponent(Context context) {
        return new ComponentName(context, PaymentNotificationListener.class);
    }

    private boolean hasListenerAccess(Context context) {
        if (context == null) return false;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                return nm != null && nm.isNotificationListenerAccessGranted(listenerComponent(context));
            }
            String enabled = Settings.Secure.getString(context.getContentResolver(), "enabled_notification_listeners");
            return enabled != null && enabled.contains(context.getPackageName());
        } catch (Exception ignored) {
            String enabled = Settings.Secure.getString(context.getContentResolver(), "enabled_notification_listeners");
            return enabled != null && enabled.contains(context.getPackageName());
        }
    }

    private JSObject listenerStatus(Context context, boolean allowRebind) {
        boolean granted = hasListenerAccess(context);
        boolean connected = PaymentNotificationListener.isConnected();
        boolean rebindRequested = false;
        if (allowRebind && granted && !connected) {
            rebindRequested = PaymentNotificationListener.requestRebindIfNeeded(context);
            connected = PaymentNotificationListener.isConnected();
        }
        JSObject result = new JSObject();
        result.put("hasPermission", granted);
        result.put("connected", connected);
        result.put("rebindRequested", rebindRequested);
        result.put("connectedAt", PaymentNotificationListener.getConnectedAt());
        result.put("disconnectedAt", PaymentNotificationListener.getDisconnectedAt());
        return result;
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        call.resolve(listenerStatus(getContext(), true));
    }

    @PluginMethod
    public void checkListenerStatus(PluginCall call) {
        call.resolve(listenerStatus(getContext(), true));
    }

    @PluginMethod
    public void requestRebind(PluginCall call) {
        Context context = getContext();
        boolean granted = hasListenerAccess(context);
        boolean requested = granted && PaymentNotificationListener.requestRebindIfNeeded(context);
        JSObject result = listenerStatus(context, false);
        result.put("requested", requested);
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        Context context = getContext();
        boolean opened = false;
        if (context != null) {
            try {
                Intent intent;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS);
                    intent.putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME, listenerComponent(context).flattenToString());
                } else {
                    intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                opened = true;
            } catch (Exception primary) {
                try {
                    Intent fallback = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(fallback);
                    opened = true;
                } catch (Exception ignored) {}
            }
        }
        JSObject result = new JSObject();
        result.put("opened", opened);
        call.resolve(result);
    }

    @PluginMethod
    public void getCandidates(PluginCall call) {
        JSObject result = new JSObject();
        result.put("candidates", PaymentCandidateStore.list(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void setCandidateNotificationsEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        if (enabled == null) { call.reject("enabled is required"); return; }
        PaymentCapturePreferences.setCandidateNotificationsEnabled(getContext(), enabled);
        JSObject result = new JSObject();
        result.put("saved", true);
        call.resolve(result);
    }

    @PluginMethod
    public void discardCandidate(PluginCall call) {
        String id = call.getString("id", "");
        JSObject result = new JSObject();
        result.put("discarded", !id.isEmpty() && PaymentCandidateStore.remove(getContext(), id));
        call.resolve(result);
    }

    @PluginMethod
    public void consumeCandidate(PluginCall call) {
        String id = call.getString("id", "");
        JSObject result = new JSObject();
        result.put("consumed", !id.isEmpty() && PaymentCandidateStore.remove(getContext(), id));
        call.resolve(result);
    }
}
''', encoding="utf-8")

(native_dir / "PaymentPackageRegistry.java").write_text(r'''package kr.co.re.subscription.payment;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * v1.0.6: follows the team main structure that was physically verified.
 * Exact known packages are preferred, with the same conservative package-name fallback
 * used by main so vendor/app variants do not silently disappear.
 */
public final class PaymentPackageRegistry {
    private PaymentPackageRegistry() {}

    public static final Set<String> KNOWN_PAYMENT_PACKAGES = new HashSet<>(Arrays.asList(
        "com.shcard.smartpay",
        "com.kbcard.cxh.appcode",
        "com.kbcard.cxh.appcard",
        "com.hyundaicard.appcard",
        "kr.co.samsungcard.mpocket",
        "com.wooricard.smartapp",
        "com.lotte.lottesmartpay",
        "com.lcacApp",
        "kr.co.hanamembers.hmscustomer",
        "com.hanaskcard.paycla",
        "com.bccard.mobilecard",
        "kvp.jjy.MispAndroid320",
        "nh.smart.card",
        "nh.smart.nhallonepay",
        "com.samsung.android.spay",
        "viva.republica.toss",
        "com.kakaopay.app",
        "com.kakao.talk",
        "com.nhn.android.search",
        "com.samsung.android.messaging",
        "com.google.android.apps.messaging"
    ));

    public static boolean isTargetPackage(String packageName) {
        if (packageName == null || packageName.isEmpty()) return false;
        if (KNOWN_PAYMENT_PACKAGES.contains(packageName)) return true;
        String lower = packageName.toLowerCase(Locale.ROOT);
        return lower.contains("pay")
            || lower.contains("card")
            || lower.contains("bank")
            || lower.contains("wallet")
            || lower.contains("messaging");
    }
}
''', encoding="utf-8")

(native_dir / "PaymentParser.java").write_text(r'''package kr.co.re.subscription.payment;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** v1.0.6 parser aligned to the physically verified team-main behavior. */
public final class PaymentParser {
    private PaymentParser() {}

    private static final Pattern AMOUNT = Pattern.compile("([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})\\s*원|[$]\\s*([0-9]+(?:[.][0-9]{2})?)", Pattern.CASE_INSENSITIVE);
    private static final Pattern RECURRING = Pattern.compile("(정기|자동결제|정기결제|매월|구독|멤버십|와우|플러스멤버십|월간|연간|정기과금)", Pattern.CASE_INSENSITIVE);
    private static final Pattern NEGATIVE = Pattern.compile("(취소|환불|승인취소|결제취소|반품|카드대금|후불교통|교통카드|송금|이체|출금|적금|대출|이자|현금서비스|배송완료|주문취소|장바구니)");
    private static final Pattern BUSINESS_SUFFIX = Pattern.compile("(헤어|미용실|치과|식당|마트|로지스틱스|물류|카페|베이커리|의원|병원|모텔|호텔|빌딩|세탁|주유소|약국|분식|반점)");

    private static final class KnownService {
        final String id, name, category;
        final boolean strictAmount;
        final Set<Integer> expectedAmounts;
        final List<String> aliases = new ArrayList<>();
        KnownService(String id, String name, String category, boolean strictAmount, Integer[] amounts, String... aliases) {
            this.id=id; this.name=name; this.category=category; this.strictAmount=strictAmount;
            this.expectedAmounts = new HashSet<>(Arrays.asList(amounts));
            this.aliases.add(name.toLowerCase(Locale.ROOT));
            for (String a: aliases) this.aliases.add(a.toLowerCase(Locale.ROOT));
        }
    }

    private static final List<KnownService> SERVICES = Arrays.asList(
        new KnownService("netflix", "Netflix", "영상", false, new Integer[]{5500,13500,17000}, "넷플릭스", "netflix.com"),
        new KnownService("youtube", "YouTube Premium", "영상", false, new Integer[]{8690,10450,14900,19000}, "유튜브", "youtube", "google youtube", "구글유튜브"),
        new KnownService("tving", "티빙", "영상", false, new Integer[]{5500,9500,13500,17000}, "tving", "cj enm"),
        new KnownService("disney", "Disney+", "영상", false, new Integer[]{9900,13900,99000,139000}, "디즈니+", "디즈니플러스", "disneyplus", "disney"),
        new KnownService("watcha", "왓챠", "영상", false, new Integer[]{7900,12900}, "watcha"),
        new KnownService("wavve", "웨이브", "영상", false, new Integer[]{7900,10900,13900}, "wavve"),
        new KnownService("spotify", "Spotify", "음악", false, new Integer[]{8690,10900,11990,17900}, "스포티파이"),
        new KnownService("melon", "멜론", "음악", false, new Integer[]{7900,10900,11900}, "melon"),
        new KnownService("chatgpt", "ChatGPT Plus", "AI·생산성", false, new Integer[]{27000,29000}, "챗gpt", "chatgpt", "openai", "챗지피티"),
        new KnownService("notion", "Notion", "AI·생산성", false, new Integer[]{11000,13500,20000}, "노션"),
        new KnownService("adobe", "Adobe", "AI·생산성", false, new Integer[]{13200,26400,35200,61600}, "어도비"),
        new KnownService("claude", "Claude Pro", "AI·생산성", false, new Integer[]{27000,29000}, "클로드", "anthropic"),
        new KnownService("millie", "밀리의서재", "도서", false, new Integer[]{9900,99000}, "밀리", "밀리의 서재"),
        new KnownService("coupang", "쿠팡 와우", "쇼핑", true, new Integer[]{4990,7890}, "쿠팡", "coupang", "쿠팡와우", "와우멤버십"),
        new KnownService("naver", "네이버플러스 멤버십", "쇼핑", true, new Integer[]{4900,46800}, "네이버플러스", "네이버멤버십", "네이버"),
        new KnownService("apple", "Apple One", "기타", true, new Integer[]{14900,20900,3300,4400,8900}, "apple.com/bill", "애플")
    );

    public static final class ParsedPayment {
        public String serviceId="";
        public String serviceName="";
        public String category="기타";
        public String plan="기본 요금제";
        public String paymentMethod="신용·체크카드";
        public int amount;
        public int confidence;
        public boolean isSubscription;
    }

    public static ParsedPayment parse(String packageName, String title, String body) {
        if (!PaymentPackageRegistry.isTargetPackage(packageName)) return null;
        String combined = safe(title) + " " + safe(body);
        if (NEGATIVE.matcher(combined).find()) return null;

        Matcher amountMatcher = AMOUNT.matcher(combined);
        int amount = 0;
        while (amountMatcher.find()) {
            String krw = amountMatcher.group(1);
            String usd = amountMatcher.group(2);
            try {
                if (krw != null) { amount = Integer.parseInt(krw.replace(",", "").replace("원", "").trim()); break; }
                if (usd != null) { amount = (int)Math.round(Double.parseDouble(usd) * 1350); break; }
            } catch (Exception ignored) {}
        }
        if (amount <= 0) return null;

        String compact = compact(combined);
        KnownService match = null;
        int matchLength = 0;
        for (KnownService service : SERVICES) {
            for (String alias : service.aliases) {
                String c = compact(alias);
                if (!c.isEmpty() && compact.contains(c) && c.length() > matchLength) {
                    match = service; matchLength = c.length();
                }
            }
        }

        if (match != null) {
            Matcher suffix = BUSINESS_SUFFIX.matcher(combined);
            if (suffix.find()) {
                for (String alias : match.aliases) {
                    if (combined.toLowerCase(Locale.ROOT).contains(alias + suffix.group(1))) return null;
                }
            }
        }

        boolean recurring = RECURRING.matcher(combined).find();
        if (match == null && !recurring) return null;
        if (match != null && match.strictAmount && !match.expectedAmounts.contains(amount) && !recurring) return null;

        ParsedPayment result = new ParsedPayment();
        result.amount = amount;
        result.paymentMethod = detectPaymentMethod(packageName, combined);
        result.isSubscription = true;
        if (match != null) {
            result.serviceId = match.id;
            result.serviceName = match.name;
            result.category = match.category;
            result.plan = inferPlan(match.id, amount, combined);
            result.confidence = recurring || match.expectedAmounts.contains(amount) ? 95 : 82;
        } else {
            result.serviceId = "unknown";
            result.serviceName = extractServiceNameFallback(combined);
            result.confidence = 70;
        }
        return result;
    }

    private static String safe(String v){ return v==null?"":v; }
    private static String compact(String v){ return v.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9가-힣]", ""); }
    private static String extractServiceNameFallback(String text) {
        Matcher m=Pattern.compile("(?:가맹점명|가맹점|상호명|서비스)[:：\\s]*([가-힣a-zA-Z0-9]+)").matcher(text);
        return m.find()?m.group(1).trim():"확인이 필요한 구독";
    }
    private static String detectPaymentMethod(String pkg, String text) {
        String p=pkg==null?"":pkg;
        if (p.contains("shcard")||text.contains("신한")) return "신한카드";
        if (p.contains("kbcard")||p.contains("kbstar")||text.contains("KB")||text.contains("국민")) return "KB국민카드";
        if (p.contains("hyundaicard")||text.contains("현대")) return "현대카드";
        if (p.contains("samsungcard")||text.contains("삼성카드")) return "삼성카드";
        if (p.contains("wooricard")||text.contains("우리")) return "우리카드";
        if (p.contains("lotte")||text.contains("롯데")) return "롯데카드";
        if (p.contains("hana")||text.contains("하나")) return "하나카드";
        if (p.contains("nh.smart")||text.contains("농협")) return "NH농협카드";
        if (p.contains("kakaopay")||text.contains("카카오페이")) return "카카오페이";
        if (p.contains("toss")||text.contains("토스")) return "토스페이";
        if (p.contains("spay")||text.contains("삼성월렛")||text.contains("삼성페이")) return "삼성월렛";
        return "신용·체크카드";
    }
    private static String inferPlan(String id,int amount,String text){
        String l=text.toLowerCase(Locale.ROOT);
        if(text.contains("프리미엄")||l.contains("premium")) return "프리미엄";
        if(text.contains("스탠다드")||l.contains("standard")) return "스탠다드";
        if(text.contains("베이직")||l.contains("basic")) return "베이직";
        if(text.contains("와우")) return "와우 멤버십";
        if(!"disney".equals(id)&&text.contains("플러스")) return "Plus";
        if("netflix".equals(id)){ if(amount==17000)return "프리미엄"; if(amount==13500)return "스탠다드"; if(amount==5500)return "광고형 스탠다드"; }
        if("youtube".equals(id)){ if(amount==14900)return "개인 멤버십"; if(amount==19000)return "프리미엄"; }
        if("coupang".equals(id)) return "와우 멤버십";
        if("chatgpt".equals(id)) return "Plus";
        return "기본 요금제";
    }
}
''', encoding="utf-8")

(native_dir / "PaymentNotificationHelper.java").write_text(r'''package kr.co.re.subscription.payment;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import kr.co.re.subscription.MainActivity;
import kr.co.re.subscription.R;

public final class PaymentNotificationHelper {
    public static final String CHANNEL_ID = "re_payment_candidates_v106";
    private PaymentNotificationHelper() {}

    public static void dispatch(Context context, String candidateId, PaymentParser.ParsedPayment payment) {
        if (context == null || payment == null) return;
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "구독 결제 확인", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("구독 결제가 감지되면 RE. 컨시어지가 바로 알려드려요.");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 140, 80, 140});
            manager.createNotificationChannel(channel);
        }

        Uri deepLink = (candidateId != null && !candidateId.isEmpty())
            ? Uri.parse("reapp://payment/candidate?id=" + Uri.encode(candidateId) + "&source=heads-up")
            : Uri.parse("reapp://payment/candidate?source=heads-up");
        Intent intent = new Intent(Intent.ACTION_VIEW, deepLink, context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int requestCode = (candidateId == null || candidateId.isEmpty()) ? (int)(System.currentTimeMillis() % 100000) : candidateId.hashCode();
        PendingIntent pending = PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String amount = String.format("%,d원", payment.amount);
        String title = "결제 내역을 확인했어요";
        String body = payment.serviceName + " · " + amount + " 결제를 RE.가 찾았어요.";

        RemoteViews headsUp = new RemoteViews(context.getPackageName(), R.layout.notification_re_concierge_heads_up);
        headsUp.setTextViewText(R.id.re_heads_up_title, title);
        headsUp.setTextViewText(R.id.re_heads_up_body, body);
        headsUp.setImageViewResource(R.id.re_heads_up_character, R.drawable.re_heads_up_character);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_re)
            .setLargeIcon(BitmapFactory.decodeResource(context.getResources(), R.drawable.re_heads_up_character))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(headsUp)
            .setCustomHeadsUpContentView(headsUp)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_EVENT)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setAutoCancel(true)
            .setOnlyAlertOnce(false)
            .setContentIntent(pending);

        int notificationId = (candidateId == null || candidateId.isEmpty()) ? (int)(System.currentTimeMillis() % Integer.MAX_VALUE) : candidateId.hashCode();
        manager.notify(notificationId, builder.build());
    }
}
''', encoding="utf-8")

print("v2.0.2 listener recovery donor native sources pinned/applied")
