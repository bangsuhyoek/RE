package kr.co.re.subscription;

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import kr.co.re.subscription.payment.PaymentCapturePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PaymentCapturePlugin.class);
        super.onCreate(savedInstanceState);

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

        // 권한이 이미 허용된 재설치/복귀 상황에서도 listener binding을 한 번 복구한다.
        PaymentCapturePlugin.ensureListenerConnected(this);
    }

    @Override
    public void onResume() {
        super.onResume();
        // Android 설정에서 돌아왔거나 OEM이 listener를 끊은 경우 실제 OS 상태를 기준으로 재연결한다.
        PaymentCapturePlugin.ensureListenerConnected(this);
    }
}
