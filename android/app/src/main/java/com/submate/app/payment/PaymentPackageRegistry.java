package com.submate.app.payment;

import android.content.Context;
import android.content.pm.PackageManager;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 결제 알림 감지 대상 패키지(카드사, 간편결제, SMS, 이메일 푸시, 스토어, 통신사 앱 등) 및
 * 기기 내 설치된 구독형 앱 스캔 레지스트리
 */
public class PaymentPackageRegistry {

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

    public static final Set<String> KNOWN_PAYMENT_PACKAGES = new HashSet<>(Arrays.asList(
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

            // 간편결제 및 핀테크
            "com.samsung.android.spay",        // 삼성월렛/페이
            "viva.republica.toss",             // 토스
            "com.kakaopay.app",                // 카카오페이
            "com.kakao.talk",                  // 카카오톡 (알림톡 결제안내)
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
            "com.lguplus.mobile.cs",           // 당신의 U+

            // 이메일 앱 푸시 알림 (API 연동 비용 없이 영수증/인보이스 알림 제목·본문 감지)
            "com.google.android.gm",           // Gmail
            "com.nhn.android.mail",            // 네이버 메일
            "com.samsung.android.email.provider", // 삼성 이메일
            "com.microsoft.office.outlook",    // Microsoft Outlook
            "net.daum.android.mail",           // 다음 메일

            // 시스템 SMS (결제 승인 문자)
            "com.samsung.android.messaging",   // 삼성 기본 메시지
            "com.google.android.apps.messaging"// 구글 메시지
    ));

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

    public static boolean isTargetPackage(String packageName) {
        if (packageName == null || packageName.isEmpty()) {
            return false;
        }
        if (KNOWN_PAYMENT_PACKAGES.contains(packageName)) {
            return true;
        }
        String lower = packageName.toLowerCase();
        return lower.contains("pay") ||
               lower.contains("card") ||
               lower.contains("bank") ||
               lower.contains("wallet") ||
               lower.contains("messaging") ||
               lower.contains("mail") ||
               lower.contains("vending");
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
