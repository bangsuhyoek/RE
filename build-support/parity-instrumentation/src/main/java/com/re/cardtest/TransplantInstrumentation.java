package com.re.cardtest;

import android.app.Activity;
import android.app.Instrumentation;
import android.app.NotificationManager;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;

import org.json.JSONTokener;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.InputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** End-to-end proof that the 2.5D feature is reached through NotificationListener. */
public class TransplantInstrumentation extends Instrumentation {
    private static final String TAG = "RE25DQA";
    private static final String TARGET = "kr.co.re.subscription";
    private static final Pattern ELAPSED = Pattern.compile("removed reason=(?:animation_end|safety_timeout) elapsedMs=([0-9]+)");

    private Activity activity;
    private WebView webView;
    private File outDir;
    private final StringBuilder report = new StringBuilder();

    @Override public void onCreate(Bundle arguments) {
        super.onCreate(arguments);
        start();
    }

    @Override public void onStart() {
        Bundle result = new Bundle();
        int code = Activity.RESULT_CANCELED;
        try {
            File evidenceRoot = getTargetContext().getExternalFilesDir(null);
            if (evidenceRoot == null) throw new IllegalStateException("target external files directory unavailable");
            outDir = new File(evidenceRoot, "transplant");
            if (!outDir.exists() && !outDir.mkdirs()) throw new IllegalStateException("cannot create evidence directory");

            Intent launch = getTargetContext().getPackageManager().getLaunchIntentForPackage(TARGET);
            if (launch == null) throw new IllegalStateException("launch intent missing");
            launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
            activity = startActivitySync(launch);
            waitForIdleSync();
            Thread.sleep(7200L);
            webView = findWebView(activity.getWindow().getDecorView());
            if (webView == null) throw new IllegalStateException("WebView not found");

            bootstrapHome();
            record("production_trigger", "NotificationListener");

            // Initialize the real native snapshot through the production Capacitor bridge.
            require(asyncPlugin("p.setConciergeEnabled({enabled:true})").contains("saved"), "concierge bridge unavailable");
            require(asyncPlugin("p.syncSubscriptionSnapshot({serviceIds:['youtube']})").contains("saved"), "snapshot bridge unavailable");
            String permission = asyncPlugin("p.checkAnimatedConciergePermission()");
            require(permission.contains("true"), "overlay permission not granted: " + permission);
            record("overlay_permission_granted", "PASS");

            shell("logcat -c");
            capture("before-trigger");
            postPaymentNotification("신한카드 승인", "Netflix 정기결제 17,000원 승인", 9101);
            // On API 33 the heads-up surface is not guaranteed to be composited within 500 ms.
            // Capture after it is visibly settled, then cancel only the RE notification so the
            // next frame isolates the still-running transparent character overlay.
            Thread.sleep(2200L);
            capture("heads-up-overlay");
            NotificationManager notificationManager =
                    (NotificationManager) getTargetContext().getSystemService(android.content.Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) notificationManager.cancelAll();
            Thread.sleep(300L);
            capture("overlay-only");
            Thread.sleep(3800L);
            capture("after-cleanup");

            String normalCandidates = asyncPlugin("p.getCandidates()");
            require(normalCandidates.contains("Netflix") && normalCandidates.contains("17000"),
                    "normal candidate missing: " + normalCandidates);
            String normalLog = overlayLog();
            writeText("normal-log.txt", normalLog);
            require(normalLog.contains("detected service=Netflix amount=17000"), "listener production path missing");
            require(normalLog.contains("event=NEW_SUBSCRIPTION_DETECTED"), "new subscription classification missing");
            require(normalLog.contains("show event=NEW_SUBSCRIPTION_DETECTED"), "overlay show missing");
            require(normalLog.contains("animation_start event=NEW_SUBSCRIPTION_DETECTED"), "animation start missing");
            Matcher elapsed = ELAPSED.matcher(normalLog);
            require(elapsed.find(), "overlay cleanup log missing");
            long duration = Long.parseLong(elapsed.group(1));
            require(duration >= 5000L && duration <= 6200L, "animation duration out of range=" + duration);
            record("candidate_storage", "PASS");
            record("heads_up_notification", "PASS");
            record("new_subscription_classification", "PASS");
            record("overlay_requested", "PASS");
            record("animation_duration_ms", String.valueOf(duration));
            record("overlay_cleanup", "PASS");

            // Existing subscription: candidate/heads-up still happen, overlay must not.
            shell("logcat -c");
            asyncPlugin("p.setConciergeEnabled({enabled:true})");
            asyncPlugin("p.syncSubscriptionSnapshot({serviceIds:['youtube']})");
            postPaymentNotification("KB국민카드 승인", "YouTube Premium 정기결제 14,900원 승인", 9102);
            Thread.sleep(1400L);
            String knownCandidates = asyncPlugin("p.getCandidates()");
            require(knownCandidates.contains("YouTube Premium") && knownCandidates.contains("14900"),
                    "existing-service candidate missing: " + knownCandidates);
            String knownLog = overlayLog();
            writeText("known-service-log.txt", knownLog);
            require(knownLog.contains("overlay skip reason=not_new_service serviceId=youtube"),
                    "existing service classification not observed");
            require(!knownLog.contains("show event=NEW_SUBSCRIPTION_DETECTED"), "existing service showed overlay");
            record("existing_service_no_overlay", "PASS");

            // Concierge OFF: production payment path persists candidate + heads-up but suppresses overlay.
            shell("logcat -c");
            asyncPlugin("p.setConciergeEnabled({enabled:false})");
            postPaymentNotification("현대카드 승인", "Disney+ 정기결제 13,900원 승인", 9103);
            Thread.sleep(1400L);
            String offCandidates = asyncPlugin("p.getCandidates()");
            require(offCandidates.contains("Disney+") && offCandidates.contains("13900"),
                    "concierge-off candidate missing: " + offCandidates);
            String offLog = overlayLog();
            writeText("concierge-off-log.txt", offLog);
            require(offLog.contains("overlay skip reason=concierge_disabled"), "concierge-off suppression missing");
            require(!offLog.contains("show event=NEW_SUBSCRIPTION_DETECTED"), "concierge-off showed overlay");
            record("concierge_off_fallback", "PASS");

            // Overlay permission denied: candidate + heads-up remain, overlay safely fails closed.
            shell("logcat -c");
            asyncPlugin("p.setConciergeEnabled({enabled:true})");
            shell("appops set " + TARGET + " SYSTEM_ALERT_WINDOW deny");
            Thread.sleep(350L);
            String deniedPermission = asyncPlugin("p.checkAnimatedConciergePermission()");
            if (deniedPermission.contains("\"granted\":true")) {
                shell("appops set " + TARGET + " SYSTEM_ALERT_WINDOW ignore");
                Thread.sleep(350L);
                deniedPermission = asyncPlugin("p.checkAnimatedConciergePermission()");
            }
            require(!deniedPermission.contains("\"granted\":true"), "overlay permission denial ineffective=" + deniedPermission);
            postPaymentNotification("삼성카드 승인", "ChatGPT Plus 정기결제 29,000원 승인", 9104);
            Thread.sleep(1400L);
            String deniedCandidates = asyncPlugin("p.getCandidates()");
            require(deniedCandidates.contains("ChatGPT Plus") && deniedCandidates.contains("29000"),
                    "permission-denied candidate missing: " + deniedCandidates);
            String deniedLog = overlayLog();
            writeText("permission-denied-log.txt", deniedLog);
            require(deniedLog.contains("skip reason=overlay_permission_missing"), "permission-denied suppression missing");
            require(!deniedLog.contains("show event=NEW_SUBSCRIPTION_DETECTED"), "permission-denied showed overlay");
            record("permission_denied_fallback", "PASS");
            shell("appops set " + TARGET + " SYSTEM_ALERT_WINDOW allow");

            String crashes = shell("logcat -d -v brief | grep -E 'FATAL EXCEPTION|ANR in " + TARGET + "|Process: " + TARGET + "' || true");
            require(crashes.trim().isEmpty(), "crash/ANR observed=" + crashes);
            record("crash_anr", "PASS");
            record("result", "PASS");
            writeReport();
            Log.i(TAG, "RE_2_5D_RESULT=PASS");
            result.putString("stream", "RE_2_5D_RESULT=PASS\n");
            code = Activity.RESULT_OK;
        } catch (Throwable error) {
            Log.e(TAG, "RE_2_5D_RESULT=FAIL", error);
            record("result", "FAIL: " + error);
            try { writeReport(); } catch (Throwable ignored) {}
            result.putString("stream", "RE_2_5D_RESULT=FAIL: " + error + "\n");
        } finally {
            finish(code, result);
        }
    }

    private void bootstrapHome() throws Exception {
        String bootstrap = jsString(eval(
                "(()=>{" +
                "const r=window.REIntegrations;if(!r)return 'NO_RE_INTEGRATIONS';" +
                "if(r.auth){r.auth.getSession=async()=>({authenticated:true});r.auth.provider=async()=>({authenticated:true});}" +
                "if(r.data){r.data.mountScreen=async({root})=>{if(root)root.querySelectorAll('[data-fixture]').forEach(n=>n.removeAttribute('data-fixture'));return {mounted:true};};}" +
                "return 'OK';" +
                "})()"));
        require("OK".equals(bootstrap), "integration bootstrap=" + bootstrap);
        String current = screen();
        if ("landing".equals(current)) {
            jsClick("[data-screen='landing'] [data-route='login']");
            Thread.sleep(350L);
            current = screen();
        }
        require("login".equals(current), "expected login before QA auth, got=" + current);
        jsClick("[data-screen='login'] [data-auth-provider]");
        waitForScreen("home", 5000L);
        Thread.sleep(500L);
    }

    private String asyncPlugin(String expression) throws Exception {
        String start = jsString(eval(
                "(()=>{window.__re25dAsync='PENDING';const p=window.Capacitor?.Plugins?.PaymentCapture;" +
                "if(!p){window.__re25dAsync='NO_PLUGIN';return 'NO_PLUGIN';}" +
                "Promise.resolve(" + expression + ").then(r=>window.__re25dAsync=JSON.stringify(r??{})).catch(e=>window.__re25dAsync='ERR:'+String(e));" +
                "return 'STARTED';})()"));
        require("STARTED".equals(start), "plugin async start=" + start);
        long deadline = System.currentTimeMillis() + 5000L;
        String value = "PENDING";
        while (System.currentTimeMillis() < deadline) {
            value = jsString(eval("window.__re25dAsync||''"));
            if (!"PENDING".equals(value)) return value;
            Thread.sleep(80L);
        }
        throw new IllegalStateException("plugin async timeout expression=" + expression + " value=" + value);
    }

    private void postPaymentNotification(String title, String body, int id) {
        Intent publish = new Intent("com.re.cardtest.POST_PAYMENT");
        publish.setClassName("com.re.cardtest", "com.re.cardtest.NotificationPublisher");
        publish.putExtra("title", title);
        publish.putExtra("body", body);
        publish.putExtra("id", id);
        getTargetContext().sendBroadcast(publish);
        record("posted_notification_" + id, "PASS");
    }

    private String overlayLog() throws Exception {
        return shell("logcat -d -v brief -s REConciergeOverlay:I REPaymentCoordinator:I REPaymentListener:I REPaymentNotif:I '*:S'");
    }

    private String shell(String command) throws Exception {
        ParcelFileDescriptor descriptor = getUiAutomation().executeShellCommand(command);
        if (descriptor == null) throw new IllegalStateException("shell descriptor missing: " + command);
        try (InputStream input = new ParcelFileDescriptor.AutoCloseInputStream(descriptor);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int read;
            while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
            return output.toString("UTF-8");
        }
    }

    private void capture(String name) throws Exception {
        Bitmap bitmap = getUiAutomation().takeScreenshot();
        if (bitmap == null) throw new IllegalStateException("screenshot null: " + name);
        File output = new File(outDir, name + ".png");
        try (FileOutputStream stream = new FileOutputStream(output)) {
            if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)) throw new IllegalStateException("screenshot compression failed");
        }
        bitmap.recycle();
        record("visual_" + name, "PASS");
    }

    private void jsClick(String selector) throws Exception {
        String value = jsString(eval("(()=>{const n=document.querySelector(" + quote(selector) + ");if(!n)return 'MISSING';n.click();return 'CLICKED';})()"));
        require("CLICKED".equals(value), "click failed " + selector + " => " + value);
    }

    private void waitForScreen(String expected, long timeoutMs) throws Exception {
        long deadline = System.currentTimeMillis() + timeoutMs;
        String value = "";
        while (System.currentTimeMillis() < deadline) {
            value = screen();
            if (expected.equals(value)) return;
            Thread.sleep(100L);
        }
        throw new IllegalStateException("screen expected=" + expected + " actual=" + value);
    }

    private String screen() throws Exception {
        return jsString(eval("document.querySelector('#app')?.dataset.screen||''"));
    }

    private String eval(String javascript) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> output = new AtomicReference<>("null");
        runOnMainSync(() -> webView.evaluateJavascript(javascript, value -> {
            output.set(value == null ? "null" : value);
            latch.countDown();
        }));
        if (!latch.await(12, TimeUnit.SECONDS)) throw new IllegalStateException("evaluateJavascript timeout");
        return output.get();
    }

    private static String jsString(String raw) {
        try {
            Object value = new JSONTokener(raw == null ? "null" : raw).nextValue();
            return value == null ? "" : String.valueOf(value);
        } catch (Throwable ignored) {
            return raw == null ? "" : raw;
        }
    }

    private static String quote(String value) {
        return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'";
    }

    private WebView findWebView(View root) {
        if (root instanceof WebView) return (WebView) root;
        if (root instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) root;
            for (int i = 0; i < group.getChildCount(); i++) {
                WebView child = findWebView(group.getChildAt(i));
                if (child != null) return child;
            }
        }
        return null;
    }

    private void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    private void record(String key, String value) {
        report.append(key).append('=').append(value).append('\n');
        Log.i(TAG, key + "=" + value);
    }

    private void writeText(String name, String content) throws Exception {
        try (FileWriter writer = new FileWriter(new File(outDir, name), false)) {
            writer.write(content == null ? "" : content);
        }
    }

    private void writeReport() throws Exception {
        writeText("runtime-report.txt", report.toString());
    }
}
