package com.submate.app;

import android.annotation.SuppressLint;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Rect;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

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
    private LinearLayout bottomGuideDock;
    private TextView tvStepBadge;
    private TextView tvStepDescription;
    private RecyclerView rvGuideSteps;
    private GuideAdapter guideAdapter;
    private final List<GuideStepItem> stepList = new ArrayList<>();
    private int selectedIndex = 0;

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
        String cancelUrl = getIntent().getStringExtra("cancelUrl");
        String stepsJson = getIntent().getStringExtra("guideStepsJson");

        TextView tvServiceName = findViewById(R.id.tvServiceName);
        TextView tvServiceUrl = findViewById(R.id.tvServiceUrl);
        View btnClose = findViewById(R.id.btnClose);
        View btnComplete = findViewById(R.id.btnComplete);
        tvStepBadge = findViewById(R.id.tvStepBadge);
        tvStepDescription = findViewById(R.id.tvStepDescription);
        bottomGuideDock = findViewById(R.id.bottomGuideDock);
        rvGuideSteps = findViewById(R.id.rvGuideSteps);
        webView = findViewById(R.id.webViewCancel);

        if (serviceName != null) {
            tvServiceName.setText(serviceName);
        }

        if (cancelUrl != null) {
            try {
                Uri uri = Uri.parse(cancelUrl);
                tvServiceUrl.setText(uri.getHost() != null ? uri.getHost() : cancelUrl);
            } catch (Exception e) {
                tvServiceUrl.setText(cancelUrl);
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

        // 가이드 스텝 데이터 파싱
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

        // 웹뷰 환경 설정
        setupWebView(cancelUrl);
    }

    private void parseGuideSteps(String jsonStr) {
        if (jsonStr == null || jsonStr.trim().isEmpty()) return;
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
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        // 구글 소셜 로그인 차단 회피용 모바일 크롬 User-Agent
        String defaultUA = settings.getUserAgentString();
        settings.setUserAgentString(defaultUA.replace("; wv", ""));

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String loadUrl) {
                view.loadUrl(loadUrl);
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient());

        if (url != null && !url.trim().isEmpty()) {
            webView.loadUrl(url);
        }
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
                        conn.setDoInput(true);
                        conn.connect();
                        InputStream input = conn.getInputStream();
                        Bitmap bmp = BitmapFactory.decodeStream(input);
                        mainHandler.post(() -> holder.ivStepThumb.setImageBitmap(bmp));
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
