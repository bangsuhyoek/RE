package com.submate.app;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "CancelBrowser")
public class CancelBrowserPlugin extends Plugin {

    private BroadcastReceiver completeReceiver;

    @PluginMethod
    public void checkOverlayPermission(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            ret.put("hasPermission", Settings.canDrawOverlays(getContext()));
        } else {
            ret.put("hasPermission", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(getContext())) {
            Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        JSObject ret = new JSObject();
        ret.put("status", "REQUESTED");
        call.resolve(ret);
    }

    @PluginMethod
    public void startFloatingGuide(PluginCall call) {
        String serviceId = call.getString("serviceId", "");
        String serviceName = call.getString("serviceName", "");
        String cancelUrl = call.getString("cancelUrl", "");
        String guideStepsJson = call.getArray("guideSteps") != null
                ? call.getArray("guideSteps").toString()
                : "[]";

        Context ctx = getContext();

        Intent serviceIntent = new Intent(ctx, OverlayGuideService.class);
        serviceIntent.putExtra("serviceId", serviceId);
        serviceIntent.putExtra("serviceName", serviceName);
        serviceIntent.putExtra("guideStepsJson", guideStepsJson);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(serviceIntent);
        } else {
            ctx.startService(serviceIntent);
        }

        if (cancelUrl != null && !cancelUrl.trim().isEmpty()) {
            try {
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(cancelUrl));
                browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(browserIntent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        registerCompleteListener();

        JSObject ret = new JSObject();
        ret.put("status", "STARTED");
        call.resolve(ret);
    }

    @PluginMethod
    public void stopFloatingGuide(PluginCall call) {
        Intent serviceIntent = new Intent(getContext(), OverlayGuideService.class);
        serviceIntent.setAction(OverlayGuideService.ACTION_STOP);
        getContext().startService(serviceIntent);

        JSObject ret = new JSObject();
        ret.put("status", "STOPPED");
        call.resolve(ret);
    }

    private void registerCompleteListener() {
        if (completeReceiver != null) return;
        completeReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                JSObject data = new JSObject();
                String service = intent.getStringExtra("serviceName");
                data.put("serviceName", service != null ? service : "");
                notifyListeners("onCancelCompleted", data);
            }
        };
        IntentFilter filter = new IntentFilter(OverlayGuideService.ACTION_COMPLETE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(completeReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(completeReceiver, filter);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (completeReceiver != null) {
            try {
                getContext().unregisterReceiver(completeReceiver);
            } catch (Exception ignored) {}
            completeReceiver = null;
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void open(PluginCall call) {
        String serviceId = call.getString("serviceId", "");
        String serviceName = call.getString("serviceName", "");
        String cancelUrl = call.getString("cancelUrl", "");
        String guideStepsJson = call.getArray("guideSteps") != null
                ? call.getArray("guideSteps").toString()
                : "[]";

        Intent intent = new Intent(getContext(), CancelBrowserActivity.class);
        intent.putExtra("serviceId", serviceId);
        intent.putExtra("serviceName", serviceName);
        intent.putExtra("cancelUrl", cancelUrl);
        intent.putExtra("guideStepsJson", guideStepsJson);

        startActivityForResult(call, intent, "handleCancelBrowserResult");
    }

    @ActivityCallback
    private void handleCancelBrowserResult(PluginCall call, ActivityResult result) {
        JSObject ret = new JSObject();
        if (result != null && result.getResultCode() == Activity.RESULT_OK) {
            ret.put("action", "COMPLETED");
        } else {
            ret.put("action", "CLOSED");
        }
        call.resolve(ret);
    }
}
