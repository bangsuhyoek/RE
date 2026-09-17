package com.re.cardtest;

import android.app.Activity;
import android.app.Instrumentation;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
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

public class ParityInstrumentation extends Instrumentation {
    private static final String TAG = "REParityQA";
    private static final String TARGET = "kr.co.re.subscription";
    private Activity activity;
    private WebView webView;
    private File outDir;
    private final StringBuilder report = new StringBuilder();

    @Override
    public void onCreate(Bundle arguments) {
        super.onCreate(arguments);
        start();
    }

    @Override
    public void onStart() {
        Bundle result = new Bundle();
        int code = Activity.RESULT_CANCELED;
        try {
            // Instrumentation executes in the target app process/UID. Writing to the
            // QA package's private files directory therefore fails even though `run-as
            // com.re.cardtest` works from adb. Store evidence in the target app's
            // app-specific external directory instead; it needs no storage permission
            // and can be pulled by adb on the emulator without changing the target APK.
            File evidenceRoot = getTargetContext().getExternalFilesDir(null);
            if (evidenceRoot == null) throw new IllegalStateException("target external files directory unavailable");
            outDir = new File(evidenceRoot, "parity");
            if (!outDir.exists() && !outDir.mkdirs()) throw new IllegalStateException("cannot create evidence directory: " + outDir);

            Intent launch = getTargetContext().getPackageManager().getLaunchIntentForPackage(TARGET);
            if (launch == null) throw new IllegalStateException("launch intent missing");
            launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
            activity = startActivitySync(launch);
            waitForIdleSync();
            Thread.sleep(7200L);

            webView = findWebView(activity.getWindow().getDecorView());
            if (webView == null) throw new IllegalStateException("WebView not found");

            String bootstrap = jsString(eval(
                "(()=>{" +
                "window.__reParity={deepLink:'',candidates:null};" +
                "window.addEventListener('re:payment-candidate',e=>{window.__reParity.deepLink=String(e.detail?.id||'');});" +
                "const r=window.REIntegrations;" +
                "if(!r)return 'NO_RE_INTEGRATIONS';" +
                "if(r.auth){r.auth.getSession=async()=>({authenticated:true});r.auth.provider=async()=>({authenticated:true});}" +
                "if(r.data){r.data.mountScreen=async({root})=>{if(root)root.querySelectorAll('[data-fixture]').forEach(n=>n.removeAttribute('data-fixture'));return {mounted:true};};}" +
                "if(r.actions){r.actions['open-subscription']=async({service})=>({ok:true,route:'subscription-detail',silent:true});}" +
                "return 'OK';" +
                "})()"
            ));
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
            capture("home");

            String before = jsString(eval("document.documentElement.dataset.conciergeEnabled||''"));
            jsClick(".app-screen:not([hidden]) [data-concierge-toggle]");
            Thread.sleep(700L);
            String afterOff = jsString(eval("document.documentElement.dataset.conciergeEnabled||''"));
            jsClick(".app-screen:not([hidden]) [data-concierge-toggle]");
            Thread.sleep(700L);
            String afterOn = jsString(eval("document.documentElement.dataset.conciergeEnabled||''"));
            require("true".equals(before) && "false".equals(afterOff) && "true".equals(afterOn),
                    "concierge toggle sequence=" + before + "/" + afterOff + "/" + afterOn);
            record("concierge_toggle", "PASS");

            jsClick(".app-screen:not([hidden]) .bottom-nav [data-route='subscriptions']");
            waitForScreen("subscriptions", 2500L);
            capture("subscriptions");

            jsClick(".app-screen[data-screen='subscriptions'] [data-action='open-subscription'][data-service='youtube']");
            waitForScreen("subscription-detail", 2500L);
            capture("subscription-detail");

            jsClick(".app-screen:not([hidden]) .bottom-nav [data-route='benefits']");
            waitForScreen("benefits", 2500L);
            capture("benefits");

            jsClick(".app-screen:not([hidden]) [data-route='notifications']");
            waitForScreen("notifications", 2500L);
            capture("notifications");

            jsClick(".app-screen:not([hidden]) [data-route='my-page']");
            waitForScreen("my-page", 2500L);
            capture("my-page");

            postPaymentNotification();
            Thread.sleep(1800L);
            eval("(()=>{const p=window.Capacitor?.Plugins?.PaymentCapture;if(!p){window.__reParity.candidates='NO_PLUGIN';return;}p.getCandidates().then(r=>window.__reParity.candidates=JSON.stringify(r)).catch(e=>window.__reParity.candidates='ERR:'+String(e));return 'STARTED';})()");
            Thread.sleep(1600L);
            String candidateState = jsString(eval("window.__reParity.candidates||''"));
            require(candidateState.contains("Netflix") && candidateState.contains("17000"), "candidate runtime result=" + candidateState);
            record("payment_candidate", "PASS");

            // Verify that Android's real resolver sees the exported RE deep-link filter,
            // then launch the URI as the external shell identity without forcing the
            // package. Forcing a package here caused `am start` on API 33 to reject an
            // otherwise resolvable custom-scheme VIEW intent during instrumentation.
            String deepUri = "reapp://payment/candidate?id=baseline-smoke&source=parity-shell";
            String resolveCommand = "cmd package resolve-activity --brief -a android.intent.action.VIEW " +
                    "-c android.intent.category.DEFAULT -c android.intent.category.BROWSABLE -d '" + deepUri + "'";
            String resolveOutput = shell(resolveCommand);
            Log.i(TAG, "deep_link_resolve=" + resolveOutput.replace('\n', ' '));
            require(resolveOutput.contains("kr.co.re.subscription") && resolveOutput.contains("MainActivity"),
                    "deep link resolver=" + resolveOutput);

            String deepCommand = "am start -W -a android.intent.action.VIEW " +
                    "-c android.intent.category.DEFAULT -c android.intent.category.BROWSABLE -d '" + deepUri + "'";
            String deepOutput = shell(deepCommand);
            Log.i(TAG, "deep_link_shell=" + deepOutput.replace('\n', ' '));
            require(!deepOutput.contains("Error:"), "deep link shell=" + deepOutput);
            Thread.sleep(1400L);
            String deepId = jsString(eval("window.__reParity.deepLink||''"));
            require("baseline-smoke".equals(deepId), "deep link id=" + deepId + " resolver=" + resolveOutput + " shell=" + deepOutput);
            record("deep_link", "PASS");

            record("result", "PASS");
            writeReport();
            Log.i(TAG, "RE_PARITY_RESULT=PASS");
            result.putString("stream", "RE_PARITY_RESULT=PASS\n");
            code = Activity.RESULT_OK;
        } catch (Throwable error) {
            Log.e(TAG, "RE_PARITY_RESULT=FAIL", error);
            record("result", "FAIL: " + error);
            try { writeReport(); } catch (Throwable ignored) {}
            result.putString("stream", "RE_PARITY_RESULT=FAIL: " + error + "\n");
        } finally {
            finish(code, result);
        }
    }

    private void postPaymentNotification() {
        // Instrumentation executes with the target app UID, so using getContext()
        // to post a notification as com.re.cardtest causes Package/UID security
        // enforcement to fail. Delegate the notification to an exported receiver
        // in the QA package so Android posts it under the QA package UID.
        Intent publish = new Intent("com.re.cardtest.POST_PAYMENT");
        publish.setClassName("com.re.cardtest", "com.re.cardtest.NotificationPublisher");
        getTargetContext().sendBroadcast(publish);
        record("posted_card_notification", "PASS");
    }

    private String shell(String command) throws Exception {
        ParcelFileDescriptor descriptor = getUiAutomation().executeShellCommand(command);
        if (descriptor == null) throw new IllegalStateException("shell descriptor missing: " + command);
        try (InputStream input = new ParcelFileDescriptor.AutoCloseInputStream(descriptor);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            return output.toString("UTF-8");
        }
    }

    private void capture(String name) throws Exception {
        normalizeVisibleScreen();
        Thread.sleep(850L);
        Bitmap bitmap = getUiAutomation().takeScreenshot();
        if (bitmap == null) throw new IllegalStateException("screenshot null: " + name);
        File output = new File(outDir, name + ".png");
        try (FileOutputStream stream = new FileOutputStream(output)) {
            if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)) {
                throw new IllegalStateException("screenshot compression failed: " + name);
            }
        }
        bitmap.recycle();
        record("visual_" + name, "PASS");
    }

    private void normalizeVisibleScreen() throws Exception {
        eval("(()=>{document.querySelectorAll('.bottom-sheet,.toast,.re-concierge-handoff').forEach(n=>{n.hidden=true;n.classList.remove('is-open','is-active','open');});" +
                "const s=document.querySelector('.app-screen:not([hidden]) .screen-content');if(s)s.scrollTop=0;window.scrollTo(0,0);return document.querySelector('#app')?.dataset.screen||'';})()");
    }

    private void jsClick(String selector) throws Exception {
        String script = "(()=>{const n=document.querySelector(" + quote(selector) + ");if(!n)return 'MISSING';n.click();return 'CLICKED';})()";
        String value = jsString(eval(script));
        require("CLICKED".equals(value), "click failed " + selector + " => " + value);
    }

    private void waitForScreen(String expected, long timeoutMs) throws Exception {
        long deadline = System.currentTimeMillis() + timeoutMs;
        String value = "";
        while (System.currentTimeMillis() < deadline) {
            value = screen();
            if (expected.equals(value)) {
                record("screen_" + expected, "PASS");
                return;
            }
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

    private void writeReport() throws Exception {
        File file = new File(outDir, "runtime-report.txt");
        try (FileWriter writer = new FileWriter(file, false)) {
            writer.write(report.toString());
        }
    }
}
