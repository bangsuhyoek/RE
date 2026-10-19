package com.submate.app.payment;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 결제 알림 감지 대상 패키지(카드사, 간편결제, 앱스토어, 통신사 및 선택 허용된 문자/메신저/이메일 앱) 및
 * 기기 내 설치된 구독형 앱 스캔 레지스트리
 */
public class PaymentPackageRegistry {

    public static final String PREFS_NAME = "submate_payment_capture_settings";
    public static final String KEY_CAPTURE_MESSAGING = "capture_source_messaging";
    public static final String KEY_CAPTURE_MESSENGER = "capture_source_messenger";
    public static final String KEY_CAPTURE_EMAIL = "capture_source_email";
    public static final String KEY_SETTINGS_INITIALIZED = "capture_sources_initialized";

    public static class SubscriptionAppSpec {
        public final String packageName;
        public final String serviceId;
        public final String serviceName;
        public final String category;
        public final String defaultPlan;
        public final int defaultAmount;

        public SubscriptionAppSpec(String packageName, String serviceId, String serviceName, String category, String defaultPlan, int defaultAmount) {
            this.packageName = packageName;
            this.serviceId = serviceId;
            this.serviceName = serviceName;
            this.category = category;
            this.defaultPlan = defaultPlan;
            this.defaultAmount = defaultAmount;
        }
    }

    // 기본 수집 대상: 카드사 공식 앱, 은행 앱, 간편결제(카카오톡 제외), 앱 스토어, 통신사 고객센터
    public static final Set<String> DEFAULT_PAYMENT_PACKAGES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            // 카드사 공식 앱
            "com.shcard.smartpay",             // 신한 SOL페이
            "com.kbcard.cxh.appcode",          // KB Pay
            "com.kbcard.cxh.appcard",          // KB Pay (구 패키지 호환)
            "com.hyundaicard.appcard",         // 현대카드
            "kr.co.samsungcard.mpocket",       // 삼성카드
            "com.wooricard.smartapp",          // 우리WON카드
            "com.lotte.lottesmartpay",         // 롯데카드 (디지로카)
            "kr.co.hanamembers.hmscustomer",   // 하나Pay
            "com.bccard.mobilecard",           // 페이북/비씨카드
            "nh.smart.card",                   // NH농협카드
            "com.ibk.neobanking",              // IBK기업은행/카드

            // 은행 공식 앱 (입출금/체크카드 알림용)
            "com.shinhan.sbanking",            // 신한 SOL뱅크
            "com.kbstar.kbbank",               // KB스타뱅킹
            "com.wooribank.smart.npib",        // 우리WON뱅킹
            "com.kebhana.hananbank",           // 하나원큐
            "nh.smart.banking",                // NH스마트뱅킹
            "com.kbankwith.smartbank",         // 케이뱅크
            "com.kakaobank.channel",           // 카카오뱅크
            "com.sc.standardchartered",        // SC제일은행

            // 간편결제 및 핀테크 (메신저/소셜 앱 제외)
            "com.samsung.android.spay",        // 삼성월렛/페이
            "viva.republica.toss",             // 토스
            "com.kakaopay.app",                // 카카오페이 (단독 앱)
            "com.nhn.android.search",          // 네이버 / 네이버페이
            "com.nhnent.payapp",               // 페이코 (PAYCO)
            "com.ssg.serviceapp.android.egiftcertificate", // SSG PAY

            // 앱 스토어 및 인앱결제 허브 (구독 갱신·무료체험 종료 알림)
            "com.android.vending",             // Google Play 스토어
            "com.skt.skaf.A000Z00040",         // 원스토어
            "com.sec.android.app.samsungapps", // 갤럭시 스토어

            // 통신 3사 고객센터 (우주패스, 유독, OTT 결합 부가서비스 알림)
            "com.sktelecom.minit",             // T world
            "com.ktshow.cs",                   // 마이 케이티
            "com.lguplus.mobile.cs"            // 당신의 U+
    )));

    // 선택 수집 대상: 문자(SMS) 앱 (기본 비활성화)
    public static final Set<String> MESSAGING_PACKAGES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "com.samsung.android.messaging",   // 삼성 기본 메시지
            "com.google.android.apps.messaging",// 구글 메시지
            "com.lge.message"                  // LG 기본 메시지
    )));

    // 선택 수집 대상: 메신저 앱 (카카오톡 등 알림톡 결제안내 수신용, 기본 비활성화)
    public static final Set<String> MESSENGER_PACKAGES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "com.kakao.talk"                   // 카카오톡
    )));

    // 선택 수집 대상: 이메일 앱 (영수증/인보이스 알림 감지용, 기본 비활성화)
    public static final Set<String> EMAIL_PACKAGES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "com.google.android.gm",              // Gmail
            "com.nhn.android.mail",               // 네이버 메일
            "com.samsung.android.email.provider", // 삼성 이메일
            "com.microsoft.office.outlook",       // Microsoft Outlook
            "net.daum.android.mail"               // 다음 메일
    )));

    // 하위 호환성용 전체 알려진 패키지 Set (동적 검사 시에는 isTargetPackage(Context, ...) 사용 권장)
    public static final Set<String> KNOWN_PAYMENT_PACKAGES = Collections.unmodifiableSet(new HashSet<String>() {{
        addAll(DEFAULT_PAYMENT_PACKAGES);
        addAll(MESSAGING_PACKAGES);
        addAll(MESSENGER_PACKAGES);
        addAll(EMAIL_PACKAGES);
    }});

    public static final List<SubscriptionAppSpec> SUBSCRIPTION_APP_SPECS = Arrays.asList(
            new SubscriptionAppSpec("com.netflix.mediaclient", "netflix", "Netflix", "OTT", "스탠다드", 13500),
            new SubscriptionAppSpec("com.google.android.youtube", "youtube", "YouTube Premium", "OTT", "개인 멤버십", 14900),
            new SubscriptionAppSpec("com.google.android.apps.youtube.music", "ytmusic", "YouTube Music", "음악", "개인", 11990),
            new SubscriptionAppSpec("net.cj.cjhv.gs.tving", "tving", "티빙", "OTT", "스탠다드", 13500),
            new SubscriptionAppSpec("com.disney.disneyplus", "disney", "Disney+", "OTT", "스탠다드", 9900),
            new SubscriptionAppSpec("kr.co.captv.pooqV2", "wavve", "Wavve", "OTT", "스탠다드", 10900),
            new SubscriptionAppSpec("com.frograms.wplay", "watcha", "왓챠", "OTT", "베이직", 7900),
            new SubscriptionAppSpec("com.coupang.mobile", "coupang", "쿠팡 와우", "쇼핑", "와우 멤버십", 7890),
            new SubscriptionAppSpec("com.coupang.mobile.play", "coupang", "쿠팡 와우", "쇼핑", "와우 멤버십", 7890),
            new SubscriptionAppSpec("com.spotify.music", "spotify", "Spotify", "음악", "개인", 10900),
            new SubscriptionAppSpec("com.iloen.melon", "melon", "멜론", "음악", "스트리밍 클럽", 7900),
            new SubscriptionAppSpec("com.ktmusic.geniemusic", "genie", "지니뮤직", "음악", "스마트 음악감상", 8400),
            new SubscriptionAppSpec("skplanet.musicmate", "flo", "FLO", "음악", "무제한 듣기", 8000),
            new SubscriptionAppSpec("kr.co.millie.millieshelf", "millie", "밀리의 서재", "도서/웹툰", "전자책 정기구독", 9900),
            new SubscriptionAppSpec("com.initialcoms.ridi", "ridiselect", "리디셀렉트", "도서/웹툰", "월 정기구독", 4900),
            new SubscriptionAppSpec("com.influential.viall", "welaaa", "윌라 오디오북", "도서/웹툰", "멤버십", 12500),
            new SubscriptionAppSpec("com.openai.chatgpt", "chatgpt", "ChatGPT Plus", "소프트웨어", "ChatGPT Plus", 29000),
            new SubscriptionAppSpec("com.anthropic.claude", "claude-pro", "Claude Pro", "SaaS", "Claude Pro", 29000),
            new SubscriptionAppSpec("ai.perplexity.app.android", "perplexity-pro", "Perplexity Pro", "SaaS", "Perplexity Pro", 27000),
            new SubscriptionAppSpec("notion.id", "notion", "Notion", "SaaS", "Plus", 13500),
            new SubscriptionAppSpec("com.canva.editor", "canva", "Canva Pro", "SaaS", "Canva Pro", 14000),
            new SubscriptionAppSpec("com.duolingo", "duolingo-super", "Duolingo Super", "교육", "Super", 14000),
            new SubscriptionAppSpec("com.sampleapp", "baemin-club", "배민클럽", "쇼핑", "월간", 3990),
            new SubscriptionAppSpec("com.fineapp.yogiyo", "yogipass", "요기패스X", "쇼핑", "월간", 2900),
            new SubscriptionAppSpec("com.Kurly.m2", "kurly-members", "컬리멤버스", "쇼핑", "월간", 1900),
            new SubscriptionAppSpec("com.microsoft.office.officehubrow", "ms365", "Microsoft 365", "SaaS", "Personal", 8900),
            new SubscriptionAppSpec("com.adobe.lrmobile", "adobe", "Adobe Creative Cloud", "SaaS", "포토그래피 플랜", 13200),
            new SubscriptionAppSpec("com.evernote", "evernote", "Evernote", "SaaS", "Personal", 11900),
            new SubscriptionAppSpec("com.agilebits.onepassword", "1password", "1Password", "SaaS", "Individual", 4500)
    );

    public static class CaptureSourceSettings {
        public final boolean captureMessaging;
        public final boolean captureMessenger;
        public final boolean captureEmail;

        public CaptureSourceSettings(boolean captureMessaging, boolean captureMessenger, boolean captureEmail) {
            this.captureMessaging = captureMessaging;
            this.captureMessenger = captureMessenger;
            this.captureEmail = captureEmail;
        }
    }

    /**
     * 사용자의 수집 출처 설정을 안전한 기본값(문자/메신저/이메일 꺼짐)으로 마이그레이션 및 조회한다.
     */
    public static CaptureSourceSettings getCaptureSourceSettings(Context context) {
        if (context == null) {
            return new CaptureSourceSettings(false, false, false);
        }
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        // 기존 사용자 및 신규 사용자 모두 안전 기본값(false)으로 보장
        if (!prefs.getBoolean(KEY_SETTINGS_INITIALIZED, false)) {
            prefs.edit()
                    .putBoolean(KEY_CAPTURE_MESSAGING, false)
                    .putBoolean(KEY_CAPTURE_MESSENGER, false)
                    .putBoolean(KEY_CAPTURE_EMAIL, false)
                    .putBoolean(KEY_SETTINGS_INITIALIZED, true)
                    .apply();
            return new CaptureSourceSettings(false, false, false);
        }
        boolean messaging = prefs.getBoolean(KEY_CAPTURE_MESSAGING, false);
        boolean messenger = prefs.getBoolean(KEY_CAPTURE_MESSENGER, false);
        boolean email = prefs.getBoolean(KEY_CAPTURE_EMAIL, false);
        return new CaptureSourceSettings(messaging, messenger, email);
    }

    public static void setCaptureSourceSettings(Context context, boolean messaging, boolean messenger, boolean email) {
        if (context == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putBoolean(KEY_CAPTURE_MESSAGING, messaging)
                .putBoolean(KEY_CAPTURE_MESSENGER, messenger)
                .putBoolean(KEY_CAPTURE_EMAIL, email)
                .putBoolean(KEY_SETTINGS_INITIALIZED, true)
                .apply();
    }

    /**
     * Context가 없을 때 사용 가능한 정적 판별 메서드 (하위 호환).
     * 명시된 기본 패키지 목록(카드사, 은행, 간편결제, 스토어, 통신사)만 허용한다.
     * 키워드 기반 패키지명 판별은 개인정보 보호 및 오탐 방지를 위해 전면 제거됨.
     */
    public static boolean isTargetPackage(String packageName) {
        if (packageName == null || packageName.isEmpty()) {
            return false;
        }
        return DEFAULT_PAYMENT_PACKAGES.contains(packageName);
    }

    /**
     * Context의 사용자 설정을 반영한 실시간 패키지 수집 대상 여부 판별.
     * 문자/메신저/이메일 앱은 사용자가 명시적으로 켰을 때만 수집 대상에 포함된다.
     */
    public static boolean isTargetPackage(Context context, String packageName) {
        if (packageName == null || packageName.isEmpty()) {
            return false;
        }
        if (DEFAULT_PAYMENT_PACKAGES.contains(packageName)) {
            return true;
        }
        CaptureSourceSettings settings = getCaptureSourceSettings(context);
        if (settings.captureMessaging && MESSAGING_PACKAGES.contains(packageName)) {
            return true;
        }
        if (settings.captureMessenger && MESSENGER_PACKAGES.contains(packageName)) {
            return true;
        }
        if (settings.captureEmail && EMAIL_PACKAGES.contains(packageName)) {
            return true;
        }
        return false;
    }

    /**
     * 기기에 실제로 설치되어 있는 구독형 앱 목록을 반환한다.
     */
    public static List<SubscriptionAppSpec> getInstalledSubscriptionApps(Context context) {
        List<SubscriptionAppSpec> installed = new ArrayList<>();
        if (context == null) return installed;
        PackageManager pm = context.getPackageManager();
        if (pm == null) return installed;
        Set<String> seenServiceIds = new HashSet<>();
        for (SubscriptionAppSpec spec : SUBSCRIPTION_APP_SPECS) {
            if (seenServiceIds.contains(spec.serviceId)) continue;
            try {
                pm.getPackageInfo(spec.packageName, 0);
                installed.add(spec);
                seenServiceIds.add(spec.serviceId);
            } catch (PackageManager.NameNotFoundException ignored) {
                // 설치되지 않은 앱
            } catch (Exception ignored) {
            }
        }
        return installed;
    }

    public static Set<String> getInstalledServiceIds(Context context) {
        Set<String> ids = new HashSet<>();
        for (SubscriptionAppSpec spec : getInstalledSubscriptionApps(context)) {
            ids.add(spec.serviceId);
        }
        return ids;
    }
}
