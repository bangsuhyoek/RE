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

        String serviceName = getIntent().getStringExtra("serviceName");
        currentCancelUrl = getIntent().getStringExtra("cancelUrl");
        String stepsJson = getIntent().getStringExtra("guideStepsJson");

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
        webView = findViewById(R.id.webViewCancel);

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
                    try {
                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(targetUrl));
                        browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(browserIntent);
                        Toast.makeText(this, "기본 브라우저에서 열었어요.", Toast.LENGTH_SHORT).show();
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

        // 가이드 스텝이 없는 경우 안정적인 기본 Fallback 3단계 생성
        if (stepList.isEmpty()) {
            stepList.add(new GuideStepItem(1, "로그인", "서비스 계정으로 로그인하세요.", ""));
            stepList.add(new GuideStepItem(2, "멤버십 관리", "프로필 > 멤버십 또는 계정 관리 메뉴를 선택하세요.", ""));
            stepList.add(new GuideStepItem(3, "해지 완료", "해지 신청 후 최종 완료 화면을 확인하세요.", ""));
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
        settings.setAllowFileAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        // 팝업 창(Google, 카카오 등 소셜 로그인 및 본인인증 window.open) 허용
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        // Mixed Content 허용
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

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
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (pbLoading != null) {
                    pbLoading.setVisibility(View.GONE);
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
                newSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

                CookieManager.getInstance().setAcceptThirdPartyCookies(newWebView, true);

                final Dialog popupDialog = new Dialog(CancelBrowserActivity.this, android.R.style.Theme_Material_Light_NoActionBar_Fullscreen);
                popupDialog.setContentView(newWebView);
                popupDialog.show();

                newWebView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onCloseWindow(WebView window) {
                        popupDialog.dismiss();
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
            if (intent.resolveActivity(getPackageManager()) != null) {
                startActivity(intent);
                return true;
            }
            String fallbackUrl = intent.getStringExtra("browser_fallback_url");
            if (fallbackUrl != null && !fallbackUrl.isEmpty()) {
                webView.loadUrl(fallbackUrl);
                return true;
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
