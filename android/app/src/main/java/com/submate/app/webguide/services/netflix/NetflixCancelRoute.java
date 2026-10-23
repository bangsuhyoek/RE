package com.submate.app.webguide.services.netflix;

import com.submate.app.webguide.declarative.DeclarativeCancelRoute;
import com.submate.app.webguide.declarative.DeclarativeStep;
import com.submate.app.webguide.target.GuideInteractionType;

import java.util.Arrays;
import java.util.Collections;

public final class NetflixCancelRoute extends DeclarativeCancelRoute {
    public static final String STEP_FINAL = "NETFLIX_CANCEL_CONFIRM";

    public NetflixCancelRoute() {
        super(
                "netflix",
                Arrays.asList("netflix.com"),
                Collections.emptyList(),
                Arrays.asList(
                        "^https?://(?:www\\.)?netflix\\.com/(?:[a-z]{2}(?:-[a-z]{2})?/)?login.*",
                        "^https?://(?:www\\.)?netflix\\.com/(?:[a-z]{2}(?:-[a-z]{2})?/)?YourAccount.*"
                ),
                Arrays.asList(
                        // selectors unverified — validate on device
                        new DeclarativeStep(
                                STEP_FINAL,
                                "^https?://(?:www\\.)?netflix\\.com/(?:[a-z]{2}(?:-[a-z]{2})?/)?cancelplan(?:[/?#].*)?$",
                                "button[data-uia*='cancel'], button.btn-cancel, button.btn-submit",
                                Arrays.asList("멤버십 해지 완료", "Finish Cancellation", "해지 완료", "Complete Cancellation"),
                                "마지막 해지 버튼은 직접 눌러 주세요",
                                GuideInteractionType.TAP,
                                true // final step: user must tap manually
                        )
                ),
                Arrays.asList(
                        "^https?://(?:www\\.)?netflix\\.com/(?:[a-z]{2}(?:-[a-z]{2})?/)?(?:cancel-confirmed|cancellation-complete|account.*cancelled).*"
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
