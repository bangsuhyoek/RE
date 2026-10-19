package com.submate.app.payment;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.List;

@CapacitorPlugin(name = "PaymentCapture")
public class PaymentCapturePlugin extends Plugin {

    @PluginMethod
    public void checkPermission(PluginCall call) {
        Context context = getContext();
        boolean hasPermission = false;
        if (context != null) {
            String pkgName = context.getPackageName();
            String flat = Settings.Secure.getString(context.getContentResolver(), "enabled_notification_listeners");
            hasPermission = flat != null && flat.contains(pkgName);
        }
        JSObject ret = new JSObject();
        ret.put("hasPermission", hasPermission);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        Context context = getContext();
        if (context != null) {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        }
        JSObject ret = new JSObject();
        ret.put("status", "OPENED");
        call.resolve(ret);
    }

    @PluginMethod
    public void simulatePayment(PluginCall call) {
        if (!com.submate.app.BuildConfig.DEBUG) {
            call.reject("simulatePayment is only available in debug builds.", "FORBIDDEN");
            return;
        }

        String pkg = call.getString("package", "com.shcard.smartpay");
        String title = call.getString("title", "[신한카드] 결제승인");
        String body = call.getString("body", "넷플릭스 17,000원(일시불) 정상승인 09/07");

        PaymentParser.ParsedPayment parsed = PaymentParser.parse(pkg, title, body);
        JSObject ret = new JSObject();
        if (parsed != null && parsed.isSubscription) {
            PaymentNotificationHelper.dispatchQuickAddNotification(getContext(), parsed);
            ret.put("detected", true);
            ret.put("serviceName", parsed.serviceName);
            ret.put("amount", parsed.amount);
            ret.put("plan", parsed.plan);
            ret.put("paymentMethod", parsed.paymentMethod);
        } else {
            ret.put("detected", false);
            ret.put("reason", "결제 또는 구독 정보 미감지");
        }
        call.resolve(ret);
    }

    /**
     * 기기 내 설치되어 있는 구독형 앱을 스캔하여 반환한다 (QUERY_ALL_PACKAGES 권한 없이 <queries>로 안전 조회).
     */
    @PluginMethod
    public void scanInstalledApps(PluginCall call) {
        Context context = getContext();
        List<PaymentPackageRegistry.SubscriptionAppSpec> installed =
                PaymentPackageRegistry.getInstalledSubscriptionApps(context);
        JSArray appsArray = new JSArray();
        for (PaymentPackageRegistry.SubscriptionAppSpec spec : installed) {
            JSObject item = new JSObject();
            item.put("packageName", spec.packageName);
            item.put("serviceId", spec.serviceId);
            item.put("serviceName", spec.serviceName);
            item.put("category", spec.category);
            item.put("plan", spec.defaultPlan);
            item.put("amount", spec.defaultAmount);
            appsArray.put(item);
        }
        JSObject ret = new JSObject();
        ret.put("apps", appsArray);
        ret.put("count", installed.size());
        call.resolve(ret);
    }

    /**
     * 현재 상태바에 남아 있는 결제/영수증/무료체험 알림을 즉시 스캔하여 반환한다.
     */
    @PluginMethod
    public void scanActiveNotifications(PluginCall call) {
        List<PaymentParser.ParsedPayment> payments =
                PaymentNotificationListener.scanActiveStatusBarNotifications();
        JSArray itemsArray = new JSArray();
        for (PaymentParser.ParsedPayment p : payments) {
            JSObject item = new JSObject();
            item.put("serviceId", p.serviceId);
            item.put("serviceName", p.serviceName);
            item.put("category", p.category);
            item.put("plan", p.plan);
            item.put("amount", p.amount);
            item.put("currency", p.currency);
            item.put("originalAmount", p.originalAmount);
            item.put("isEstimated", p.isEstimated);
            item.put("paymentMethod", p.paymentMethod);
            item.put("isTrial", p.isTrial);
            item.put("sourceChannel", p.sourceChannel);
            itemsArray.put(item);
        }
        JSObject ret = new JSObject();
        ret.put("items", itemsArray);
        ret.put("count", payments.size());
        call.resolve(ret);
    }

    /**
     * quick-add 일회용 nonce를 검증하고 소비한다.
     */
    @PluginMethod
    public void consumeQuickAddNonce(PluginCall call) {
        String nonce = call.getString("nonce", "");
        boolean valid = PaymentNotificationHelper.verifyAndConsumeNonce(getContext(), nonce);
        JSObject ret = new JSObject();
        ret.put("valid", valid);
        call.resolve(ret);
    }

    /**
     * 결제 알림 수집 출처(문자, 메신저, 이메일) 설정 조회
     */
    @PluginMethod
    public void getCaptureSourceSettings(PluginCall call) {
        PaymentPackageRegistry.CaptureSourceSettings settings =
                PaymentPackageRegistry.getCaptureSourceSettings(getContext());
        JSObject ret = new JSObject();
        ret.put("messaging", settings.captureMessaging);
        ret.put("messenger", settings.captureMessenger);
        ret.put("email", settings.captureEmail);
        call.resolve(ret);
    }

    /**
     * 결제 알림 수집 출처(문자, 메신저, 이메일) 설정 저장
     */
    @PluginMethod
    public void setCaptureSourceSettings(PluginCall call) {
        boolean messaging = call.getBoolean("messaging", false);
        boolean messenger = call.getBoolean("messenger", false);
        boolean email = call.getBoolean("email", false);
        PaymentPackageRegistry.setCaptureSourceSettings(getContext(), messaging, messenger, email);
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("messaging", messaging);
        ret.put("messenger", messenger);
        ret.put("email", email);
        call.resolve(ret);
    }
}

