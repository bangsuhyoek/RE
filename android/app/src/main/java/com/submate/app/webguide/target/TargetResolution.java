package com.submate.app.webguide.target;

public final class TargetResolution {
    private final TargetResolutionStatus status;
    private final TargetRect rect;
    private final int candidateCount;
    private final String matchedText;
    private final String matchedSelector;
    private final String elementDescriptor;
    private final String errorMessage;

    public TargetResolution(
            TargetResolutionStatus status,
            TargetRect rect,
            int candidateCount,
            String matchedText,
            String matchedSelector,
            String elementDescriptor,
            String errorMessage
    ) {
        this.status = status == null ? TargetResolutionStatus.ERROR : status;
        this.rect = rect;
        this.candidateCount = Math.max(0, candidateCount);
        this.matchedText = matchedText == null ? "" : matchedText;
        this.matchedSelector = matchedSelector == null ? "" : matchedSelector;
        this.elementDescriptor = elementDescriptor == null ? "" : elementDescriptor;
        this.errorMessage = errorMessage == null ? "" : errorMessage;
    }

    public TargetResolutionStatus getStatus() { return status; }
    public TargetRect getRect() { return rect; }
    public int getCandidateCount() { return candidateCount; }
    public String getMatchedText() { return matchedText; }
    public String getMatchedSelector() { return matchedSelector; }
    public String getElementDescriptor() { return elementDescriptor; }
    public String getErrorMessage() { return errorMessage; }
}
