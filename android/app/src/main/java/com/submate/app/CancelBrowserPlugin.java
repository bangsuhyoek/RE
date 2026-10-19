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
    public void checkOverlayPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("hasPermission", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("status", "UNSUPPORTED");
        call.resolve(ret);
    }

    @PluginMethod
    public void startFloatingGuide(PluginCall call) {
        call.reject("플로팅 가이드 기능은 더 이상 지원되지 않습니다. 인앱 해지 브라우저를 이용해 주세요.", "UNSUPPORTED");
    }

    @PluginMethod
    public void stopFloatingGuide(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("status", "STOPPED");
        call.resolve(ret);
    }

    @PluginMethod
    public void open(PluginCall call) {
        String serviceId = call.getString("serviceId", "");
        String serviceName = call.getString("serviceName", "");
        String cancelUrl = call.getString("cancelUrl", "");
        String guideStepsJson = call.getArray("guideSteps") != null
                ? call.getArray("guideSteps").toString()
                : "[]";
        String aiEndpoint = call.getString("aiEndpoint", "");
        String aiAuthToken = call.getString("aiAuthToken", "");

        Intent intent = new Intent(getContext(), CancelBrowserActivity.class);
        intent.putExtra("serviceId", serviceId);
        intent.putExtra("serviceName", serviceName);
        intent.putExtra("cancelUrl", cancelUrl);
        intent.putExtra("guideStepsJson", guideStepsJson);
        intent.putExtra("aiEndpoint", aiEndpoint);
        intent.putExtra("aiAuthToken", aiAuthToken);

        startActivityForResult(call, intent, "handleCancelBrowserResult");
    }

    @ActivityCallback
    private void handleCancelBrowserResult(PluginCall call, ActivityResult result) {
        Intent data = result != null ? result.getData() : null;

        String serviceId = (data != null && data.hasExtra("serviceId"))
                ? data.getStringExtra("serviceId")
                : "";

        String status = "closed";
        if (data != null && data.hasExtra("status")) {
            status = data.getStringExtra("status");
        } else if (result != null && result.getResultCode() == Activity.RESULT_OK) {
            status = "completed";
        }

        String detectedBy = (data != null && data.hasExtra("detectedBy"))
                ? data.getStringExtra("detectedBy")
                : null;

        String url = (data != null && data.hasExtra("url"))
                ? data.getStringExtra("url")
                : "";

        String proofPath = (data != null && data.hasExtra("proofPath"))
                ? data.getStringExtra("proofPath")
                : null;

        String proofWebPath = (data != null && data.hasExtra("proofWebPath"))
                ? data.getStringExtra("proofWebPath")
                : null;

        int autoTaps = (data != null && data.hasExtra("autoTaps"))
                ? data.getIntExtra("autoTaps", 0)
                : 0;

        if (proofWebPath == null && proofPath != null) {
            String localUrl = (getBridge() != null && getBridge().getLocalUrl() != null)
                    ? getBridge().getLocalUrl()
                    : "https://localhost";
            proofWebPath = localUrl + "/_capacitor_file_" + proofPath;
        }

        JSObject eventObj = new JSObject();
        eventObj.put("serviceId", serviceId);
        eventObj.put("status", status);
        eventObj.put("detectedBy", detectedBy);
        eventObj.put("url", url);
        eventObj.put("proofPath", proofPath);
        eventObj.put("proofWebPath", proofWebPath);
        eventObj.put("autoTaps", autoTaps);
        notifyListeners("cancelFlowResult", eventObj);

        JSObject ret = new JSObject();
        ret.put("action", "completed".equalsIgnoreCase(status) ? "COMPLETED" : "CLOSED");
        ret.put("serviceId", serviceId);
        ret.put("status", status);
        ret.put("detectedBy", detectedBy);
        ret.put("url", url);
        ret.put("proofPath", proofPath);
        ret.put("proofWebPath", proofWebPath);
        ret.put("autoTaps", autoTaps);
        call.resolve(ret);
    }

    /**
     * 결제 허브 화면을 인앱 브라우저로 열고, 사용자가 [이 화면 불러오기]를 누르면 화면 글을 돌려준다.
     * 로그인은 사용자가 직접 하고, 꾸독은 보이는 글만 받는다.
     */
    @PluginMethod
    public void crawlHub(PluginCall call) {
        String url = call.getString("url", "");
        if (url == null || !url.startsWith("https://")) {
            call.reject("https 주소만 열 수 있어요.", "INVALID_URL");
            return;
        }
        Intent intent = new Intent(getContext(), CancelBrowserActivity.class);
        intent.putExtra("mode", "crawl");
        intent.putExtra("serviceId", call.getString("hubId", ""));
        intent.putExtra("serviceName", call.getString("hubName", "결제 허브"));
        intent.putExtra("cancelUrl", url);
        intent.putExtra("guideStepsJson", "[]");
        startActivityForResult(call, intent, "handleCrawlHubResult");
    }

    @ActivityCallback
    private void handleCrawlHubResult(PluginCall call, ActivityResult result) {
        Intent data = result != null ? result.getData() : null;
        String status = (data != null && data.hasExtra("status")) ? data.getStringExtra("status") : "closed";
        JSObject ret = new JSObject();
        ret.put("status", "crawled".equals(status) ? "crawled" : "closed");
        ret.put("text", (data != null && data.hasExtra("crawledText")) ? data.getStringExtra("crawledText") : "");
        ret.put("url", (data != null && data.hasExtra("url")) ? data.getStringExtra("url") : "");
        call.resolve(ret);
    }
}
