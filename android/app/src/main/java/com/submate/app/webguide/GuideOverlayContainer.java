package com.submate.app.webguide;

import android.content.Context;
import android.graphics.Color;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.util.AttributeSet;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.submate.app.R;
import com.submate.app.webguide.services.naver.NaverMembershipGuide;
import com.submate.app.webguide.state.GuideState;
import com.submate.app.webguide.state.PageState;
import com.submate.app.webguide.target.CharacterPlacement;
import com.submate.app.webguide.target.GuideStep;
import com.submate.app.webguide.target.TargetRect;
import com.submate.app.webguide.target.TargetResolutionStatus;

public class GuideOverlayContainer extends FrameLayout {
    private static final String TAG = "KkudokWebGuideTarget";
    private ImageView characterView;
    private LinearLayout bubbleCard;
    private TextView messageView;
    private TextView restoreButton;
    private View targetOutline;
    private TextView pointerView;
    private PageState pageState = PageState.UNSUPPORTED_PAGE;
    private GuideState guideState = GuideState.HIDDEN;
    private RectF activeTargetRect;
    private long presentationGeneration = 0L;

    public GuideOverlayContainer(Context context) {
        super(context);
        init();
    }

    public GuideOverlayContainer(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    private void init() {
        setClickable(false);
        setFocusable(false);
        setBackgroundColor(Color.TRANSPARENT);
        setClipChildren(false);
        setClipToPadding(false);
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_AUTO);

        buildTargetScaffold();
        buildCharacter();
        buildBubble();
        buildRestoreButton();
        hideGuide();
    }

    private void buildTargetScaffold() {
        targetOutline = new View(getContext());
        GradientDrawable outline = new GradientDrawable();
        outline.setColor(Color.TRANSPARENT);
        outline.setCornerRadius(dp(12));
        outline.setStroke(dp(3), Color.rgb(91, 111, 214));
        targetOutline.setBackground(outline);
        targetOutline.setClickable(false);
        targetOutline.setFocusable(false);
        targetOutline.setVisibility(GONE);
        addView(targetOutline, new FrameLayout.LayoutParams(1, 1));

        pointerView = new TextView(getContext());
        pointerView.setText("↓");
        pointerView.setTextSize(28);
        pointerView.setTextColor(Color.rgb(91, 111, 214));
        pointerView.setGravity(Gravity.CENTER);
        pointerView.setClickable(false);
        pointerView.setFocusable(false);
        pointerView.setVisibility(GONE);
        addView(pointerView, new FrameLayout.LayoutParams(dp(40), dp(40)));
    }

    private void buildCharacter() {
        characterView = new ImageView(getContext());
        characterView.setImageResource(R.drawable.kkudok_character_guide);
        characterView.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        characterView.setAdjustViewBounds(true);
        characterView.setContentDescription("꾸독 안내 캐릭터");
        characterView.setElevation(dp(5));
        characterView.setOnClickListener(v -> {
            if (guideState == GuideState.MINIMIZED) {
                restoreGuide();
            } else if (bubbleCard != null) {
                bubbleCard.setVisibility(bubbleCard.getVisibility() == VISIBLE ? GONE : VISIBLE);
            }
        });
        addView(characterView, defaultCharacterParams());
    }

    private void buildBubble() {
        bubbleCard = new LinearLayout(getContext());
        bubbleCard.setOrientation(LinearLayout.VERTICAL);
        bubbleCard.setPadding(dp(14), dp(12), dp(12), dp(10));
        bubbleCard.setElevation(dp(8));
        bubbleCard.setClickable(true);
        bubbleCard.setFocusable(true);

        GradientDrawable bubbleBg = new GradientDrawable();
        bubbleBg.setColor(Color.argb(248, 255, 255, 255));
        bubbleBg.setCornerRadius(dp(16));
        bubbleBg.setStroke(dp(1), Color.rgb(226, 232, 240));
        bubbleCard.setBackground(bubbleBg);

        LinearLayout topRow = new LinearLayout(getContext());
        topRow.setOrientation(LinearLayout.HORIZONTAL);
        topRow.setGravity(Gravity.CENTER_VERTICAL);

        TextView label = new TextView(getContext());
        label.setText("꾸독 안내");
        label.setTextColor(Color.rgb(69, 74, 92));
        label.setTextSize(12);
        label.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        topRow.addView(label, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        TextView minimize = actionText("접기");
        minimize.setContentDescription("꾸독 캐릭터 최소화");
        minimize.setOnClickListener(v -> minimizeGuide());
        topRow.addView(minimize, new LinearLayout.LayoutParams(dp(48), dp(32)));

        TextView closeBubble = actionText("×");
        closeBubble.setTextSize(20);
        closeBubble.setContentDescription("말풍선 닫기");
        closeBubble.setOnClickListener(v -> bubbleCard.setVisibility(GONE));
        topRow.addView(closeBubble, new LinearLayout.LayoutParams(dp(40), dp(32)));
        bubbleCard.addView(topRow, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        messageView = new TextView(getContext());
        messageView.setTextColor(Color.rgb(31, 41, 55));
        messageView.setTextSize(14);
        messageView.setLineSpacing(0, 1.15f);
        messageView.setPadding(0, dp(6), 0, 0);
        bubbleCard.addView(messageView, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        addView(bubbleCard, defaultBubbleParams());
    }

    private void buildRestoreButton() {
        restoreButton = new TextView(getContext());
        restoreButton.setText("꾸");
        restoreButton.setTextSize(13);
        restoreButton.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        restoreButton.setTextColor(Color.WHITE);
        restoreButton.setGravity(Gravity.CENTER);
        restoreButton.setContentDescription("꾸독 캐릭터 다시 열기");
        restoreButton.setClickable(true);
        restoreButton.setFocusable(true);
        restoreButton.setElevation(dp(6));

        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.rgb(91, 111, 214));
        bg.setShape(GradientDrawable.OVAL);
        restoreButton.setBackground(bg);
        restoreButton.setOnClickListener(v -> restoreGuide());

        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(dp(48), dp(48), Gravity.BOTTOM | Gravity.END);
        params.rightMargin = dp(18);
        params.bottomMargin = dp(22);
        addView(restoreButton, params);
        restoreButton.setVisibility(GONE);
    }

    private TextView actionText(String text) {
        TextView view = new TextView(getContext());
        view.setText(text);
        view.setTextSize(12);
        view.setTextColor(Color.rgb(82, 82, 91));
        view.setGravity(Gravity.CENTER);
        view.setClickable(true);
        view.setFocusable(true);
        return view;
    }

    public void onPageLoading() {
        presentationGeneration++;
        activeTargetRect = null;
        hideTargetHighlight();
        setVisibility(GONE);
    }

    public void updatePageState(PageState newPageState) {
        presentationGeneration++;
        pageState = newPageState == null ? PageState.UNSUPPORTED_PAGE : newPageState;
        guideState = NaverMembershipGuide.guideStateFor(pageState);
        activeTargetRect = null;
        hideTargetHighlight();
        resetCharacterDefaultPosition();
        resetBubbleDefaultPosition();

        if (guideState == GuideState.HIDDEN) {
            hideGuide();
            return;
        }

        messageView.setText(NaverMembershipGuide.messageFor(pageState));
        setVisibility(VISIBLE);
        restoreButton.setVisibility(GONE);
        characterView.setVisibility(VISIBLE);
        bubbleCard.setVisibility(VISIBLE);
        characterView.setAlpha(pageState == PageState.LOGIN ? 0.92f : 1.0f);
        characterView.animate().cancel();
        characterView.setScaleX(0.94f);
        characterView.setScaleY(0.94f);
        characterView.setAlpha(0f);
        characterView.animate().alpha(pageState == PageState.LOGIN ? 0.92f : 1f)
                .scaleX(1f).scaleY(1f).setDuration(220).start();
    }

    public void showNeedsLiveVerification(GuideStep step) {
        presentationGeneration++;
        activeTargetRect = null;
        hideTargetHighlight();
        resetCharacterDefaultPosition();
        resetBubbleDefaultPosition();
        guideState = GuideState.NEEDS_LIVE_VERIFICATION;
        setVisibility(VISIBLE);
        restoreButton.setVisibility(GONE);
        characterView.setVisibility(VISIBLE);
        bubbleCard.setVisibility(VISIBLE);
        String instruction = step == null ? "" : step.getInstruction();
        messageView.setText(
                "실제 NAVER 가입자 화면 검증이 필요한 단계예요. "
                        + "잘못된 위치를 가리키지 않도록 Target 안내를 중단합니다."
                        + (instruction.isEmpty() ? "" : "\n\n예정 안내: " + instruction));
    }

    public void showStandaloneMessage(String message) {
        presentationGeneration++;
        activeTargetRect = null;
        hideTargetHighlight();
        resetCharacterDefaultPosition();
        resetBubbleDefaultPosition();
        guideState = GuideState.TALKING;
        setVisibility(VISIBLE);
        restoreButton.setVisibility(GONE);
        characterView.setVisibility(VISIBLE);
        bubbleCard.setVisibility(VISIBLE);
        messageView.setText(message == null ? "" : message);
    }

    public void showResolvedTarget(RectF rect, GuideStep step) {
        final long expectedPresentationGeneration = ++presentationGeneration;
        if (rect == null || step == null || getWidth() <= 0 || getHeight() <= 0) {
            hideTargetHighlight();
            return;
        }

        activeTargetRect = new RectF(rect);
        guideState = GuideState.TALKING;
        setVisibility(VISIBLE);
        restoreButton.setVisibility(GONE);
        characterView.setVisibility(VISIBLE);
        bubbleCard.setVisibility(VISIBLE);
        messageView.setText(step.getInstruction());

        characterView.setClickable(false);
        characterView.setFocusable(false);
        showTargetHighlight(rect);
        post(() -> {
            if (expectedPresentationGeneration != presentationGeneration || activeTargetRect == null) return;
            CharacterPlacement actual = placeCharacterNearTarget(
                    rect, step.getPreferredPlacement(), step.getOffsetDp());
            placePointer(rect, actual);
            placeBubbleAwayFromTarget(rect);
            RectF characterRect = rectFor(characterView);
            FrameLayout.LayoutParams outlineParams =
                    (FrameLayout.LayoutParams) targetOutline.getLayoutParams();
            RectF highlightRect = new RectF(
                    outlineParams.leftMargin,
                    outlineParams.topMargin,
                    outlineParams.leftMargin + targetOutline.getWidth(),
                    outlineParams.topMargin + targetOutline.getHeight());
            Log.d(TAG,
                    "stepId=" + step.getStepId()
                            + " placement=" + actual
                            + " characterRect=" + characterRect
                            + " highlightRect=" + highlightRect);
        });
    }

    public void showTargetStatus(GuideStep step, TargetResolutionStatus status, TargetRect rawRect) {
        presentationGeneration++;
        activeTargetRect = null;
        hideTargetHighlight();
        resetCharacterDefaultPosition();
        resetBubbleDefaultPosition();

        if (step == null) return;
        String message = step.getInstruction();
        if (status == TargetResolutionStatus.FOUND_OFFSCREEN) {
            boolean above = rawRect != null && rawRect.topCssPx < 0;
            message = (above ? "위로" : "아래로") + " 스크롤하면 대상이 보여요. " + step.getInstruction();
        } else if (status == TargetResolutionStatus.AMBIGUOUS) {
            message = "같은 이름의 항목이 여러 개 보여 정확한 위치를 확인 중이에요.";
        } else if (status == TargetResolutionStatus.NOT_FOUND) {
            message = "현재 화면에서 안내 대상을 찾지 못했어요. 페이지 구성이 바뀌었는지 확인해 주세요.";
        } else if (status == TargetResolutionStatus.ERROR) {
            message = "안내 위치를 확인하지 못했어요. 웹 화면은 그대로 사용할 수 있어요.";
        }

        setVisibility(VISIBLE);
        characterView.setVisibility(VISIBLE);
        bubbleCard.setVisibility(VISIBLE);
        restoreButton.setVisibility(GONE);
        messageView.setText(message);
    }

    public PageState getPageState() {
        return pageState;
    }

    public RectF getActiveTargetRect() {
        return activeTargetRect == null ? null : new RectF(activeTargetRect);
    }

    private void minimizeGuide() {
        presentationGeneration++;
        if (guideState == GuideState.HIDDEN) return;
        guideState = GuideState.MINIMIZED;
        bubbleCard.setVisibility(GONE);
        characterView.setVisibility(GONE);
        restoreButton.setVisibility(VISIBLE);
        hideTargetHighlight();
    }

    private void restoreGuide() {
        GuideState resolved = NaverMembershipGuide.guideStateFor(pageState);
        if (resolved == GuideState.HIDDEN) {
            hideGuide();
            return;
        }
        guideState = resolved;
        setVisibility(VISIBLE);
        restoreButton.setVisibility(GONE);
        characterView.setVisibility(VISIBLE);
        bubbleCard.setVisibility(VISIBLE);
    }

    private void hideGuide() {
        presentationGeneration++;
        guideState = GuideState.HIDDEN;
        activeTargetRect = null;
        setVisibility(GONE);
        if (characterView != null) characterView.setVisibility(GONE);
        if (bubbleCard != null) bubbleCard.setVisibility(GONE);
        if (restoreButton != null) restoreButton.setVisibility(GONE);
        hideTargetHighlight();
    }

    public void showTargetHighlight(RectF rect) {
        if (rect == null || getVisibility() != VISIBLE) {
            hideTargetHighlight();
            return;
        }

        int inset = dp(4);
        float left = Math.max(0, rect.left - inset);
        float top = Math.max(0, rect.top - inset);
        float right = Math.min(getWidth(), rect.right + inset);
        float bottom = Math.min(getHeight(), rect.bottom + inset);

        FrameLayout.LayoutParams outlineParams = new FrameLayout.LayoutParams(
                Math.max(dp(1), Math.round(right - left)),
                Math.max(dp(1), Math.round(bottom - top)));
        outlineParams.gravity = Gravity.TOP | Gravity.START;
        outlineParams.leftMargin = Math.round(left);
        outlineParams.topMargin = Math.round(top);
        targetOutline.setLayoutParams(outlineParams);
        targetOutline.setVisibility(VISIBLE);
    }

    public void hideTargetHighlight() {
        if (targetOutline != null) targetOutline.setVisibility(GONE);
        if (pointerView != null) pointerView.setVisibility(GONE);
    }

    private CharacterPlacement placeCharacterNearTarget(
            RectF rect,
            CharacterPlacement preferred,
            int offsetDp
    ) {
        int width = getWidth();
        int height = getHeight();
        int charW = dp(88);
        int charH = dp(76);
        int edge = dp(8);
        int gap = dp(Math.max(4, offsetDp));

        CharacterPlacement chosen = choosePlacement(rect, preferred, width, height, charW, charH, edge, gap);
        float x;
        float y;

        switch (chosen) {
            case LEFT:
                x = rect.left - gap - charW;
                y = rect.centerY() - charH / 2f;
                break;
            case RIGHT:
                x = rect.right + gap;
                y = rect.centerY() - charH / 2f;
                break;
            case TOP:
                x = rect.centerX() - charW / 2f;
                y = rect.top - gap - charH;
                break;
            case BOTTOM:
            default:
                x = rect.centerX() - charW / 2f;
                y = rect.bottom + gap;
                break;
        }

        x = clamp(x, edge, Math.max(edge, width - charW - edge));
        y = clamp(y, edge, Math.max(edge, height - charH - edge));

        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(charW, charH, Gravity.TOP | Gravity.START);
        params.leftMargin = Math.round(x);
        params.topMargin = Math.round(y);
        characterView.setLayoutParams(params);
        characterView.setClickable(false);
        characterView.setFocusable(false);
        return chosen;
    }

    private CharacterPlacement choosePlacement(
            RectF rect,
            CharacterPlacement preferred,
            int width,
            int height,
            int charW,
            int charH,
            int edge,
            int gap
    ) {
        if (preferred != null && preferred != CharacterPlacement.AUTO
                && fits(preferred, rect, width, height, charW, charH, edge, gap)) {
            return preferred;
        }

        CharacterPlacement[] options = {
                CharacterPlacement.LEFT,
                CharacterPlacement.RIGHT,
                CharacterPlacement.TOP,
                CharacterPlacement.BOTTOM
        };
        CharacterPlacement best = CharacterPlacement.BOTTOM;
        float bestSpace = -1;

        for (CharacterPlacement option : options) {
            float space = availableSpace(option, rect, width, height, edge);
            if (fits(option, rect, width, height, charW, charH, edge, gap) && space > bestSpace) {
                best = option;
                bestSpace = space;
            }
        }

        if (bestSpace >= 0) return best;
        for (CharacterPlacement option : options) {
            float space = availableSpace(option, rect, width, height, edge);
            if (space > bestSpace) {
                best = option;
                bestSpace = space;
            }
        }
        return best;
    }

    private boolean fits(
            CharacterPlacement placement,
            RectF rect,
            int width,
            int height,
            int charW,
            int charH,
            int edge,
            int gap
    ) {
        switch (placement) {
            case LEFT:
                return rect.left - gap - charW >= edge;
            case RIGHT:
                return rect.right + gap + charW <= width - edge;
            case TOP:
                return rect.top - gap - charH >= edge;
            case BOTTOM:
                return rect.bottom + gap + charH <= height - edge;
            default:
                return false;
        }
    }

    private float availableSpace(CharacterPlacement placement, RectF rect, int width, int height, int edge) {
        switch (placement) {
            case LEFT: return rect.left - edge;
            case RIGHT: return width - edge - rect.right;
            case TOP: return rect.top - edge;
            case BOTTOM: return height - edge - rect.bottom;
            default: return 0;
        }
    }

    private void placePointer(RectF rect, CharacterPlacement characterPlacement) {
        int size = dp(40);
        float x;
        float y;
        switch (characterPlacement) {
            case LEFT:
                pointerView.setText("→");
                x = rect.left - size;
                y = rect.centerY() - size / 2f;
                break;
            case RIGHT:
                pointerView.setText("←");
                x = rect.right;
                y = rect.centerY() - size / 2f;
                break;
            case BOTTOM:
                pointerView.setText("↑");
                x = rect.centerX() - size / 2f;
                y = rect.bottom;
                break;
            case TOP:
            default:
                pointerView.setText("↓");
                x = rect.centerX() - size / 2f;
                y = rect.top - size;
                break;
        }

        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(size, size, Gravity.TOP | Gravity.START);
        params.leftMargin = Math.round(clamp(x, 0, Math.max(0, getWidth() - size)));
        params.topMargin = Math.round(clamp(y, 0, Math.max(0, getHeight() - size)));
        pointerView.setLayoutParams(params);
        pointerView.setVisibility(VISIBLE);
    }

    private void placeBubbleAwayFromTarget(RectF target) {
        int width = getWidth();
        int height = getHeight();
        int bubbleW = dp(258);
        int bubbleH = bubbleCard.getMeasuredHeight() > 0 ? bubbleCard.getMeasuredHeight() : dp(112);
        int edge = dp(12);

        RectF character = rectFor(characterView);
        RectF expandedTarget = new RectF(
                target.left - dp(8), target.top - dp(8),
                target.right + dp(8), target.bottom + dp(8));

        RectF[] candidates = {
                new RectF(edge, edge, edge + bubbleW, edge + bubbleH),
                new RectF(width - edge - bubbleW, edge, width - edge, edge + bubbleH),
                new RectF(edge, height - edge - bubbleH, edge + bubbleW, height - edge),
                new RectF(width - edge - bubbleW, height - edge - bubbleH, width - edge, height - edge)
        };

        RectF chosen = candidates[0];
        for (RectF candidate : candidates) {
            if (!RectF.intersects(candidate, expandedTarget) && !RectF.intersects(candidate, character)) {
                chosen = candidate;
                break;
            }
        }

        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                bubbleW, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP | Gravity.START);
        params.leftMargin = Math.round(Math.max(edge, Math.min(chosen.left, width - edge - bubbleW)));
        params.topMargin = Math.round(Math.max(edge, Math.min(chosen.top, height - edge - bubbleH)));
        bubbleCard.setLayoutParams(params);
    }

    private RectF rectFor(View view) {
        FrameLayout.LayoutParams params = (FrameLayout.LayoutParams) view.getLayoutParams();
        return new RectF(
                params.leftMargin,
                params.topMargin,
                params.leftMargin + view.getWidth(),
                params.topMargin + view.getHeight()
        );
    }

    private void resetCharacterDefaultPosition() {
        if (characterView == null) return;
        characterView.setLayoutParams(defaultCharacterParams());
        characterView.setClickable(true);
        characterView.setFocusable(true);
    }

    private void resetBubbleDefaultPosition() {
        if (bubbleCard == null) return;
        bubbleCard.setLayoutParams(defaultBubbleParams());
    }

    private FrameLayout.LayoutParams defaultCharacterParams() {
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(dp(88), dp(76), Gravity.BOTTOM | Gravity.END);
        params.rightMargin = dp(16);
        params.bottomMargin = dp(20);
        return params;
    }

    private FrameLayout.LayoutParams defaultBubbleParams() {
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                dp(258), ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM | Gravity.END);
        params.rightMargin = dp(16);
        params.bottomMargin = dp(108);
        return params;
    }

    private float clamp(float value, float min, float max) {
        return Math.max(min, Math.min(value, max));
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
