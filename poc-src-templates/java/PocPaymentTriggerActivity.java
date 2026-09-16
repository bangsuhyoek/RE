package kr.co.re.subscription.payment;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;

public class PocPaymentTriggerActivity extends Activity {
    private static final String TAG = "REPocTrigger";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        boolean forceNew = getIntent() == null || getIntent().getBooleanExtra("force_new", true);
        boolean conciergeEnabled = getIntent() == null || getIntent().getBooleanExtra("concierge_enabled", true);
        boolean candidateAlertEnabled = getIntent() == null || getIntent().getBooleanExtra("candidate_alert_enabled", true);

        if (forceNew) KnownSubscriptionSnapshotStore.syncEmptyForPoc(this);
        ConciergePreferences.setEnabled(this, conciergeEnabled);
        PaymentCapturePreferences.setCandidateNotificationsEnabled(this, candidateAlertEnabled);

        String service = getIntent() != null ? getIntent().getStringExtra("service") : null;
        if (service == null || service.isEmpty()) service = "netflix";

        String title = "[신한카드] 결제승인";
        String body = "netflix".equals(service)
                ? "넷플릭스 17,000원 정기결제 승인"
                : "유튜브 프리미엄 14,900원 정기결제 승인";

        PaymentParser.ParsedPayment parsed =
                PaymentParser.parse("com.shcard.smartpay", title, body);
        if (parsed == null) {
            Log.e(TAG, "POC_PARSE_FAILED service=" + service);
            finish();
            return;
        }

        PaymentDetectionCoordinator.Result result =
                PaymentDetectionCoordinator.handle(this, parsed);
        Log.i(TAG, "POC_RESULT event=" + result.eventType
                + " candidate=" + result.candidateId
                + " headsUp=" + result.headsUpRequested
                + " overlay=" + result.overlayRequested
                + " conciergeEnabled=" + conciergeEnabled
                + " candidateAlertEnabled=" + candidateAlertEnabled
                + " candidates=" + PaymentCandidateStore.list(this).length());
        finish();
    }
}
