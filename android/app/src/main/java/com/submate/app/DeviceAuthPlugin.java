package com.submate.app;

import static androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK;
import static androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 꾸독 "항상 허용" 범위를 만들기 전 본인 확인.
 * 지문·얼굴 또는 기기 잠금(PIN·패턴·비밀번호)으로 확인하고, 성공 여부와 방식만 돌려준다. 생체 정보는 앱이 받지 않는다.
 */
@CapacitorPlugin(name = "DeviceAuth")
public class DeviceAuthPlugin extends Plugin {

    // BIOMETRIC_WEAK | DEVICE_CREDENTIAL 조합은 Android 7(minSdk 24)부터 모두 지원된다.
    private static final int AUTHENTICATORS = BIOMETRIC_WEAK | DEVICE_CREDENTIAL;

    @PluginMethod
    public void authenticate(PluginCall call) {
        String title = call.getString("title", "본인 확인");
        String subtitle = call.getString("subtitle", "");

        getActivity().runOnUiThread(() -> {
            int availability = BiometricManager.from(getContext()).canAuthenticate(AUTHENTICATORS);
            if (availability != BiometricManager.BIOMETRIC_SUCCESS) {
                resolve(call, false, null, availability == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED ? "not_enrolled" : "unavailable");
                return;
            }

            AtomicBoolean settled = new AtomicBoolean(false);
            BiometricPrompt prompt = new BiometricPrompt(
                (FragmentActivity) getActivity(),
                ContextCompat.getMainExecutor(getContext()),
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                        if (!settled.compareAndSet(false, true)) return;
                        String method = result.getAuthenticationType() == BiometricPrompt.AUTHENTICATION_RESULT_TYPE_BIOMETRIC
                            ? "biometric"
                            : "device_credential";
                        resolve(call, true, method, null);
                    }

                    @Override
                    public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                        if (!settled.compareAndSet(false, true)) return;
                        boolean cancelled = errorCode == BiometricPrompt.ERROR_USER_CANCELED
                            || errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON
                            || errorCode == BiometricPrompt.ERROR_CANCELED;
                        resolve(call, false, null, cancelled ? "cancelled" : "error");
                    }
                }
            );

            BiometricPrompt.PromptInfo.Builder builder = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setAllowedAuthenticators(AUTHENTICATORS);
            if (!subtitle.isEmpty()) builder.setSubtitle(subtitle);
            prompt.authenticate(builder.build());
        });
    }

    private void resolve(PluginCall call, boolean verified, String method, String reason) {
        JSObject result = new JSObject();
        result.put("verified", verified);
        if (method != null) result.put("method", method);
        if (reason != null) result.put("reason", reason);
        call.resolve(result);
    }
}
