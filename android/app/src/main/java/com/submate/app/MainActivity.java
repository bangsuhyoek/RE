package com.submate.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.submate.app.payment.PaymentCapturePlugin;

import java.io.File;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CancelBrowserPlugin.class);
        registerPlugin(DeviceAuthPlugin.class);
        registerPlugin(PaymentCapturePlugin.class);
        registerPlugin(SystemIntentsPlugin.class);
        super.onCreate(savedInstanceState);

        cleanupLegacyCharacterAssets();

        // 안드로이드 시스템 메뉴바(뒤로가기/홈/목록) 및 상단 상태바에 맞춰 앱 크기 자동 조정
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                Insets systemBars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                );
                Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
                int bottomPadding = Math.max(systemBars.bottom, ime.bottom);
                v.setPadding(systemBars.left, systemBars.top, systemBars.right, bottomPadding);
                return WindowInsetsCompat.CONSUMED;
            });
        }
    }

    private void cleanupLegacyCharacterAssets() {
        new Thread(() -> {
            try {
                File charDir = new File(getFilesDir(), "character");
                if (charDir.exists()) {
                    File[] files = charDir.listFiles();
                    if (files != null) {
                        for (File f : files) {
                            f.delete();
                        }
                    }
                    charDir.delete();
                }

                SharedPreferences prefs = getSharedPreferences("kkudok_character_asset", Context.MODE_PRIVATE);
                if (prefs != null) {
                    prefs.edit().clear().apply();
                }
            } catch (Exception ignored) {
                // best-effort cleanup on app start
            }
        }).start();
    }
}
