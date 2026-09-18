package com.submate.app.webguide.target;

import com.submate.app.webguide.state.PageState;

public final class GuideStep {
    private final String stepId;
    private final PageState logicalPageState;
    private final String instruction;
    private final GuideTargetSpec target;
    private final GuideInteractionType interactionType;
    private final CharacterPlacement preferredPlacement;
    private final int offsetDp;
    private final String expectedNextStepId;
    private final TargetVerificationStatus verificationStatus;

    public GuideStep(
            String stepId,
            String instruction,
            GuideTargetSpec target,
            CharacterPlacement preferredPlacement,
            int offsetDp
    ) {
        this(stepId, null, instruction, target, GuideInteractionType.TAP,
                preferredPlacement, offsetDp, "",
                target == null ? TargetVerificationStatus.LIVE_UNVERIFIED
                        : TargetVerificationStatus.LIVE_VERIFIED);
    }

    public GuideStep(
            String stepId,
            PageState logicalPageState,
            String instruction,
            GuideTargetSpec target,
            GuideInteractionType interactionType,
            CharacterPlacement preferredPlacement,
            int offsetDp,
            String expectedNextStepId,
            TargetVerificationStatus verificationStatus
    ) {
        this.stepId = clean(stepId);
        this.logicalPageState = logicalPageState;
        this.instruction = clean(instruction);
        this.target = target;
        this.interactionType = interactionType == null ? GuideInteractionType.TAP : interactionType;
        this.preferredPlacement = preferredPlacement == null ? CharacterPlacement.AUTO : preferredPlacement;
        this.offsetDp = Math.max(0, offsetDp);
        this.expectedNextStepId = clean(expectedNextStepId);
        this.verificationStatus = verificationStatus == null
                ? TargetVerificationStatus.LIVE_UNVERIFIED : verificationStatus;
    }

    private static String clean(String value) {
        return value == null ? "" : value.trim();
    }

    public String getStepId() { return stepId; }
    public PageState getLogicalPageState() { return logicalPageState; }
    public String getInstruction() { return instruction; }
    public GuideTargetSpec getTarget() { return target; }
    public GuideInteractionType getInteractionType() { return interactionType; }
    public CharacterPlacement getPreferredPlacement() { return preferredPlacement; }
    public int getOffsetDp() { return offsetDp; }
    public String getExpectedNextStepId() { return expectedNextStepId; }
    public TargetVerificationStatus getVerificationStatus() { return verificationStatus; }
}
