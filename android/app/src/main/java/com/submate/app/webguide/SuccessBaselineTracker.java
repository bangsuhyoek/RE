package com.submate.app.webguide;

import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Pure Java helper tracking success phrase baselines and final-step gating.
 *
 * Prevents false positives where pre-existing notice/terms text contains
 * phrases like "해지 예약" or "정기결제 해지 완료".
 * Only phrases that newly appear after the user's final action (and only once the
 * guide has reached its final step) are counted as success.
 */
public class SuccessBaselineTracker {
    public static final int MAX_EVALUATION_TEXT_LENGTH = 20000;

    private final boolean hasFinalStepConcept;
    private final Set<String> baselinePhrases = new HashSet<>();
    private boolean finalStepReached = false;
    private boolean finalActionTaken = false;

    public SuccessBaselineTracker() {
        this(true);
    }

    public SuccessBaselineTracker(boolean hasFinalStepConcept) {
        this.hasFinalStepConcept = hasFinalStepConcept;
    }

    public boolean hasFinalStepConcept() {
        return hasFinalStepConcept;
    }

    public void setFinalStepReached(boolean reached) {
        this.finalStepReached = reached;
    }

    public boolean isFinalStepReached() {
        return finalStepReached;
    }

    public void setFinalActionTaken(boolean taken) {
        this.finalActionTaken = taken;
    }

    public boolean isFinalActionTaken() {
        return finalActionTaken;
    }

    public Set<String> getBaselinePhrases() {
        return Collections.unmodifiableSet(baselinePhrases);
    }

    /**
     * Called when a page starts loading. If the user has not yet taken the final action,
     * clears the old baseline in preparation for recording the new page's baseline on load.
     */
    public void onPageLoading() {
        baselinePhrases.clear();
    }

    /**
     * Records the set of phrases already present on page finish.
     * Only records if the user has not yet taken the final action.
     */
    public void recordBaseline(Collection<String> phrasesFoundOnLoad) {
        if (finalActionTaken) {
            // Once the user has taken the final action, the pre-action baseline is locked.
            return;
        }
        baselinePhrases.clear();
        if (phrasesFoundOnLoad != null) {
            for (String p : phrasesFoundOnLoad) {
                if (p != null) {
                    String norm = normalize(p);
                    if (!norm.isEmpty()) {
                        baselinePhrases.add(norm);
                    }
                }
            }
        }
    }

    /**
     * Scans pageText for target phrases and records them as baseline.
     */
    public void recordBaselineFromText(String pageText, List<String> targetPhrases) {
        if (finalActionTaken) return;
        Set<String> found = findPresentPhrases(pageText, targetPhrases);
        recordBaseline(found);
    }

    /**
     * Evaluates whether text success is allowed based on final step gating and action status.
     */
    public boolean isTextSuccessAllowed() {
        if (hasFinalStepConcept && !finalStepReached) {
            return false;
        }
        return finalActionTaken;
    }

    /**
     * Evaluates a collection of currently present phrases.
     * Returns the first phrase that was NOT in the baseline, or null if all were in baseline or not allowed.
     */
    public String evaluateNewSuccessPhrases(Collection<String> currentPhrases) {
        if (!isTextSuccessAllowed() || currentPhrases == null) {
            return null;
        }
        for (String phrase : currentPhrases) {
            if (phrase != null) {
                String norm = normalize(phrase);
                if (!norm.isEmpty() && !baselinePhrases.contains(norm)) {
                    return phrase.trim();
                }
            }
        }
        return null;
    }

    /**
     * Pure function: scans pageText for targetPhrases and returns the first newly-appeared phrase.
     */
    public String evaluateNewSuccessFromText(String pageText, List<String> targetPhrases) {
        if (!isTextSuccessAllowed() || pageText == null || targetPhrases == null) {
            return null;
        }
        String text = prepareText(pageText);
        for (String target : targetPhrases) {
            if (target != null) {
                String normTarget = normalize(target);
                if (!normTarget.isEmpty() && text.contains(normTarget)) {
                    if (!baselinePhrases.contains(normTarget)) {
                        return target.trim();
                    }
                }
            }
        }
        return null;
    }

    /**
     * Helper to find all target phrases present in a text snippet.
     */
    public static Set<String> findPresentPhrases(String pageText, List<String> targetPhrases) {
        if (pageText == null || targetPhrases == null) {
            return Collections.emptySet();
        }
        String text = prepareText(pageText);
        Set<String> result = new HashSet<>();
        for (String target : targetPhrases) {
            if (target != null) {
                String normTarget = normalize(target);
                if (!normTarget.isEmpty() && text.contains(normTarget)) {
                    result.add(normTarget);
                }
            }
        }
        return result;
    }

    public void reset() {
        baselinePhrases.clear();
        finalStepReached = false;
        finalActionTaken = false;
    }

    public static String normalize(String s) {
        return s == null ? "" : s.trim().toLowerCase(Locale.ROOT);
    }

    private static String prepareText(String text) {
        if (text == null) return "";
        if (text.length() > MAX_EVALUATION_TEXT_LENGTH) {
            text = text.substring(0, MAX_EVALUATION_TEXT_LENGTH);
        }
        return text.toLowerCase(Locale.ROOT);
    }
}
