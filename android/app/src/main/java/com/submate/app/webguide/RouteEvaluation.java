package com.submate.app.webguide;

import com.submate.app.webguide.state.GuideState;
import com.submate.app.webguide.state.PageState;
import com.submate.app.webguide.target.GuideStep;

public final class RouteEvaluation {
    private final GuideState guideState;
    private final PageState pageState;
    private final GuideStep step;
    private final String badgeText;
    private final String instructionText;
    private final boolean login;
    private final boolean complete;
    private final boolean userMustTap;

    public RouteEvaluation(
            GuideState guideState,
            PageState pageState,
            GuideStep step,
            String badgeText,
            String instructionText,
            boolean login,
            boolean complete,
            boolean userMustTap
    ) {
        this.guideState = guideState == null ? GuideState.HIDDEN : guideState;
        this.pageState = pageState == null ? PageState.UNSUPPORTED_PAGE : pageState;
        this.step = step;
        this.badgeText = badgeText == null ? "" : badgeText;
        this.instructionText = instructionText == null ? "" : instructionText;
        this.login = login;
        this.complete = complete;
        this.userMustTap = userMustTap;
    }

    public static RouteEvaluation paused(String badge, String instruction, boolean isLogin, boolean isComplete) {
        return new RouteEvaluation(
                GuideState.PAUSED,
                isLogin ? PageState.LOGIN : (isComplete ? PageState.CANCEL_COMPLETE : PageState.UNSUPPORTED_PAGE),
                null,
                badge,
                instruction,
                isLogin,
                isComplete,
                false
        );
    }

    public static RouteEvaluation talking(GuideStep step, String badge, String instruction, boolean userMustTap) {
        return new RouteEvaluation(
                GuideState.TALKING,
                step != null ? step.getLogicalPageState() : PageState.UNSUPPORTED_PAGE,
                step,
                badge,
                instruction,
                false,
                false,
                userMustTap
        );
    }

    public static RouteEvaluation waiting(String instruction) {
        return new RouteEvaluation(
                GuideState.PAUSED,
                PageState.UNSUPPORTED_PAGE,
                null,
                "",
                instruction,
                false,
                false,
                false
        );
    }

    public static RouteEvaluation hidden(String instruction) {
        return new RouteEvaluation(
                GuideState.HIDDEN,
                PageState.UNSUPPORTED_PAGE,
                null,
                "",
                instruction,
                false,
                false,
                false
        );
    }

    public static RouteEvaluation fromNaver(PageState pageState, GuideStep step, String badge, String instruction) {
        boolean isLogin = pageState == PageState.LOGIN;
        boolean isComplete = pageState == PageState.CANCEL_COMPLETE;
        GuideState gs = (pageState == PageState.LOGIN || pageState == PageState.MEMBERSHIP_JOIN
                || pageState == PageState.MEMBERSHIP || pageState == PageState.OTHER_NAVER_PAGE)
                ? GuideState.PAUSED
                : (pageState == PageState.UNSUPPORTED_PAGE ? GuideState.HIDDEN : GuideState.TALKING);
        boolean finalTap = step != null && step.isUserMustTap();
        return new RouteEvaluation(gs, pageState, step, badge, instruction, isLogin, isComplete, finalTap);
    }

    public GuideState getGuideState() { return guideState; }
    public PageState getPageState() { return pageState; }
    public GuideStep getStep() { return step; }
    public String getBadgeText() { return badgeText; }
    public String getInstructionText() { return instructionText; }
    public boolean isLogin() { return login; }
    public boolean isComplete() { return complete; }
    public boolean isUserMustTap() { return userMustTap; }
}

