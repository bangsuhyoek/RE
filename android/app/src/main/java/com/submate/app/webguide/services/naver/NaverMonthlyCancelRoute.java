package com.submate.app.webguide.services.naver;

import com.submate.app.webguide.state.PageState;
import com.submate.app.webguide.target.CharacterPlacement;
import com.submate.app.webguide.target.GuideInteractionType;
import com.submate.app.webguide.target.GuideStep;
import com.submate.app.webguide.target.GuideTargetSpec;
import com.submate.app.webguide.target.TargetVerificationStatus;

public final class NaverMonthlyCancelRoute {
    public static final String STEP_SETTINGS = "NAVER_MONTHLY_CANCEL_01_SETTINGS";
    public static final String STEP_MANAGE = "NAVER_MONTHLY_CANCEL_02_MANAGE";
    public static final String STEP_CANCEL_ENTRY = "NAVER_MONTHLY_CANCEL_03_CANCEL_ENTRY";
    public static final String STEP_RECURRING_CANCEL = "NAVER_MONTHLY_CANCEL_04_RECURRING_CANCEL";
    public static final String STEP_FINAL_CONFIRM = "NAVER_MONTHLY_CANCEL_05_FINAL_CONFIRM";
    public static final String STEP_COMPLETE = "NAVER_MONTHLY_CANCEL_COMPLETE";

    private NaverMonthlyCancelRoute() {}

    public static GuideStep currentStep(PageState state) {
        if (state == null) return null;
        switch (state) {
            case MY_MEMBERSHIP:
                return step(STEP_SETTINGS, state, "설정을 누르세요.", STEP_MANAGE);
            case MEMBERSHIP_SETTINGS:
                return step(STEP_MANAGE, state, "네이버플러스 멤버십 관리를 누르세요.", STEP_CANCEL_ENTRY);
            case MEMBERSHIP_MANAGEMENT:
                return step(STEP_CANCEL_ENTRY, state, "네이버플러스 멤버십 해지하기를 누르세요.", STEP_RECURRING_CANCEL);
            case CANCELLATION_ENTRY:
                return step(STEP_RECURRING_CANCEL, state, "정기결제 해지를 누르세요.", STEP_FINAL_CONFIRM);
            case FINAL_CANCEL_CONFIRM:
                return step(STEP_FINAL_CONFIRM, state, "해지하기를 누르세요.", STEP_COMPLETE);
            case CANCEL_COMPLETE:
                return new GuideStep(
                        STEP_COMPLETE, state,
                        "정기결제 해지 완료 상태입니다.",
                        null, GuideInteractionType.COMPLETE,
                        CharacterPlacement.AUTO, 12, "",
                        TargetVerificationStatus.LIVE_UNVERIFIED);
            default:
                return null;
        }
    }

    private static GuideStep step(
            String stepId,
            PageState state,
            String instruction,
            String nextStepId
    ) {
        GuideTargetSpec target = NaverMonthlyCancelLiveBindings.targetFor(stepId);
        return new GuideStep(
                stepId, state, instruction, target,
                GuideInteractionType.TAP, CharacterPlacement.AUTO, 12,
                nextStepId, NaverMonthlyCancelLiveBindings.statusFor(stepId));
    }
}
