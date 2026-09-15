package com.submate.app.payment;

import android.app.NotificationManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.service.notification.NotificationListenerService;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PaymentCapture")
public class PaymentCapturePlugin extends Plugin {
    private static final String TAG = "REPaymentCapture";
    private static final long REBIND_COOLDOWN_MS = 15_000L;
    private static volatile long lastRebindRequestAt = 0L;

    private ComponentName listenerComponent(Context context) {
        return new ComponentName(context, PaymentNotificationListener.class);
    }

    public static boolean hasListenerAccess(Context context) {
        if (context == null) return false;
        ComponentName component = new ComponentName(context, PaymentNotificationListener.class);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                NotificationManager nm =
                        (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                return nm != null && nm.isNotificationListenerAccessGranted(component);
            }
            String enabled = Settings.Secure.getString(
                    context.getContentResolver(), "enabled_notification_listeners");
            return enabled != null && enabled.contains(context.getPackageName());
        } catch (Exception ignored) {
            String enabled = Settings.Secure.getString(
                    context.getContentResolver(), "enabled_notification_listeners");
            return enabled != null && enabled.contains(context.getPackageName());
        }
    }

    public static boolean ensureListenerConnected(Context context) {
        if (!hasListenerAccess(context)) return false;
        if (PaymentNotificationListener.isConnected()) return true;

        long now = System.currentTimeMillis();
        if (now - lastRebindRequestAt < REBIND_COOLDOWN_MS) return false;
        lastRebindRequestAt = now;

        try {
            NotificationListenerService.requestRebind(
                    new ComponentName(context, PaymentNotificationListener.class));
            Log.i(TAG, "notification listener rebind requested");
        } catch (Exception error) {
            Log.w(TAG, "notification listener rebind failed", error);
        }
        return PaymentNotificationListener.isConnected();
    }

    private JSObject listenerState(Context context, boolean requestRebind) {
        boolean access = hasListenerAccess(context);
        boolean connected = PaymentNotificationListener.isConnected();
        boolean rebindRequested = false;

        if (access && !connected && requestRebind) {
            long before = lastRebindRequestAt;
            ensureListenerConnected(context);
            rebindRequested = lastRebindRequestAt != before;
            connected = PaymentNotificationListener.isConnected();
        }

        JSObject result = new JSObject();
        result.put("hasPermission", access);
        result.put("hasAccess", access);
        result.put("connected", connected);
        result.put("rebindRequested", rebindRequested);
        result.put("lastConnectedAt", PaymentNotificationListener.getLastConnectedAt());
        return result;
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        call.resolve(listenerState(getContext(), true));
    }

    @PluginMethod
    public void checkListenerAccess(PluginCall call) {
        call.resolve(listenerState(getContext(), false));
    }

    @PluginMethod
    public void checkListenerConnection(PluginCall call) {
        call.resolve(listenerState(getContext(), false));
    }

    @PluginMethod
    public void requestListenerRebind(PluginCall call) {
        Context context = getContext();
        boolean access = hasListenerAccess(context);
        boolean before = PaymentNotificationListener.isConnected();
        if (access && !before) ensureListenerConnected(context);
        JSObject result = listenerState(context, false);
        result.put("requested", access && !before);
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
