package com.submate.app.webguide.services.naver;

import com.submate.app.webguide.target.GuideTargetSpec;
import com.submate.app.webguide.target.TargetVerificationStatus;

/**
 * Production NAVER bindings for Route 1.
 * Subscriber-only targets remain unbound until live DOM verification.
 */
public final class NaverMonthlyCancelLiveBindings {
    private NaverMonthlyCancelLiveBindings() {}

    public static GuideTargetSpec targetFor(String stepId) {
        if (NaverMonthlyCancelRoute.STEP_SETTINGS.equals(stepId)) {
            return new GuideTargetSpec(
                    "a#settingBtn.lnk_setting",
                    "settingBtn",
                    "lnk_setting",
                    "설정",
                    null,
                    null,
                    "javascript:;",
                    null,
                    null
            );
        }
        if (NaverMonthlyCancelRoute.STEP_MANAGE.equals(stepId)) {
            return new GuideTargetSpec(
                    "a.setup_list",
                    null,
                    "setup_list",
                    "네이버플러스 멤버십 관리",
                    null,
                    null,
                    "javascript:;",
                    null,
                    null
            );
        }
        if (NaverMonthlyCancelRoute.STEP_CANCEL_ENTRY.equals(stepId)) {
            return new GuideTargetSpec(
                    "button#cancelSubscribeBtn.btn_member.cancel",
                    "cancelSubscribeBtn",
                    null,
                    "네이버플러스 멤버십 해지하기",
                    null,
                    null,
                    null,
                    null,
                    null
            );
        }
        if (NaverMonthlyCancelRoute.STEP_RECURRING_CANCEL.equals(stepId)) {
            return new GuideTargetSpec(
                    "button#cancelFoldBtn.btn_fold",
                    "cancelFoldBtn",
                    "btn_fold",
                    "정기결제 해지",
                    null, null, null, null, null
            );
        }
        if (NaverMonthlyCancelRoute.STEP_FINAL_CONFIRM.equals(stepId)) {
            return new GuideTargetSpec(
                    "button#cancelBtn.btn_action",
                    "cancelBtn",
                    "btn_action",
                    "해지하기",
                    null, null, null, null, null
            );
        }
        return null;
    }
    public static TargetVerificationStatus statusFor(String stepId) {
        if (NaverMonthlyCancelRoute.STEP_SETTINGS.equals(stepId)
                || NaverMonthlyCancelRoute.STEP_MANAGE.equals(stepId)
                || NaverMonthlyCancelRoute.STEP_CANCEL_ENTRY.equals(stepId)
                || NaverMonthlyCancelRoute.STEP_RECURRING_CANCEL.equals(stepId)
                || NaverMonthlyCancelRoute.STEP_FINAL_CONFIRM.equals(stepId)) {
            return TargetVerificationStatus.LIVE_VERIFIED;
        }
        return TargetVerificationStatus.LIVE_UNVERIFIED;
    }
}
