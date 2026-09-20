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
import com.submate.app.webguide.WebSecurityPolicy;
import org.json.JSONArray;
import java.util.ArrayList;
import java.util.List;

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
        String allowedDomainsJson = call.getArray("allowedDomains") != null
                ? call.getArray("allowedDomains").toString()
                : "[]";
        String guideMode = call.getString("guideMode", "MANUAL_OFFICIAL");
        String fallbackOfficialUrl = call.getString("fallbackOfficialUrl", "");

        Context ctx = getContext();

        Intent serviceIntent = new Intent(ctx, OverlayGuideService.class);
        serviceIntent.putExtra("serviceId", serviceId);
        serviceIntent.putExtra("serviceName", serviceName);
        serviceIntent.putExtra("guideStepsJson", guideStepsJson);
        serviceIntent.putExtra("allowedDomainsJson", allowedDomainsJson);
        serviceIntent.putExtra("guideMode", guideMode);
        serviceIntent.putExtra("fallbackOfficialUrl", fallbackOfficialUrl);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(serviceIntent);
        } else {
            ctx.startService(serviceIntent);
        }

        if (cancelUrl != null && !cancelUrl.trim().isEmpty()) {
            try {
                Uri target = Uri.parse(cancelUrl);
                WebSecurityPolicy policy = new WebSecurityPolicy(parseAllowedDomains(allowedDomainsJson, cancelUrl));
                if (policy.isAllowedHttpUrl(target)) {
                    Intent browserIntent = new Intent(Intent.ACTION_VIEW, target);
                    browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(browserIntent);
                }
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
        String allowedDomainsJson = call.getArray("allowedDomains") != null
                ? call.getArray("allowedDomains").toString()
                : "[]";
        String guideMode = call.getString("guideMode", "MANUAL_OFFICIAL");
        String officialSourceUrl = call.getString("officialSourceUrl", "");
        String fallbackOfficialUrl = call.getString("fallbackOfficialUrl", "");

        Intent intent = new Intent(getContext(), CancelBrowserActivity.class);
        intent.putExtra("serviceId", serviceId);
        intent.putExtra("serviceName", serviceName);
        intent.putExtra("cancelUrl", cancelUrl);
        intent.putExtra("guideStepsJson", guideStepsJson);
        intent.putExtra("allowedDomainsJson", allowedDomainsJson);
        intent.putExtra("guideMode", guideMode);
        intent.putExtra("officialSourceUrl", officialSourceUrl);
        intent.putExtra("fallbackOfficialUrl", fallbackOfficialUrl);

        startActivityForResult(call, intent, "handleCancelBrowserResult");
    }

    private List<String> parseAllowedDomains(String json, String entryUrl) {
        List<String> domains = new ArrayList<>();
        try {
            JSONArray array = new JSONArray(json == null ? "[]" : json);
            for (int i = 0; i < array.length(); i++) {
                String domain = array.optString(i, "").trim();
                if (!domain.isEmpty() && !domains.contains(domain)) {
                    domains.add(domain);
                }
            }
        } catch (Exception ignored) {
        }
        if (domains.isEmpty() && entryUrl != null && !entryUrl.trim().isEmpty()) {
            Uri uri = Uri.parse(entryUrl);
            if ("https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null) {
                domains.add(uri.getHost());
            }
        }
        return domains;
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
