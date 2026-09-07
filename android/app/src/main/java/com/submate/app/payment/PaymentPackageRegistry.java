package com.submate.app.payment;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * 결제 알림 감지 대상 패키지(카드사, 간편결제, SMS 앱 등) 목록 및 판별 유틸리티
 */
public class PaymentPackageRegistry {

    public static final Set<String> KNOWN_PAYMENT_PACKAGES = new HashSet<>(Arrays.asList(
            // 카드사 공식 앱
            "com.shcard.smartpay",             // 신한 SOL페이
            "com.kbcard.cxh.appcode",          // KB Pay
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

            // 시스템 SMS (결제 승인 문자)
            "com.samsung.android.messaging",   // 삼성 기본 메시지
            "com.google.android.apps.messaging"// 구글 메시지
    ));

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
               lower.contains("messaging");
    }
}
