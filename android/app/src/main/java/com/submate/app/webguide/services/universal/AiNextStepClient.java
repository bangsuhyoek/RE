package com.submate.app.webguide.services.universal;

import android.os.Handler;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AiNextStepClient {
    public static final int CONNECT_TIMEOUT_MS = 1500;
    public static final int READ_TIMEOUT_MS = 2000;

    public interface Callback {
        void onResponse(AiResponse response);
    }

    public static final class AiResponse {
        public final Integer index;
        public final String kind;
        public final double confidence;

        public AiResponse(Integer index, String kind, double confidence) {
            this.index = index;
            this.kind = (kind != null) ? kind.trim() : "none";
            this.confidence = confidence;
        }

        public static AiResponse none() {
            return new AiResponse(null, "none", 0.0);
        }
    }

    public static final class ElementDto {
        public final int i;
        public final String text;
        public final String rawText;
        public final String role;
        public final String tag;
        public final boolean inDialog;

        public ElementDto(int i, String text, String role, String tag, boolean inDialog) {
            this(i, text, text, role, tag, inDialog);
        }

        public ElementDto(int i, String text, String rawText, String role, String tag, boolean inDialog) {
            this.i = i;
            this.text = text != null ? text : "";
            this.rawText = rawText != null && !rawText.isEmpty() ? rawText : this.text;
            this.role = role != null ? role : "";
            this.tag = tag != null ? tag : "";
            this.inDialog = inDialog;
        }
    }

    public static final class RequestDto {
        public final String serviceName;
        public final String host;
        public final String pageTitle;
        public final List<String> history;
        public final List<ElementDto> elements;

        public RequestDto(String serviceName, String host, String pageTitle, List<String> history, List<ElementDto> elements) {
            this.serviceName = serviceName != null ? serviceName : "";
            this.host = host != null ? host : "";
            this.pageTitle = pageTitle != null ? pageTitle : "";
            this.history = history;
            this.elements = elements;
        }
    }

    private final String endpoint;
    private final String authToken;
    private final ExecutorService executor;
    private final Handler mainHandler;

    public AiNextStepClient(String endpoint, String authToken) {
        this(endpoint, authToken, Executors.newSingleThreadExecutor(), createMainHandlerSafely());
    }

    private static Handler createMainHandlerSafely() {
        try {
            Looper looper = Looper.getMainLooper();
            if (looper != null) {
                return new Handler(looper);
            }
        } catch (Throwable ignored) {}
        return null;
    }

    public AiNextStepClient(String endpoint, String authToken, ExecutorService executor, Handler mainHandler) {
        this.endpoint = endpoint != null ? endpoint.trim() : "";
        this.authToken = authToken != null ? authToken.trim() : "";
        this.executor = executor;
        this.mainHandler = mainHandler;
    }

    public boolean isEnabled() {
        return endpoint.startsWith("https://") && !authToken.isEmpty();
    }

    public String getEndpoint() {
        return endpoint;
    }

    public void requestNextStep(RequestDto request, Callback callback) {
        if (callback == null) return;
        if (!isEnabled()) {
            deliverResult(callback, AiResponse.none());
            return;
        }

        executor.execute(() -> {
            AiResponse result = performNetworkCall(request);
            deliverResult(callback, result);
        });
    }

    private void deliverResult(Callback callback, AiResponse result) {
        if (mainHandler != null && Looper.myLooper() != mainHandler.getLooper()) {
            mainHandler.post(() -> callback.onResponse(result));
        } else {
            callback.onResponse(result);
        }
    }

    private AiResponse performNetworkCall(RequestDto request) {
        HttpURLConnection conn = null;
        try {
            JSONObject body = new JSONObject();
            body.put("serviceName", request != null ? request.serviceName : "");
            body.put("host", request != null ? request.host : "");
            body.put("pageTitle", request != null ? request.pageTitle : "");

            JSONArray histArr = new JSONArray();
            if (request != null && request.history != null) {
                int start = Math.max(0, request.history.size() - 10);
                for (int i = start; i < request.history.size(); i++) {
                    String h = request.history.get(i);
                    if (h != null) histArr.put(h);
                }
            }
            body.put("history", histArr);

            JSONArray elemArr = new JSONArray();
            if (request != null && request.elements != null) {
                int limit = Math.min(60, request.elements.size());
                for (int i = 0; i < limit; i++) {
                    ElementDto el = request.elements.get(i);
                    if (el == null) continue;
                    JSONObject eObj = new JSONObject();
                    eObj.put("i", el.i);
                    eObj.put("text", el.text);
                    eObj.put("role", el.role);
                    eObj.put("tag", el.tag);
                    eObj.put("inDialog", el.inDialog);
                    elemArr.put(eObj);
                }
            }
            body.put("elements", elemArr);

            URL url = new URL(endpoint);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
            conn.setReadTimeout(READ_TIMEOUT_MS);
            conn.setDoOutput(true);
            conn.setDoInput(true);
            conn.setUseCaches(false);
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setRequestProperty("Authorization", "Bearer " + authToken);

            byte[] jsonBytes = body.toString().getBytes(StandardCharsets.UTF_8);
            conn.setFixedLengthStreamingMode(jsonBytes.length);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(jsonBytes);
                os.flush();
            }

            int code = conn.getResponseCode();
            if (code != 200) {
                return AiResponse.none();
            }

            StringBuilder sb = new StringBuilder();
            try (InputStream is = conn.getInputStream();
                 BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                String line;
                while ((line = br.readLine()) != null) {
                    sb.append(line);
                }
            }

            return parseAiResponse(sb.toString(), request != null ? request.elements : null);
        } catch (Exception ignored) {
            return AiResponse.none();
        } finally {
            if (conn != null) {
                try {
                    conn.disconnect();
                } catch (Exception ignored) {}
            }
        }
    }

    public static AiResponse parseAiResponse(String responseJson, List<ElementDto> elements) {
        if (responseJson == null || responseJson.trim().isEmpty()) {
            return AiResponse.none();
        }
        try {
            String kind = "none";
            double confidence = 0.0;
            Integer index = null;
            boolean hasIndex = false;
            boolean jsonParsed = false;

            try {
                JSONObject obj = new JSONObject(responseJson);
                if (obj.has("kind") || obj.has("index") || obj.has("confidence")) {
                    jsonParsed = true;
                    kind = obj.optString("kind", "none");
                    confidence = obj.optDouble("confidence", 0.0);
                    if (obj.has("index") && !obj.isNull("index")) {
                        index = obj.getInt("index");
                        hasIndex = true;
                    }
                }
            } catch (Throwable ignored) {}

            if (!jsonParsed) {
                java.util.regex.Matcher km = java.util.regex.Pattern.compile("\"kind\"\\s*:\\s*\"([^\"]+)\"").matcher(responseJson);
                if (km.find()) {
                    kind = km.group(1);
                    jsonParsed = true;
                }
                java.util.regex.Matcher cm = java.util.regex.Pattern.compile("\"confidence\"\\s*:\\s*([0-9.]+)").matcher(responseJson);
                if (cm.find()) {
                    try {
                        confidence = Double.parseDouble(cm.group(1));
                        jsonParsed = true;
                    } catch (Exception ignored) {}
                }
                java.util.regex.Matcher im = java.util.regex.Pattern.compile("\"index\"\\s*:\\s*([0-9]+)").matcher(responseJson);
                if (im.find()) {
                    try {
                        index = Integer.parseInt(im.group(1));
                        hasIndex = true;
                        jsonParsed = true;
                    } catch (Exception ignored) {}
                }
            }

            if (!jsonParsed) {
                return AiResponse.none();
            }

            if (Double.isNaN(confidence) || confidence < 0.0) confidence = 0.0;
            if (confidence > 1.0) confidence = 1.0;

            if (hasIndex && index != null) {
                if (elements != null && !elements.isEmpty()) {
                    boolean found = false;
                    for (ElementDto e : elements) {
                        if (e != null && e.i == index.intValue()) {
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        return AiResponse.none();
                    }
                }
            }

            return new AiResponse(index, kind, confidence);
        } catch (Exception e) {
            return AiResponse.none();
        }
    }
}
