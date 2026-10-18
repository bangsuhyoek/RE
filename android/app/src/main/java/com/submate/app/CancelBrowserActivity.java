package com.submate.app;

import android.annotation.SuppressLint;
import android.app.Dialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Rect;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.submate.app.webguide.CancelGuideRoute;
import com.submate.app.webguide.CancelRouteRegistry;
import com.submate.app.webguide.WebSecurityPolicy;
import com.submate.app.webguide.GuideOverlayContainer;
import com.submate.app.webguide.KkudokNaverGuideController;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class CancelBrowserActivity extends AppCompatActivity {

    public static class GuideStepItem {
        public int stepNumber;
        public String title;
        public String description;
        public String imageUrl;

        public GuideStepItem(int stepNumber, String title, String description, String imageUrl) {
            this.stepNumber = stepNumber;
            this.title = title;
            this.description = description;
            this.imageUrl = imageUrl;
        }
    }

    private WebView webView;
    private ProgressBar pbLoading;
    private LinearLayout bottomGuideDock;
    private TextView tvStepBadge;
    private TextView tvStepDescription;
    private RecyclerView rvGuideSteps;
    private GuideAdapter guideAdapter;
    private final List<GuideStepItem> stepList = new ArrayList<>();
    private int selectedIndex = 0;
    private String currentCancelUrl = "";
    private String serviceId = "";
    private boolean automaticGuideEnabled = false;
    private CancelGuideRoute guideRoute;
    private GuideOverlayContainer guideOverlay;
    private KkudokNaverGuideController naverGuideController;
    private TextView btnToggleManualGuide;
    private TextView btnManualOverride;
    private View agentCoverLayout;
    private View loginNoticeBanner;
    private TextView tvLoginNoticeText;
    private TextView btnReturnAgentMode;
    private TextView tvAgentStatusPill;
    private TextView tvAgentStepBadge;
    private TextView tvAgentHeadline;
    private TextView tvAgentSubtext;
    private TextView tvAgentTargetButton;
    private ImageView ivAgentWebPreview;
    private TextView btnAgentFinalConfirm;
    private TextView btnToggleWebView;
    private ProgressBar pbAgentWorking;
    private View agentCoverSpacer;
    private Runnable pendingAutoAdvanceOptOut;
    // 해지 관련 중간 버튼은 꾸독이 혼자 누르지 않고 사용자의 확인을 받는다. 확인 대기 중인 버튼 문구를 기억한다.
    private String userStepTapTarget = null;
    private boolean userRequestedRawWebView = false;

    private boolean isFinishingFlow = false;
    private Intent completedResultIntent = null;

    private final ExecutorService executor = Executors.newFixedThreadPool(2);
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_cancel_browser);

        View rootLayout = findViewById(R.id.rootLayout);
        if (rootLayout != null) {
            ViewCompat.setOnApplyWindowInsetsListener(rootLayout, (v, windowInsets) -> {
                Insets systemBars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                );
                Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
                int bottomPadding = Math.max(systemBars.bottom, ime.bottom);
                v.setPadding(systemBars.left, systemBars.top, systemBars.right, bottomPadding);
                return WindowInsetsCompat.CONSUMED;
            });
        }

        serviceId = getIntent().getStringExtra("serviceId");
        if (serviceId == null) serviceId = "";
        String serviceName = getIntent().getStringExtra("serviceName");
        currentCancelUrl = getIntent().getStringExtra("cancelUrl");
        String stepsJson = getIntent().getStringExtra("guideStepsJson");
        String aiEndpoint = getIntent().getStringExtra("aiEndpoint");
        String aiAuthToken = getIntent().getStringExtra("aiAuthToken");
        guideRoute = CancelRouteRegistry.resolveRoute(serviceId, serviceName, currentCancelUrl, stepsJson, aiEndpoint, aiAuthToken);
        automaticGuideEnabled = (guideRoute != null);

        TextView tvServiceName = findViewById(R.id.tvServiceName);
        TextView tvServiceUrl = findViewById(R.id.tvServiceUrl);
        View btnClose = findViewById(R.id.btnClose);
        View btnComplete = findViewById(R.id.btnComplete);
        View btnOpenExternal = findViewById(R.id.btnOpenExternal);
        pbLoading = findViewById(R.id.pbLoading);
        tvStepBadge = findViewById(R.id.tvStepBadge);
        tvStepDescription = findViewById(R.id.tvStepDescription);
        bottomGuideDock = findViewById(R.id.bottomGuideDock);
        rvGuideSteps = findViewById(R.id.rvGuideSteps);
        guideOverlay = findViewById(R.id.guideOverlay);
        btnToggleManualGuide = findViewById(R.id.btnToggleManualGuide);
        btnManualOverride = findViewById(R.id.btnManualOverride);
        webView = findViewById(R.id.webViewCancel);
        agentCoverLayout = findViewById(R.id.agentCoverLayout);
        loginNoticeBanner = findViewById(R.id.loginNoticeBanner);
        tvLoginNoticeText = findViewById(R.id.tvLoginNoticeText);
        btnReturnAgentMode = findViewById(R.id.btnReturnAgentMode);
        tvAgentStatusPill = findViewById(R.id.tvAgentStatusPill);
        tvAgentStepBadge = findViewById(R.id.tvAgentStepBadge);
        tvAgentHeadline = findViewById(R.id.tvAgentHeadline);
        tvAgentSubtext = findViewById(R.id.tvAgentSubtext);
        tvAgentTargetButton = findViewById(R.id.tvAgentTargetButton);
        ivAgentWebPreview = findViewById(R.id.ivAgentWebPreview);
        btnAgentFinalConfirm = findViewById(R.id.btnAgentFinalConfirm);
        btnToggleWebView = findViewById(R.id.btnToggleWebView);
        pbAgentWorking = findViewById(R.id.pbAgentWorking);
        agentCoverSpacer = findViewById(R.id.agentCoverSpacer);

        if (automaticGuideEnabled) {
            showAgentCover();
        } else if (agentCoverLayout != null) {
            agentCoverLayout.setVisibility(View.GONE);
        }

        if (serviceName != null) {
            tvServiceName.setText(serviceName);
            if (tvAgentHeadline != null) {
                tvAgentHeadline.setText(serviceName + " 해지 페이지를 열고 있어요");
            }
        }

        if (btnToggleWebView != null) {
            btnToggleWebView.setOnClickListener(v -> {
                userRequestedRawWebView = true;
                // 직접 하겠다고 하면 예약된 자동 넘김도 멈춘다.
                if (pendingAutoAdvanceOptOut != null) {
                    pendingAutoAdvanceOptOut.run();
                    pendingAutoAdvanceOptOut = null;
                }
                showWebPage("화면을 보면서 직접 진행하고 있어요.", true);
            });
        }

        if (btnReturnAgentMode != null) {
            btnReturnAgentMode.setOnClickListener(v -> {
                userRequestedRawWebView = false;
                showAgentCover();
            });
        }

        if (btnAgentFinalConfirm != null) {
            btnAgentFinalConfirm.setOnClickListener(v -> {
                btnAgentFinalConfirm.setEnabled(false);
                if (userStepTapTarget != null) {
                    btnAgentFinalConfirm.setText("누르는 중…");
                    userStepTapTarget = null;
                    if (naverGuideController != null) {
                        naverGuideController.performUserConfirmedStepTap();
                    }
                    return;
                }
                btnAgentFinalConfirm.setText("해지 요청 중…");
                if (tvAgentSubtext != null) {
                    tvAgentSubtext.setText("해지 버튼을 누르고 완료 화면이 뜨는지 확인하고 있어요.");
                }
                if (naverGuideController != null) {
                    naverGuideController.performUserConfirmedFinalTap(null);
                } else {
                    handleSuccessCompletion("manual", "user_completed_button");
                }
            });
        }

        if (currentCancelUrl != null) {
            try {
                Uri uri = Uri.parse(currentCancelUrl);
                tvServiceUrl.setText(uri.getHost() != null ? uri.getHost() : currentCancelUrl);
            } catch (Exception e) {
                tvServiceUrl.setText(currentCancelUrl);
            }
        }

        btnClose.setOnClickListener(v -> closeWithResult("closed", null));

        if (btnComplete != null) {
            btnComplete.setOnClickListener(v -> handleSuccessCompletion("manual", "user_completed_button"));
        }

        // 외부 브라우저(Chrome/삼성인터넷 등)로 열기 버튼
        if (btnOpenExternal != null) {
            btnOpenExternal.setOnClickListener(v -> {
                String targetUrl = (webView != null && webView.getUrl() != null && !webView.getUrl().isEmpty())
                    ? webView.getUrl()
                    : currentCancelUrl;
                if (targetUrl != null && !targetUrl.isEmpty()) {
                    try {
                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(targetUrl));
                        browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(browserIntent);
                        Toast.makeText(this, "외부 브라우저에서는 위치 안내가 이어지지 않아요.", Toast.LENGTH_LONG).show();
                    } catch (Exception e) {
                        Toast.makeText(this, "브라우저를 열 수 없습니다.", Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        // 가이드 스텝 데이터 파싱 및 fallback 적용
        parseGuideSteps(stepsJson);

        // 리사이클러뷰 설정
        rvGuideSteps.setLayoutManager(new LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false));
        guideAdapter = new GuideAdapter(stepList, position -> {
            selectedIndex = position;
            updateStepInfo(position);
            guideAdapter.notifyDataSetChanged();
        });
        rvGuideSteps.setAdapter(guideAdapter);

        if (!stepList.isEmpty()) {
            updateStepInfo(0);
        }

        if (btnToggleManualGuide != null) {
            btnToggleManualGuide.setOnClickListener(v -> {
                if (naverGuideController != null) {
                    naverGuideController.toggleManualGuide();
                    return;
                }
                boolean showing = rvGuideSteps.getVisibility() == View.VISIBLE;
                rvGuideSteps.setVisibility(showing ? View.GONE : View.VISIBLE);
                btnToggleManualGuide.setText(showing ? "단계별 방법" : "가이드 접기");
            });
        }

        if (automaticGuideEnabled && guideOverlay != null) {
            // 하단 도크(bottomGuideDock)가 이미 안내 문구를 보여주므로, 웹뷰 위 말풍선은 기본적으로 접어두어
            // 스크롤 시 화면을 가리거나 펼쳐지지 않게 하고 타깃 하이라이트 테두리와 화살표만 깔끔하게 표시한다.
            guideOverlay.setBubbleEnabled(false);
            guideOverlay.setUserMinimized(true);
            naverGuideController = new KkudokNaverGuideController(
                    guideRoute, webView, guideOverlay, tvStepBadge, tvStepDescription, rvGuideSteps, btnToggleManualGuide);

            naverGuideController.setListener(new KkudokNaverGuideController.Listener() {
                @Override
                public void onAutoAdvanceCountdownStarted(long durationMs, Runnable onCancelOptOut) {
                    pendingAutoAdvanceOptOut = onCancelOptOut;
                    if (btnManualOverride != null) {
                        btnManualOverride.setVisibility(View.VISIBLE);
                        btnManualOverride.setOnClickListener(v -> {
                            btnManualOverride.setVisibility(View.GONE);
                            if (onCancelOptOut != null) onCancelOptOut.run();
                        });
                    }
                }

                @Override
                public void onAutoAdvanceCountdownCancelled() {
                    if (btnManualOverride != null) {
                        btnManualOverride.setVisibility(View.GONE);
                    }
                }

                @Override
                public void onCancellationSuccessDetected(String detectedBy, String matchedSignal) {
                    handleSuccessCompletion(detectedBy, matchedSignal);
                }

                @Override
                public void onLoginStateChanged(boolean isLoginRequired, String message) {
                    if (isLoginRequired) {
                        // 로그인 화면은 사용자가 직접 입력해야 하므로 웹뷰를 보여주고, 로그인이 끝나면 다시 진행 화면으로 덮는다.
                        showWebPage("로그인해 주세요. 로그인이 끝나면 꾸독이 이어서 진행해요.", false);
                    } else if (!userRequestedRawWebView) {
                        showAgentCover();
                    }
                }

                @Override
                public void onStepProgressUpdated(String badge, String instruction, boolean isFinalStep, String matchedTargetText) {
                    if (tvAgentStepBadge != null && badge != null && !badge.isEmpty()) {
                        tvAgentStepBadge.setText(badge);
                    }
                    String sName = serviceName != null ? serviceName : "구독";
                    boolean hasTarget = matchedTargetText != null && !matchedTargetText.trim().isEmpty();
                    if (isFinalStep) {
                        userStepTapTarget = null;
                        // 최종 해지 버튼은 대신 누르지 않고, 화면 미리보기와 함께 사용자의 확정을 받는다.
                        if (!userRequestedRawWebView) showAgentCover();
                        if (pbAgentWorking != null) pbAgentWorking.setVisibility(View.GONE);
                        if (tvAgentStatusPill != null) {
                            tvAgentStatusPill.setText("마지막 확인이 필요해요");
                            tvAgentStatusPill.setTextColor(Color.parseColor("#F04452"));
                        }
                        if (tvAgentHeadline != null) {
                            tvAgentHeadline.setText(sName + " 해지 직전이에요");
                        }
                        if (tvAgentSubtext != null) {
                            tvAgentSubtext.setText("아래 화면을 확인하고 해지 확정하기를 누르면, 꾸독이 페이지의 해지 버튼을 눌러요.");
                        }
                        if (tvAgentTargetButton != null) {
                            tvAgentTargetButton.setText(hasTarget
                                    ? "누를 버튼: " + matchedTargetText.trim()
                                    : "누를 버튼: 해지 확인");
                        }
                        if (btnAgentFinalConfirm != null) {
                            btnAgentFinalConfirm.setVisibility(View.VISIBLE);
                            btnAgentFinalConfirm.setEnabled(true);
                            btnAgentFinalConfirm.setBackgroundResource(R.drawable.bg_btn_danger);
                            btnAgentFinalConfirm.setText("해지 확정하기");
                        }
                        updateAgentWebPreview();
                    } else if (userStepTapTarget != null && hasTarget && userStepTapTarget.equals(matchedTargetText.trim())) {
                        // 같은 버튼을 다시 스캔한 경우: 사용자 확인 화면을 그대로 둔다.
                        return;
                    } else {
                        userStepTapTarget = null;
                        if (hasTarget && !userRequestedRawWebView) {
                            showAgentCover();
                        }
                        if (pbAgentWorking != null) pbAgentWorking.setVisibility(View.VISIBLE);
                        if (tvAgentStatusPill != null) {
                            tvAgentStatusPill.setText("꾸독이 진행하는 중");
                            tvAgentStatusPill.setTextColor(Color.parseColor("#3182F6"));
                        }
                        if (tvAgentHeadline != null) {
                            tvAgentHeadline.setText(sName + " 해지 메뉴로 이동하고 있어요");
                        }
                        if (tvAgentSubtext != null && instruction != null && !instruction.isEmpty()) {
                            tvAgentSubtext.setText(instruction);
                        }
                        if (tvAgentTargetButton != null) {
                            tvAgentTargetButton.setText(hasTarget
                                    ? "지금 누르는 버튼: " + matchedTargetText.trim()
                                    : "다음 버튼을 찾고 있어요");
                        }
                        if (btnAgentFinalConfirm != null) {
                            btnAgentFinalConfirm.setVisibility(View.GONE);
                        }
                        setPreviewVisible(false);
                    }
                }

                @Override
                public void onUserTapRequired(String targetText) {
                    if (targetText == null || targetText.trim().isEmpty()) return;
                    String label = targetText.trim();
                    userStepTapTarget = label;
                    String sName = serviceName != null ? serviceName : "구독";
                    if (!userRequestedRawWebView) showAgentCover();
                    if (pbAgentWorking != null) pbAgentWorking.setVisibility(View.GONE);
                    if (tvAgentStatusPill != null) {
                        tvAgentStatusPill.setText("확인이 필요해요");
                        tvAgentStatusPill.setTextColor(Color.parseColor("#3182F6"));
                    }
                    if (tvAgentHeadline != null) tvAgentHeadline.setText(sName + " 해지 버튼을 찾았어요");
                    if (tvAgentSubtext != null) {
                        tvAgentSubtext.setText("해지와 관련된 버튼은 꾸독이 혼자 누르지 않아요. 화면을 확인하고 아래 버튼을 누르면 대신 눌러 드릴게요.");
                    }
                    if (tvAgentTargetButton != null) tvAgentTargetButton.setText("누를 버튼: " + label);
                    if (btnAgentFinalConfirm != null) {
                        btnAgentFinalConfirm.setVisibility(View.VISIBLE);
                        btnAgentFinalConfirm.setEnabled(true);
                        btnAgentFinalConfirm.setBackgroundResource(R.drawable.bg_btn_primary);
                        btnAgentFinalConfirm.setText("'" + label + "' 누르기");
                    }
                    updateAgentWebPreview();
                }

                @Override
                public void onStepTapFailed(String reason) {
                    userRequestedRawWebView = true;
                    showWebPage("버튼을 누르지 못했어요. 화면에서 직접 눌러 주세요.", true);
                }

                @Override
                public void onManualFallbackRequired(String reason) {
                    // 버튼을 찾지 못한 화면은 사용자가 직접 볼 수 있게 열되, 다음 화면에서 버튼을 찾으면 다시 진행 카드로 복귀할 수 있게 둔다.
                    if (userRequestedRawWebView) return;
                    showWebPage("꾸독이 다음 버튼을 찾지 못했어요. 화면을 보면서 직접 진행해 주세요.", true);
                }

                @Override
                public void onFinalTapUnverified(String reason) {
                    // 해지 버튼을 누르지 못했거나 완료 화면을 확인하지 못하면 완료로 처리하지 않고 실제 화면을 보여준다.
                    userRequestedRawWebView = true;
                    if (btnAgentFinalConfirm != null) {
                        btnAgentFinalConfirm.setEnabled(true);
                        btnAgentFinalConfirm.setText("해지 확정하기");
                    }
                    String notice = "click_not_found".equals(reason) || "click_error".equals(reason)
                            ? "해지 버튼을 누르지 못했어요. 화면에서 직접 눌러 주세요."
                            : "해지 완료 화면을 확인하지 못했어요. 해지가 끝났다면 위의 [해지 완료]를 눌러 주세요.";
                    showWebPage(notice, false);
                }
            });

            webView.setOnTouchListener((v, event) -> {
                if (naverGuideController != null) {
                    naverGuideController.onTouch(event);
                }
                return false;
            });
            webView.setOnScrollChangeListener((v, sx, sy, oldSx, oldSy) -> {
                if (naverGuideController != null) naverGuideController.onScroll();
            });
            webView.addOnLayoutChangeListener((v, l, t, r, b, ol, ot, orr, ob) -> {
                if (naverGuideController != null && (r-l != orr-ol || b-t != ob-ot)) {
                    naverGuideController.onLayoutChanged();
                }
            });
        } else if (guideOverlay != null) {
            guideOverlay.setVisibility(View.GONE);
        }

        // 키보드 열림/닫힘 감지하여 하단 20% 도크 숨김/표시
        setupKeyboardListener();

        // 웹뷰 환경 설정 (구글 OAuth 허용 및 팝업창 처리 포함)
        setupWebView(currentCancelUrl);

        // 30일 지난 증빙 이미지 백그라운드 정리
        executor.execute(this::cleanOldProofs);

        // 뒤로가기 제어
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    closeWithResult("closed", null);
                }
            }
        });
    }

    private void handleSuccessCompletion(String detectedBy, String matchedSignal) {
        if (isFinishingFlow) return;
        isFinishingFlow = true;

        if (btnManualOverride != null) {
            btnManualOverride.setVisibility(View.GONE);
        }
        if (guideOverlay != null) {
            guideOverlay.setVisibility(View.GONE);
        }
        tvStepDescription.setText("해지가 확인됐어요");

        String proofPath = captureWebViewProof();
        String proofWebPath = null;
        if (proofPath != null) {
            proofWebPath = "https://localhost/_capacitor_file_" + proofPath;
        }

        completedResultIntent = new Intent();
        completedResultIntent.putExtra("serviceId", serviceId);
        completedResultIntent.putExtra("status", "completed");
        completedResultIntent.putExtra("detectedBy", detectedBy);
        completedResultIntent.putExtra("url", webView != null ? webView.getUrl() : currentCancelUrl);
        completedResultIntent.putExtra("proofPath", proofPath);
        completedResultIntent.putExtra("proofWebPath", proofWebPath);
        int autoTaps = naverGuideController != null ? naverGuideController.getAutoAdvancer().getSessionAutoTapCount() : 0;
        completedResultIntent.putExtra("autoTaps", autoTaps);
        setResult(RESULT_OK, completedResultIntent);

        mainHandler.postDelayed(() -> {
            if (isFinishing() || isDestroyed() || webView == null) return;
            finish();
        }, 1500L);
    }

    private void closeWithResult(String status, String proofPath) {
        if (completedResultIntent != null) {
            setResult(RESULT_OK, completedResultIntent);
            finish();
            return;
        }
        if (isFinishingFlow) return;
        isFinishingFlow = true;

        Intent data = new Intent();
        data.putExtra("serviceId", serviceId);
        data.putExtra("status", status != null ? status : "closed");
        data.putExtra("detectedBy", (String) null);
        data.putExtra("url", webView != null ? webView.getUrl() : currentCancelUrl);
        data.putExtra("proofPath", proofPath);
        data.putExtra("proofWebPath", proofPath != null ? "https://localhost/_capacitor_file_" + proofPath : null);
        int autoTaps = naverGuideController != null ? naverGuideController.getAutoAdvancer().getSessionAutoTapCount() : 0;
        data.putExtra("autoTaps", autoTaps);
        setResult("completed".equalsIgnoreCase(status) ? RESULT_OK : RESULT_CANCELED, data);
        finish();
    }

    private void updateAgentWebPreview() {
        try {
            if (ivAgentWebPreview == null || webView == null || webView.getWidth() <= 0 || webView.getHeight() <= 0) {
                return;
            }
            int w = webView.getWidth();
            int h = webView.getHeight();
            float scale = Math.min(1.0f, 540.0f / (float) w);
            int targetW = Math.max(1, Math.round(w * scale));
            int targetH = Math.max(1, Math.round(h * scale));
            Bitmap bmp = Bitmap.createBitmap(targetW, targetH, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bmp);
            canvas.scale(scale, scale);
            webView.draw(canvas);
            ivAgentWebPreview.setImageBitmap(bmp);
            setPreviewVisible(true);
        } catch (Throwable ignored) {
        }
    }

    private void setPreviewVisible(boolean visible) {
        if (ivAgentWebPreview != null) ivAgentWebPreview.setVisibility(visible ? View.VISIBLE : View.GONE);
        if (agentCoverSpacer != null) agentCoverSpacer.setVisibility(visible ? View.GONE : View.VISIBLE);
    }

    /** 진행 화면으로 웹뷰를 덮는다. 하단 단계 도크는 진행 화면과 같은 내용을 보여주므로 함께 숨긴다. */
    private void showAgentCover() {
        if (agentCoverLayout != null) agentCoverLayout.setVisibility(View.VISIBLE);
        if (loginNoticeBanner != null) loginNoticeBanner.setVisibility(View.GONE);
        if (bottomGuideDock != null) bottomGuideDock.setVisibility(View.GONE);
    }

    /** 실제 웹 화면을 보여주고 위쪽에 한 줄 안내를 띄운다. */
    private void showWebPage(String notice, boolean allowReturnToAgent) {
        if (agentCoverLayout != null) agentCoverLayout.setVisibility(View.GONE);
        if (bottomGuideDock != null) bottomGuideDock.setVisibility(View.VISIBLE);
        if (loginNoticeBanner != null) {
            loginNoticeBanner.setVisibility(View.VISIBLE);
            if (tvLoginNoticeText != null && notice != null) tvLoginNoticeText.setText(notice);
            if (btnReturnAgentMode != null) {
                btnReturnAgentMode.setVisibility(allowReturnToAgent ? View.VISIBLE : View.GONE);
            }
        }
    }


    private void cleanOldProofs() {
        try {
            File cacheDir = getCacheDir();
            if (cacheDir == null) return;
            File proofDir = new File(cacheDir, "proofs");
            if (!proofDir.exists() || !proofDir.isDirectory()) return;
            long threshold = System.currentTimeMillis() - (30L * 24L * 60L * 60L * 1000L);
            File[] files = proofDir.listFiles();
            if (files != null) {
                for (File f : files) {
                    if (f.isFile() && f.lastModified() < threshold) {
                        f.delete();
                    }
                }
            }
        } catch (Throwable ignored) {
        }
    }

    private String captureWebViewProof() {
        try {
            if (webView == null || webView.getWidth() <= 0 || webView.getHeight() <= 0) {
                return null;
            }
            int w = webView.getWidth();
            int h = webView.getHeight();
            float scale = Math.min(1.0f, 1080.0f / (float) w);
            int targetW = Math.max(1, Math.round(w * scale));
            int targetH = Math.max(1, Math.round(h * scale));

            Bitmap bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            webView.draw(canvas);

            Bitmap finalBitmap = bitmap;
            if (scale < 1.0f) {
                finalBitmap = Bitmap.createScaledBitmap(bitmap, targetW, targetH, true);
                if (finalBitmap != bitmap) {
                    bitmap.recycle();
                }
            }

            File cacheDir = getCacheDir();
            File proofDir = new File(cacheDir, "proofs");
            if (!proofDir.exists()) proofDir.mkdirs();
            File proofFile = new File(proofDir, "cancel_proof_" + System.currentTimeMillis() + ".jpg");
            FileOutputStream fos = new FileOutputStream(proofFile);
            finalBitmap.compress(Bitmap.CompressFormat.JPEG, 70, fos);
            fos.flush();
            fos.close();
            finalBitmap.recycle();
            return proofFile.getAbsolutePath();
        } catch (Throwable t) {
            t.printStackTrace();
            return null;
        }
    }

    private void parseGuideSteps(String jsonStr) {
        if (jsonStr != null && !jsonStr.trim().isEmpty()) {
            try {
                JSONArray arr = new JSONArray(jsonStr);
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject obj = arr.getJSONObject(i);
                    int number = obj.optInt("stepNumber", i + 1);
                    String title = obj.optString("title", "스텝 " + number);
                    String desc = obj.optString("description", "");
                    String img = obj.optString("imageUrl", "");
                    stepList.add(new GuideStepItem(number, title, desc, img));
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        if (stepList.isEmpty()) {
            stepList.add(new GuideStepItem(1, "로그인", "서비스 공식 앱이나 웹사이트에 로그인하세요.", ""));
            stepList.add(new GuideStepItem(2, "구독 관리 찾기", "계정이나 설정에서 [구독], [멤버십], [결제] 같은 메뉴를 찾으세요. 앱에서 결제했다면 App Store나 Google Play 구독에서 해지해요.", ""));
            stepList.add(new GuideStepItem(3, "해지 확인", "해지 버튼을 직접 누르고 해지 완료 문구가 나오는지 확인하세요.", ""));
        }
    }

    private void updateStepInfo(int index) {
        if (index < 0 || index >= stepList.size()) return;
        GuideStepItem item = stepList.get(index);
        tvStepBadge.setText(item.stepNumber + "/" + stepList.size() + "단계");
        tvStepDescription.setText(item.description);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView(String url) {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.HONEYCOMB) {
            settings.setAllowContentAccess(false);
        }
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        String defaultUA = settings.getUserAgentString();
        String cleanUA = defaultUA
                .replaceAll("(?i);\\s*wv", "")
                .replaceAll("(?i)Version/\\d+\\.\\d+\\s*", "");
        settings.setUserAgentString(cleanUA);

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                    return false;
                }
                return handleCustomScheme(uri.toString());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String loadUrl) {
                if (loadUrl.startsWith("http://") || loadUrl.startsWith("https://")) {
                    return false;
                }
                return handleCustomScheme(loadUrl);
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                if (pbLoading != null) {
                    pbLoading.setVisibility(View.VISIBLE);
                }
                if (naverGuideController != null) naverGuideController.onPageLoading();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (pbLoading != null) {
                    pbLoading.setVisibility(View.GONE);
                }
                if (naverGuideController != null) naverGuideController.onPageFinished();
            }

            @Override
            public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                super.doUpdateVisitedHistory(view, url, isReload);
                if (naverGuideController != null) {
                    naverGuideController.onPageFinished();
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame() && pbLoading != null) {
                    pbLoading.setVisibility(View.GONE);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (pbLoading != null) {
                    pbLoading.setProgress(newProgress);
                    if (newProgress >= 100) {
                        pbLoading.setVisibility(View.GONE);
                    }
                }
            }

            @SuppressLint("SetJavaScriptEnabled")
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                WebView newWebView = new WebView(CancelBrowserActivity.this);
                WebSettings newSettings = newWebView.getSettings();
                newSettings.setJavaScriptEnabled(true);
                newSettings.setDomStorageEnabled(true);
                newSettings.setDatabaseEnabled(true);
                newSettings.setSupportMultipleWindows(true);
                newSettings.setJavaScriptCanOpenWindowsAutomatically(true);
                newSettings.setUserAgentString(cleanUA);
                newSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
                newSettings.setAllowFileAccess(false);
                newSettings.setAllowContentAccess(false);

                CookieManager.getInstance().setAcceptThirdPartyCookies(newWebView, true);

                if (naverGuideController != null) naverGuideController.onPopupOpened();
                final Dialog popupDialog = new Dialog(CancelBrowserActivity.this, android.R.style.Theme_Material_Light_NoActionBar_Fullscreen);
                popupDialog.setContentView(newWebView);
                popupDialog.setOnDismissListener(d -> {
                    if (naverGuideController != null) naverGuideController.onPopupClosed();
                });
                popupDialog.show();

                newWebView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onCloseWindow(WebView window) {
                        popupDialog.dismiss();
                        if (naverGuideController != null) naverGuideController.onPopupClosed();
                    }
                });

                newWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                        Uri uri = req.getUrl();
                        String scheme = uri.getScheme();
                        if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                            return false;
                        }
                        handleCustomScheme(uri.toString());
                        return true;
                    }
                });

                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(newWebView);
                resultMsg.sendToTarget();
                return true;
            }
        });

        if (url != null && !url.trim().isEmpty()) {
            webView.loadUrl(url);
        }
    }

    private boolean handleCustomScheme(String url) {
        try {
            Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            intent.setComponent(null);
            intent.setSelector(null);
            try {
                startActivity(intent);
                return true;
            } catch (ActivityNotFoundException e) {
                String fallbackUrl = intent.getStringExtra("browser_fallback_url");
                if (fallbackUrl != null && !fallbackUrl.isEmpty()) {
                    WebSecurityPolicy policy = (guideRoute != null && guideRoute.getSecurityPolicy() != null)
                            ? guideRoute.getSecurityPolicy()
                            : new WebSecurityPolicy();
                    if (policy.isHttpOrHttps(fallbackUrl) && policy.isAllowedHost(fallbackUrl)) {
                        webView.loadUrl(fallbackUrl);
                        return true;
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return true;
    }

    private void setupKeyboardListener() {
        final View rootView = findViewById(R.id.rootLayout);
        rootView.getViewTreeObserver().addOnGlobalLayoutListener(() -> {
            Rect r = new Rect();
            rootView.getWindowVisibleDisplayFrame(r);
            int screenHeight = rootView.getRootView().getHeight();
            int keypadHeight = screenHeight - r.bottom;

            if (keypadHeight > screenHeight * 0.15) {
                bottomGuideDock.setVisibility(View.GONE);
            } else if (agentCoverLayout == null || agentCoverLayout.getVisibility() != View.VISIBLE) {
                bottomGuideDock.setVisibility(View.VISIBLE);
            }
        });
    }

    @Override
    protected void onDestroy() {
        mainHandler.removeCallbacksAndMessages(null);
        if (naverGuideController != null) {
            naverGuideController.destroy();
            naverGuideController = null;
        }
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        executor.shutdownNow();
        super.onDestroy();
    }

    public class GuideAdapter extends RecyclerView.Adapter<GuideAdapter.ViewHolder> {
        private final List<GuideStepItem> items;
        private final OnItemClickListener listener;

        public interface OnItemClickListener {
            void onItemClick(int position);
        }

        public GuideAdapter(List<GuideStepItem> items, OnItemClickListener listener) {
            this.items = items;
            this.listener = listener;
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_guide_card, parent, false);
            return new ViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
            GuideStepItem item = items.get(position);
            holder.tvStepTitle.setText(item.title);
            holder.tvStepNumberBadge.setText(String.valueOf(item.stepNumber));

            boolean isSelected = (position == selectedIndex);
            if (isSelected) {
                GradientDrawable ring = new GradientDrawable();
                ring.setShape(GradientDrawable.RECTANGLE);
                ring.setStroke(6, Color.parseColor("#3182F6"));
                ring.setCornerRadius(16f);
                holder.vSelectionRing.setBackground(ring);
                holder.vSelectionRing.setVisibility(View.VISIBLE);
                holder.itemView.setAlpha(1.0f);
            } else {
                holder.vSelectionRing.setVisibility(View.GONE);
                holder.itemView.setAlpha(0.6f);
            }

            holder.ivStepThumb.setImageBitmap(null);
            if (item.imageUrl != null && !item.imageUrl.isEmpty()) {
                executor.execute(() -> {
                    try {
                        URL url = new URL(item.imageUrl);
                        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                        conn.setConnectTimeout(5000);
                        conn.setReadTimeout(5000);
                        conn.setDoInput(true);
                        conn.connect();
                        InputStream input = conn.getInputStream();
                        Bitmap bmp = BitmapFactory.decodeStream(input);
                        mainHandler.post(() -> {
                            if (bmp != null) {
                                holder.ivStepThumb.setImageBitmap(bmp);
                            }
                        });
                    } catch (Exception ignored) {
                    }
                });
            }

            holder.itemView.setOnClickListener(v -> listener.onItemClick(position));
        }

        @Override
        public int getItemCount() {
            return items.size();
        }

        public class ViewHolder extends RecyclerView.ViewHolder {
            ImageView ivStepThumb;
            View vSelectionRing;
            TextView tvStepNumberBadge;
            TextView tvStepTitle;

            public ViewHolder(@NonNull View itemView) {
                super(itemView);
                ivStepThumb = itemView.findViewById(R.id.ivStepThumb);
                vSelectionRing = itemView.findViewById(R.id.vSelectionRing);
                tvStepNumberBadge = itemView.findViewById(R.id.tvStepNumberBadge);
                tvStepTitle = itemView.findViewById(R.id.tvStepTitle);
            }
        }
    }
}
