package com.submate.app.payment;

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
}
