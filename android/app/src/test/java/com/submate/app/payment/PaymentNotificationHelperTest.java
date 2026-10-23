package com.submate.app.payment;

import android.content.SharedPreferences;
import org.junit.Before;
import org.junit.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import static org.junit.Assert.*;

public class PaymentNotificationHelperTest {

    private FakeSharedPreferences fakePrefs;

    @Before
    public void setUp() {
        fakePrefs = new FakeSharedPreferences();
    }

    @Test
    public void testGenerateAndVerifyNonce() {
        String nonce = PaymentNotificationHelper.generateNonceWithPrefs(fakePrefs);
        assertNotNull("생성된 nonce는 null이 아니어야 합니다.", nonce);
        assertFalse("nonce는 비어있지 않아야 합니다.", nonce.isEmpty());

        // 첫 번째 검증: 유효하고 소비됨
        boolean valid = PaymentNotificationHelper.verifyAndConsumeNonceWithPrefs(fakePrefs, nonce);
        assertTrue("첫 번째 검증은 성공해야 합니다.", valid);

        // 두 번째 검증: 이미 소비되었으므로 실패 (일회용)
        boolean replay = PaymentNotificationHelper.verifyAndConsumeNonceWithPrefs(fakePrefs, nonce);
        assertFalse("소비된 nonce의 재검증은 실패해야 합니다.", replay);
    }

    @Test
    public void testExpiredNonceRejected() {
        String nonce = "expired-test-nonce";
        // 만료 시각을 10초 전으로 설정
        fakePrefs.data.put(nonce, System.currentTimeMillis() - 10000L);

        boolean valid = PaymentNotificationHelper.verifyAndConsumeNonceWithPrefs(fakePrefs, nonce);
        assertFalse("만료된 nonce는 거부되어야 합니다.", valid);
    }

    @Test
    public void testNonExistentNonceRejected() {
        boolean valid = PaymentNotificationHelper.verifyAndConsumeNonceWithPrefs(fakePrefs, "unknown-nonce");
        assertFalse("존재하지 않는 nonce는 거부되어야 합니다.", valid);
    }

    // 간단한 인메모리 FakeSharedPreferences 구현
    private static class FakeSharedPreferences implements SharedPreferences {
        final Map<String, Object> data = new HashMap<>();

        @Override
        public Map<String, ?> getAll() {
            return new HashMap<>(data);
        }

        @Override
        public String getString(String key, String defValue) { return (String) data.getOrDefault(key, defValue); }

        @Override
        public Set<String> getStringSet(String key, Set<String> defValues) { return (Set<String>) data.getOrDefault(key, defValues); }

        @Override
        public int getInt(String key, int defValue) { return (Integer) data.getOrDefault(key, defValue); }

        @Override
        public long getLong(String key, long defValue) {
            Object v = data.get(key);
            return v instanceof Long ? (Long) v : defValue;
        }

        @Override
        public float getFloat(String key, float defValue) { return (Float) data.getOrDefault(key, defValue); }

        @Override
        public boolean getBoolean(String key, boolean defValue) { return (Boolean) data.getOrDefault(key, defValue); }

        @Override
        public boolean contains(String key) { return data.containsKey(key); }

        @Override
        public Editor edit() {
            return new FakeEditor(this);
        }

        @Override
        public void registerOnSharedPreferenceChangeListener(OnSharedPreferenceChangeListener listener) {}

        @Override
        public void unregisterOnSharedPreferenceChangeListener(OnSharedPreferenceChangeListener listener) {}
    }

    private static class FakeEditor implements SharedPreferences.Editor {
        private final FakeSharedPreferences prefs;
        private final Map<String, Object> delta = new HashMap<>();
        private boolean clearRequested = false;

        FakeEditor(FakeSharedPreferences prefs) {
            this.prefs = prefs;
        }

        @Override
        public SharedPreferences.Editor putString(String key, String value) { delta.put(key, value); return this; }

        @Override
        public SharedPreferences.Editor putStringSet(String key, Set<String> values) { delta.put(key, values); return this; }

        @Override
        public SharedPreferences.Editor putInt(String key, int value) { delta.put(key, value); return this; }

        @Override
        public SharedPreferences.Editor putLong(String key, long value) { delta.put(key, value); return this; }

        @Override
        public SharedPreferences.Editor putFloat(String key, float value) { delta.put(key, value); return this; }

        @Override
        public SharedPreferences.Editor putBoolean(String key, boolean value) { delta.put(key, value); return this; }

        @Override
        public SharedPreferences.Editor remove(String key) { delta.put(key, this); return this; }

        @Override
        public SharedPreferences.Editor clear() { clearRequested = true; return this; }

        @Override
        public boolean commit() {
            apply();
            return true;
        }

        @Override
        public void apply() {
            if (clearRequested) {
                prefs.data.clear();
            }
            for (Map.Entry<String, Object> entry : delta.entrySet()) {
                if (entry.getValue() == this) {
                    prefs.data.remove(entry.getKey());
                } else {
                    prefs.data.put(entry.getKey(), entry.getValue());
                }
            }
            delta.clear();
        }
    }
}

