package com.submate.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.provider.CalendarContract;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * 권한 없이 쓰는 시스템 인텐트 모음.
 * - 공유받기: 다른 앱에서 '공유'로 보낸 글(text/plain)이나 이미지(image/*)를 받아 JS에 넘긴다.
 * - 캘린더 추가: ACTION_INSERT로 캘린더 앱의 일정 화면을 채워 연다. 저장은 사용자가 하므로 캘린더 권한이 필요 없다.
 */
@CapacitorPlugin(name = "SystemIntents")
public class SystemIntentsPlugin extends Plugin {
    private static final int MAX_IMAGE_BYTES = 8 * 1024 * 1024;
    private JSObject pending;

    @Override
    public void load() {
        Intent launchIntent = getActivity().getIntent();
        if (readShare(launchIntent)) {
            // 화면 회전 등으로 다시 만들어질 때 같은 공유를 두 번 처리하지 않게 비운다.
            getActivity().setIntent(new Intent(Intent.ACTION_MAIN));
        }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (readShare(intent) && pending != null) {
            notifyListeners("shareReceived", pending);
            pending = null;
        }
    }

    @PluginMethod
    public void getPending(PluginCall call) {
        JSObject result = pending != null ? pending : new JSObject();
        pending = null;
        call.resolve(result);
    }

    private boolean readShare(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return false;
        String type = intent.getType();
        if (type == null) return false;
        JSObject shared = new JSObject();
        if (type.startsWith("text/")) {
            CharSequence text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
            if (text == null || text.toString().trim().isEmpty()) return false;
            shared.put("type", "text");
            shared.put("text", text.toString());
        } else if (type.startsWith("image/")) {
            Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (uri == null) return false;
            String mimeType = getContext().getContentResolver().getType(uri);
            shared.put("type", "image");
            shared.put("mimeType", mimeType != null ? mimeType : type);
            try (InputStream input = getContext().getContentResolver().openInputStream(uri)) {
                if (input == null) return false;
                ByteArrayOutputStream output = new ByteArrayOutputStream();
                byte[] buffer = new byte[16384];
                int read;
                int total = 0;
                while ((read = input.read(buffer)) != -1) {
                    total += read;
                    if (total > MAX_IMAGE_BYTES) {
                        shared.put("error", "IMAGE_TOO_LARGE");
                        pending = shared;
                        return true;
                    }
                    output.write(buffer, 0, read);
                }
                shared.put("base64", Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP));
            } catch (Exception e) {
                shared.put("error", "READ_FAILED");
            }
        } else {
            return false;
        }
        pending = shared;
        return true;
    }

    /** 정산 요청 문구 등을 카카오톡·문자 같은 앱으로 보낸다. 받는 앱은 사용자가 고른다. */
    @PluginMethod
    public void shareText(PluginCall call) {
        String text = call.getString("text", "");
        String title = call.getString("title", "공유하기");
        if (text == null || text.isEmpty()) {
            call.reject("보낼 내용이 없어요.", "EMPTY_TEXT");
            return;
        }
        Intent send = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text);
        try {
            getActivity().startActivity(Intent.createChooser(send, title));
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("보낼 앱을 찾지 못했어요.", "NO_SHARE_APP");
        }
    }

    @PluginMethod
    public void addCalendarEvent(PluginCall call) {
        String title = call.getString("title", "");
        String description = call.getString("description", "");
        Long begin = call.getLong("beginTime");
        Long end = call.getLong("endTime");
        String rrule = call.getString("rrule");
        if (begin == null || end == null) {
            call.reject("beginTime과 endTime이 필요합니다.", "INVALID_EVENT");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_INSERT)
                .setData(CalendarContract.Events.CONTENT_URI)
                .putExtra(CalendarContract.Events.TITLE, title)
                .putExtra(CalendarContract.Events.DESCRIPTION, description)
                .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, begin.longValue())
                .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, end.longValue())
                .putExtra(CalendarContract.EXTRA_EVENT_ALL_DAY, Boolean.TRUE.equals(call.getBoolean("allDay", true)));
        if (rrule != null && !rrule.isEmpty()) {
            intent.putExtra(CalendarContract.Events.RRULE, rrule);
        }
        try {
            getActivity().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("status", "OPENED");
            call.resolve(ret);
        } catch (ActivityNotFoundException e) {
            call.reject("캘린더 앱을 찾지 못했어요.", "NO_CALENDAR_APP");
        }
    }
}
