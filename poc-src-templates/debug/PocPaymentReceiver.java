package kr.co.re.subscription.payment;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class PocPaymentReceiver extends BroadcastReceiver {
    private static final String TAG = "REPocReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        boolean forceNew = intent == null || intent.getBooleanExtra("force_new", true);
        boolean conciergeEnabled = intent == null || intent.getBooleanExtra("concierge_enabled", true);
        boolean candidateAlertEnabled = intent == null || intent.getBooleanExtra("candidate_alert_enabled", true);

        if (forceNew) KnownSubscriptionSnapshotStore.syncEmptyForPoc(context);
        ConciergePreferences.setEnabled(context, conciergeEnabled);
        PaymentCapturePreferences.setCandidateNotificationsEnabled(context, candidateAlertEnabled);

        String service = intent != null ? intent.getStringExtra("service") : null;
        if (service == null || service.isEmpty()) service = "netflix";

        String title = "[신한카드] 결제승인";
        String body = "netflix".equals(service)
                ? "넷플릭스 17,000원 정기결제 승인"
                : "유튜브 프리미엄 14,900원 정기결제 승인";
        PaymentParser.ParsedPayment parsed =
                PaymentParser.parse("com.shcard.smartpay", title, body);
        if (parsed == null) {
            Log.e(TAG, "POC_PARSE_FAILED");
            return;
        }

        PaymentDetectionCoordinator.Result result =
                PaymentDetectionCoordinator.handle(context, parsed);
        Log.i(TAG, "POC_RESULT event=" + result.eventType
                + " candidate=" + result.candidateId
                + " headsUp=" + result.headsUpRequested
                + " overlay=" + result.overlayRequested
                + " conciergeEnabled=" + conciergeEnabled
                + " candidateAlertEnabled=" + candidateAlertEnabled
                + " candidates=" + PaymentCandidateStore.list(context).length());
    }
}
