package com.submate.app.payment;

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

    @PluginMethod
    public void checkPermission(PluginCall call) {
        Context context = getContext();
        boolean granted = false;
        if (context != null) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                    NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                    granted = nm != null && nm.isNotificationListenerAccessGranted(listenerComponent(context));
                } else {
                    String enabled = Settings.Secure.getString(context.getContentResolver(), "enabled_notification_listeners");
                    granted = enabled != null && enabled.contains(context.getPackageName());
                }
            } catch (Exception ignored) {
                String enabled = Settings.Secure.getString(context.getContentResolver(), "enabled_notification_listeners");
                granted = enabled != null && enabled.contains(context.getPackageName());
            }
        }
        JSObject result = new JSObject();
        result.put("hasPermission", granted);
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
                    intent.putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                            listenerComponent(context).flattenToString());
                } else {
                    intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                opened = true;
            } catch (Exception first) {
                try {
                    Intent fallback = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(fallback);
                    opened = true;
                } catch (Exception ignored) {
                    opened = false;
                }
            }
        }
        JSObject result = new JSObject();
        result.put("opened", opened);
        result.put("status", opened ? "OPENED" : "FAILED");
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
        if (enabled == null) {
            call.reject("enabled is required");
            return;
        }
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

    @PluginMethod
    public void simulatePayment(PluginCall call) {
        String pkg = call.getString("package", "com.samsung.android.messaging");
        String title = call.getString("title", "[유튜브 프리미엄]");
        String body = call.getString("body", "정기 구독 결제가 완료되었습니다. 결제금액 19,000원 이용상품 유튜브 프리미엄");

        PaymentParser.ParsedPayment parsed = PaymentParser.parse(pkg, title, body);
        JSObject result = new JSObject();
        if (parsed != null && parsed.isSubscription) {
            String candidateId = PaymentCandidateStore.save(getContext(), parsed);
            PaymentNotificationHelper.dispatch(getContext(), candidateId, parsed);
            result.put("detected", true);
            result.put("serviceName", parsed.serviceName);
            result.put("amount", parsed.amount);
            result.put("plan", parsed.plan);
            result.put("paymentMethod", parsed.paymentMethod);
            result.put("candidateId", candidateId);
        } else {
            result.put("detected", false);
            result.put("reason", "결제 또는 구독 정보 미감지");
        }
        call.resolve(result);
    }
}
