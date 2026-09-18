package com.submate.app.webguide.services.naver;

import com.submate.app.webguide.state.GuideState;
import com.submate.app.webguide.state.PageState;
import com.submate.app.webguide.target.CharacterPlacement;
import com.submate.app.webguide.target.GuideInteractionType;
import com.submate.app.webguide.target.GuideStep;
import com.submate.app.webguide.target.GuideTargetSpec;
import com.submate.app.webguide.target.TargetVerificationStatus;

public final class NaverMembershipGuide {
    private NaverMembershipGuide() {}

    public static String messageFor(PageState pageState) {
        if (pageState == null) return "";
        switch (pageState) {
            case LOGIN:
                return "로그인이 완료되면 안내를 이어갈게요. 로그인 정보는 꾸독이 읽거나 저장하지 않아요.";
            case MEMBERSHIP_JOIN:
                return "현재 계정은 멤버십 가입 화면으로 연결됐어요. 가입자 전용 해지 화면은 표시되지 않습니다.";
            case MEMBERSHIP:
                return "네이버 멤버십 페이지를 확인 중이에요. 가입자 전용 화면은 live 검증 전까지 위치 안내를 하지 않아요.";
            case CANCELLATION_HELP:
                return "네이버 공식 해지 안내 페이지예요. 멤버십 관리 바로가기를 안내할게요.";
            case MY_MEMBERSHIP:
            case MEMBERSHIP_SETTINGS:
            case MEMBERSHIP_MANAGEMENT:
            case CANCELLATION_ENTRY:
            case RECURRING_CANCEL_CONFIRM:
            case FINAL_CANCEL_CONFIRM:
                return "공식 페이지에서 현재 단계의 버튼 위치를 확인하고 있어요.";
            case CANCEL_COMPLETE:
                return "완료 상태는 실제 NAVER 완료 DOM을 확인한 뒤에만 활성화합니다.";
            case OTHER_NAVER_PAGE:
                return "네이버 공식 페이지를 확인 중이에요. 검증된 화면에서만 안내를 이어갈게요.";
            case UNSUPPORTED_PAGE:
            default:
                return "";
        }
    }

    public static GuideStep currentStep(PageState pageState) {
        if (pageState == PageState.CANCELLATION_HELP) {
            return new GuideStep(
                    "NAVER_CANCEL_REAL_01",
                    pageState,
                    "네이버플러스 멤버십 관리 바로가기를 누르세요.",
                    new GuideTargetSpec(
                            "a.se-link[data-linktype=\"text\"]",
                            null,
                            "__se_link",
                            "네이버플러스 멤버십 관리 바로가기",
                            null,
                            null,
                            "nid.naver.com/membership/subscribe",
                            "data-linktype",
                            "text"
                    ),
                    GuideInteractionType.TAP,
                    CharacterPlacement.AUTO,
                    12,
                    NaverMonthlyCancelRoute.STEP_SETTINGS,
                    TargetVerificationStatus.LIVE_VERIFIED
            );
        }
        return NaverMonthlyCancelRoute.currentStep(pageState);
    }

    public static GuideState guideStateFor(PageState pageState) {
        if (pageState == null) return GuideState.HIDDEN;

        switch (pageState) {
            case LOGIN:
            case MEMBERSHIP_JOIN:
            case MEMBERSHIP:
            case OTHER_NAVER_PAGE:
                return GuideState.PAUSED;
            case CANCELLATION_HELP:
                return GuideState.TALKING;
            case MY_MEMBERSHIP:
            case MEMBERSHIP_SETTINGS:
            case MEMBERSHIP_MANAGEMENT:
            case CANCELLATION_ENTRY:
            case RECURRING_CANCEL_CONFIRM:
            case FINAL_CANCEL_CONFIRM:
            case CANCEL_COMPLETE:
                return GuideState.TALKING;
            case UNSUPPORTED_PAGE:
            default:
                return GuideState.HIDDEN;
        }
    }
}
