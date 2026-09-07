package com.submate.app;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "CancelBrowser")
public class CancelBrowserPlugin extends Plugin {

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
