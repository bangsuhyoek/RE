package com.submate.app.webguide.services.youtube;

import com.submate.app.webguide.declarative.DeclarativeCancelRoute;
import com.submate.app.webguide.declarative.DeclarativeStep;
import com.submate.app.webguide.target.GuideInteractionType;

import java.util.Arrays;

public final class YouTubeCancelRoute extends DeclarativeCancelRoute {
    public static final String STEP_MANAGE = "YOUTUBE_MANAGE_MEMBERSHIP";
    public static final String STEP_DEACTIVATE = "YOUTUBE_DEACTIVATE";
    public static final String STEP_CONFIRM = "YOUTUBE_FINAL_CONFIRM";

    public YouTubeCancelRoute() {
        super(
                "youtube",
                Arrays.asList("youtube.com"),
                Arrays.asList("accounts.google.com"),
                Arrays.asList(
                        "^https?://accounts\\.google\\.com/.*",
                        "^https?://(?:www\\.)?youtube\\.com/(?:signin|account_recovery).*"
                ),
                Arrays.asList(
                        // selectors unverified — validate on device
                        new DeclarativeStep(
                                STEP_MANAGE,
                                "^https?://(?:www\\.)?youtube\\.com/paid_memberships/?(?:\\?(?!.*(?:deactivate|confirm)).*)?$",
                                "button[aria-label*='멤버십'], ytd-membership-item-renderer button, #manage-membership-button",
                                Arrays.asList("멤버십 관리", "Manage membership"),
                                "멤버십 관리를 눌러주세요.",
                                GuideInteractionType.TAP,
                                false,
                                true // autoTapAllowed: true (navigation step)
                        ),
                        // selectors unverified — validate on device
                        new DeclarativeStep(
                                STEP_DEACTIVATE,
                                "^https?://(?:www\\.)?youtube\\.com/paid_memberships.*(?:deactivate|pause).*",
                                "button[aria-label*='비활성화'], button[aria-label*='해지'], #deactivate-button",
                                Arrays.asList("비활성화", "해지", "Deactivate", "Cancel"),
                                "비활성화 또는 해지를 눌러주세요.",
                                GuideInteractionType.TAP,
                                false,
                                true // autoTapAllowed: true (soft keyword "비활성화/해지" navigation step)
                        ),
                        // selectors unverified — validate on device
                        new DeclarativeStep(
                                STEP_CONFIRM,
                                "^https?://(?:www\\.)?youtube\\.com/paid_memberships.*(?:confirm|cancel_confirm).*",
                                "button[aria-label*='해지 확인'], button#confirm-cancel, button[aria-label*='Cancel membership']",
                                Arrays.asList("해지 확인", "그대로 취소", "멤버십 취소", "Cancel membership", "Confirm cancellation"),
                                "마지막 해지 버튼은 직접 눌러 주세요",
                                GuideInteractionType.TAP,
                                true, // final step: user must tap manually
                                false // autoTapAllowed: false
                        )
                ),
                Arrays.asList(
                        "^https?://(?:www\\.)?youtube\\.com/paid_memberships.*(?:cancelled|canceled|success).*"
                ),
                Arrays.asList(
                        "해지가 완료",
                        "멤버십이 해지",
                        "해지 예약",
                        "Your membership has been cancelled",
                        "cancellation is complete",
                        "Membership cancelled"
                )
        );
    }
}
