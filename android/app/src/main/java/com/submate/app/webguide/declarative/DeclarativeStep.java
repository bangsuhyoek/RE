package com.submate.app.webguide.declarative;

import com.submate.app.webguide.state.PageState;
import com.submate.app.webguide.target.PointerPlacement;
import com.submate.app.webguide.target.GuideInteractionType;
import com.submate.app.webguide.target.GuideStep;
import com.submate.app.webguide.target.GuideTargetSpec;
import com.submate.app.webguide.target.TargetVerificationStatus;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;

public final class DeclarativeStep {
    private final String id;
    private final Pattern urlPattern;
    private final String selector;
    private final List<String> textMatches;
    private final String instruction;
    private final GuideInteractionType interactionType;
    private final boolean userMustTap;
    private final boolean autoTapAllowed;

    public DeclarativeStep(
            String id,
            String urlPatternRegex,
            String selector,
            String textMatch,
            String instruction,
            GuideInteractionType interactionType,
            boolean userMustTap
    ) {
        this(
                id,
                urlPatternRegex,
                selector,
                textMatch != null && !textMatch.trim().isEmpty()
                        ? Collections.singletonList(textMatch.trim())
                        : Collections.emptyList(),
                instruction,
                interactionType,
                userMustTap,
                false
        );
    }

    public DeclarativeStep(
            String id,
            String urlPatternRegex,
            String selector,
            List<String> textMatches,
            String instruction,
            GuideInteractionType interactionType,
            boolean userMustTap
    ) {
        this(id, urlPatternRegex, selector, textMatches, instruction, interactionType, userMustTap, false);
    }

    public DeclarativeStep(
            String id,
            String urlPatternRegex,
            String selector,
            List<String> textMatches,
            String instruction,
            GuideInteractionType interactionType,
            boolean userMustTap,
            boolean autoTapAllowed
    ) {
        this.id = id == null ? "" : id.trim();
        this.urlPattern = urlPatternRegex == null || urlPatternRegex.trim().isEmpty()
                ? null
                : Pattern.compile(urlPatternRegex.trim(), Pattern.CASE_INSENSITIVE);
        this.selector = selector == null || selector.trim().isEmpty() ? null : selector.trim();
        this.textMatches = new ArrayList<>();
        if (textMatches != null) {
            for (String tm : textMatches) {
                if (tm != null && !tm.trim().isEmpty()) {
                    this.textMatches.add(tm.trim());
                }
            }
        }
        this.instruction = instruction == null ? "" : instruction.trim();
        this.interactionType = interactionType == null ? GuideInteractionType.TAP : interactionType;
        this.userMustTap = userMustTap;
        this.autoTapAllowed = autoTapAllowed && !userMustTap;
    }

    public String getId() { return id; }
    public Pattern getUrlPattern() { return urlPattern; }
    public String getSelector() { return selector; }
    public List<String> getTextMatches() { return Collections.unmodifiableList(textMatches); }
    public String getInstruction() { return instruction; }
    public GuideInteractionType getInteractionType() { return interactionType; }
    public boolean isUserMustTap() { return userMustTap; }
    public boolean isAutoTapAllowed() { return autoTapAllowed; }

    public boolean matchesUrl(String url) {
        if (url == null || urlPattern == null) return false;
        return urlPattern.matcher(url).find();
    }

    public GuideTargetSpec buildTargetSpec() {
        boolean hasSelector = selector != null && !selector.trim().isEmpty();
        boolean hasTextMatches = textMatches != null && !textMatches.isEmpty();
        if (!hasSelector && !hasTextMatches) {
            return null;
        }
        return new GuideTargetSpec(selector, textMatches);
    }

    public GuideStep toGuideStep(int stepNumber, int totalSteps) {
        PageState logicalState = userMustTap
                ? PageState.FINAL_CANCEL_CONFIRM
                : PageState.CANCELLATION_ENTRY;
        return new GuideStep(
                id,
                logicalState,
                instruction,
                buildTargetSpec(),
                interactionType,
                PointerPlacement.AUTO,
                12,
                "",
                TargetVerificationStatus.LIVE_UNVERIFIED,
                userMustTap,
                autoTapAllowed
        );
    }
}
