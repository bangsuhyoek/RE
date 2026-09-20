package com.submate.app;

import android.annotation.SuppressLint;
import android.app.Dialog;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
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

import com.submate.app.character.CharacterAssetManager;
import com.submate.app.webguide.GuideOverlayContainer;
import com.submate.app.webguide.KkudokNaverGuideController;
import com.submate.app.webguide.WebSecurityPolicy;

import org.json.JSONArray;
import org.json.JSONObject;

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
    private String guideMode = "MANUAL_OFFICIAL";
    private String officialSourceUrl = "";
    private String fallbackOfficialUrl = "";
    private boolean automaticGuideEnabled = false;
    private final List<String> allowedDomains = new ArrayList<>();
    private WebSecurityPolicy webSecurityPolicy;
    private GuideOverlayContainer guideOverlay;
    private KkudokNaverGuideController naverGuideController;
    private TextView btnToggleManualGuide;

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
        guideMode = getIntent().getStringExtra("guideMode");
        if (guideMode == null || guideMode.trim().isEmpty()) {
            guideMode = isNaverPlus(serviceId, serviceName) ? "AUTO_SEMANTIC" : "MANUAL_OFFICIAL";
        }
        officialSourceUrl = getIntent().getStringExtra("officialSourceUrl");
        if (officialSourceUrl == null) officialSourceUrl = "";
        fallbackOfficialUrl = getIntent().getStringExtra("fallbackOfficialUrl");
        if (fallbackOfficialUrl == null) fallbackOfficialUrl = "";
        automaticGuideEnabled = "AUTO_SEMANTIC".equalsIgnoreCase(guideMode)
                && isNaverPlus(serviceId, serviceName);
        String stepsJson = getIntent().getStringExtra("guideStepsJson");
        parseAllowedDomains(getIntent().getStringExtra("allowedDomainsJson"), currentCancelUrl);
        webSecurityPolicy = new WebSecurityPolicy(allowedDomains);

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
        webView = findViewById(R.id.webViewCancel);
        ImageView dockCharacter = findViewById(R.id.ivDockCharacter);
        CharacterAssetManager.applyToImageView(this, dockCharacter);

        if (serviceName != null) {
            tvServiceName.setText(serviceName);
        }

        if (currentCancelUrl != null) {
            try {
                Uri uri = Uri.parse(currentCancelUrl);
                tvServiceUrl.setText(uri.getHost() != null ? uri.getHost() : currentCancelUrl);
            } catch (Exception e) {
                tvServiceUrl.setText(currentCancelUrl);
            }
        }

        btnClose.setOnClickListener(v -> {
            setResult(RESULT_CANCELED);
            finish();
        });

        if (btnComplete != null) {
            btnComplete.setOnClickListener(v -> {
                setResult(RESULT_OK);
                finish();
            });
        }

        // 외부 브라우저(Chrome/삼성인터넷 등)로 열기 버튼: 이미 로그인된 세션 및 구글 로그인 문제 회피용
        if (btnOpenExternal != null) {
            btnOpenExternal.setOnClickListener(v -> {
                String targetUrl = (webView != null && webView.getUrl() != null && !webView.getUrl().isEmpty())
                    ? webView.getUrl()
                    : currentCancelUrl;
                if (targetUrl != null && !targetUrl.isEmpty()) {
                    Uri targetUri = Uri.parse(targetUrl);
                    if (!isAllowedNavigation(targetUri)) {
                        showBlockedNavigation(targetUri);
                        return;
                    }
                    try {
                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, targetUri);
                        browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(browserIntent);
                        Toast.makeText(this, "외부 브라우저에서는 캐릭터 위치 안내가 이어지지 않아요.", Toast.LENGTH_LONG).show();
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
            naverGuideController = new KkudokNaverGuideController(
                    webView, guideOverlay, tvStepBadge, tvStepDescription, rvGuideSteps, btnToggleManualGuide);
            webView.setOnTouchListener((v, event) -> {
                if (event.getActionMasked() == MotionEvent.ACTION_UP && naverGuideController != null) {
                    naverGuideController.onUserInteraction();
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

        // 뒤로가기 제어
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            }
        });
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

        // 검증된 단계가 없을 때는 임의 해지 단계를 만들어내지 않는다.
        if (stepList.isEmpty()) {
            stepList.add(new GuideStepItem(
                    1,
                    "공식 페이지 확인",
                    "꾸독이 검증한 상세 단계가 없어 자동 안내를 중단했어요. 공식 사이트의 계정/구독 관리 화면에서 직접 확인해 주세요.",
                    ""));
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

        // 팝업 창(Google, 카카오 등 소셜 로그인 및 본인인증 window.open) 허용
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        // Mixed Content 허용
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        // Google OAuth의 403 disallowed_useragent 차단을 해제하기 위해
        // WebView 전용 식별자("; wv" 및 "Version/X.X")를 제거한 순수 Chrome Mobile User-Agent 구성
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
                if (webSecurityPolicy != null && webSecurityPolicy.isHttpOrHttps(uri)) {
                    if (isAllowedNavigation(uri)) return false;
                    showBlockedNavigation(uri);
                    return true;
                }
                return handleCustomScheme(uri == null ? "" : uri.toString());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String loadUrl) {
                Uri uri = loadUrl == null ? null : Uri.parse(loadUrl);
                if (webSecurityPolicy != null && webSecurityPolicy.isHttpOrHttps(uri)) {
                    if (isAllowedNavigation(uri)) return false;
                    showBlockedNavigation(uri);
                    return true;
                }
                return handleCustomScheme(loadUrl);
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                Uri pageUri = url == null ? null : Uri.parse(url);
                if (!isAllowedNavigation(pageUri)) {
                    view.stopLoading();
                    showBlockedNavigation(pageUri);
                    return;
                }
                super.onPageStarted(view, url, favicon);
                if (pbLoading != null) {
                    pbLoading.setVisibility(View.VISIBLE);
                }
                if (naverGuideController != null) naverGuideController.onPageLoading();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                Uri pageUri = url == null ? null : Uri.parse(url);
                if (!isAllowedNavigation(pageUri)) {
                    showBlockedNavigation(pageUri);
                    return;
                }
                super.onPageFinished(view, url);
                if (pbLoading != null) {
                    pbLoading.setVisibility(View.GONE);
                }
                if (naverGuideController != null) naverGuideController.onPageFinished();
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

            // 소셜 로그인(Google, Kakao 등) 및 본인인증 팝업창 window.open 완벽 지원
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
                        if (webSecurityPolicy != null && webSecurityPolicy.isHttpOrHttps(uri)) {
                            if (isAllowedNavigation(uri)) return false;
                            showBlockedNavigation(uri);
                            return true;
                        }
                        return handleCustomScheme(uri == null ? "" : uri.toString());
                    }
                });

                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(newWebView);
                resultMsg.sendToTarget();
                return true;
            }
        });

        if (url != null && !url.trim().isEmpty()) {
            Uri initialUri = Uri.parse(url);
            if (isAllowedNavigation(initialUri)) {
                webView.loadUrl(url);
            } else {
                showBlockedNavigation(initialUri);
            }
        }
    }

    private void parseAllowedDomains(String jsonStr, String entryUrl) {
        allowedDomains.clear();
        if (jsonStr != null && !jsonStr.trim().isEmpty()) {
            try {
                JSONArray array = new JSONArray(jsonStr);
                for (int i = 0; i < array.length(); i++) {
                    String value = array.optString(i, "").trim();
                    if (!value.isEmpty() && !allowedDomains.contains(value)) {
                        allowedDomains.add(value);
                    }
                }
            } catch (Exception ignored) {
            }
        }
        if (allowedDomains.isEmpty() && entryUrl != null && !entryUrl.trim().isEmpty()) {
            try {
                Uri uri = Uri.parse(entryUrl);
                if ("https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null) {
                    allowedDomains.add(uri.getHost());
                }
            } catch (Exception ignored) {
            }
        }
    }

    private boolean isAllowedNavigation(Uri uri) {
        return webSecurityPolicy != null && webSecurityPolicy.isAllowedHttpUrl(uri);
    }

    private void showBlockedNavigation(Uri uri) {
        String origin = WebSecurityPolicy.safeOriginLabel(uri);
        String message = "공식 사이트 범위를 벗어나 이동을 중단했어요. (" + origin + ")";
        if (pbLoading != null) pbLoading.setVisibility(View.GONE);
        if (tvStepBadge != null) tvStepBadge.setText("안전 확인");
        if (tvStepDescription != null) tvStepDescription.setText(message);
        if (naverGuideController != null) {
            naverGuideController.onPageLoading();
            if (guideOverlay != null) guideOverlay.showStandaloneMessage(message);
        }
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    private boolean isNaverPlus(String id, String name) {
        String sid = id == null ? "" : id.toLowerCase();
        String sname = name == null ? "" : name.replace(" ", "").toLowerCase();
        return sid.contains("naverplus") || sid.equals("naver")
                || sname.contains("네이버플러스") || sname.contains("naverplus");
    }

    private boolean handleCustomScheme(String url) {
        try {
            Intent intent = Intent.parseUri(url == null ? "" : url, Intent.URI_INTENT_SCHEME);
            String fallbackUrl = intent.getStringExtra("browser_fallback_url");
            if (fallbackUrl != null && !fallbackUrl.isEmpty()) {
                Uri fallbackUri = Uri.parse(fallbackUrl);
                if (isAllowedNavigation(fallbackUri)) {
                    webView.loadUrl(fallbackUrl);
                } else {
                    showBlockedNavigation(fallbackUri);
                }
                return true;
            }
            Toast.makeText(
                    this,
                    "외부 앱 이동은 자동 실행하지 않아요. 공식 웹페이지에서 계속 진행해 주세요.",
                    Toast.LENGTH_LONG
            ).show();
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

            // 키보드가 화면 높이의 15% 이상 차지하면 열린 것으로 간주
            if (keypadHeight > screenHeight * 0.15) {
                bottomGuideDock.setVisibility(View.GONE);
            } else {
                bottomGuideDock.setVisibility(View.VISIBLE);
            }
        });
    }

    @Override
    protected void onDestroy() {
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

    // ==========================================
    // 가이드 카드 리사이클러뷰 어댑터
    // ==========================================
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

            // 비동기 이미지 로딩
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
