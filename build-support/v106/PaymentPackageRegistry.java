package kr.co.re.subscription.payment;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * v1.0.6: follows the team main structure that was physically verified.
 * Exact known packages are preferred, with the same conservative package-name fallback
 * used by main so vendor/app variants do not silently disappear.
 */
public final class PaymentPackageRegistry {
    private PaymentPackageRegistry() {}

    public static final Set<String> KNOWN_PAYMENT_PACKAGES = new HashSet<>(Arrays.asList(
        "com.shcard.smartpay",
        "com.kbcard.cxh.appcode",
        "com.kbcard.cxh.appcard",
        "com.hyundaicard.appcard",
        "kr.co.samsungcard.mpocket",
        "com.wooricard.smartapp",
        "com.lotte.lottesmartpay",
        "com.lcacApp",
        "kr.co.hanamembers.hmscustomer",
        "com.hanaskcard.paycla",
        "com.bccard.mobilecard",
        "kvp.jjy.MispAndroid320",
        "nh.smart.card",
        "nh.smart.nhallonepay",
        "com.samsung.android.spay",
        "viva.republica.toss",
        "com.kakaopay.app",
        "com.kakao.talk",
        "com.nhn.android.search",
        "com.samsung.android.messaging",
        "com.google.android.apps.messaging"
    ));

    public static boolean isTargetPackage(String packageName) {
        if (packageName == null || packageName.isEmpty()) return false;
        if (KNOWN_PAYMENT_PACKAGES.contains(packageName)) return true;
        String lower = packageName.toLowerCase(Locale.ROOT);
        return lower.contains("pay")
            || lower.contains("card")
            || lower.contains("bank")
            || lower.contains("wallet")
            || lower.contains("messaging");
    }
}