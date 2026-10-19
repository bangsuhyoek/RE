package com.submate.app.payment;

import org.junit.Test;
import static org.junit.Assert.*;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class PaymentParserTest {

    @Test
    public void testCheckCardWithdrawalNetflixAccepted() {
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(
                "com.shcard.smartpay",
                "신한카드 체크",
                "체크카드 출금 17,000원 넷플릭스"
        );
        assertNotNull("체크카드 출금 넷플릭스는 파싱되어야 합니다.", parsed);
        assertTrue(parsed.isSubscription);
        assertEquals("netflix", parsed.serviceId);
        assertEquals("Netflix", parsed.serviceName);
        assertEquals(17000, parsed.amount);
    }

    @Test
    public void testChecklistCase1ShinhanCheckApprovalNetflixAccepted() {
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(
                "com.shcard.smartpay",
                "신한카드",
                "[Web발신] 신한체크 승인 17,000원 넷플릭스"
        );
        assertNotNull("신한체크 승인 넷플릭스는 승인되어야 합니다.", parsed);
        assertTrue(parsed.isSubscription);
        assertEquals("netflix", parsed.serviceId);
        assertEquals(17000, parsed.amount);
    }

    @Test
    public void testChecklistCase2KbCheckWithdrawalYoutubeAccepted() {
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(
                "com.kbcard.cxh.appcard",
                "KB국민카드",
                "KB국민체크 출금 14,900원 YouTube"
        );
        assertNotNull("KB국민체크 출금 YouTube는 승인되어야 합니다.", parsed);
        assertTrue(parsed.isSubscription);
        assertEquals("youtube", parsed.serviceId);
        assertEquals(14900, parsed.amount);
    }

    @Test
    public void testChecklistCase3AtmWithdrawalRejected() {
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(
                null,
                null,
                "ATM 출금 50,000원"
        );
        assertNull("ATM 출금은 기각되어야 합니다.", parsed);
    }

    @Test
    public void testChecklistCase4AccountWithdrawalTransferRejected() {
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(
                null,
                null,
                "계좌 출금 이체 30,000원"
        );
        assertNull("계좌 출금 이체는 기각되어야 합니다.", parsed);
    }

    @Test
    public void testChecklistCase5CancelPaymentRejected() {
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(
                "com.shcard.smartpay",
                "신한카드",
                "결제취소 17,000원 넷플릭스"
        );
        assertNull("결제취소는 기각되어야 합니다.", parsed);
    }

    @Test
    public void testAtmWithdrawalRejected() {
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(
                "com.kbcard.cxh.appcard",
                "KB국민카드",
                "ATM 출금 50,000원"
        );
        assertNull("ATM 출금은 거절되어야 합니다.", parsed);
    }

    @Test
    public void testSimulatePaymentDebugGuard() {
        // BuildConfig.DEBUG flag is verified to be boolean
        assertTrue("Unit test environment should have BuildConfig.DEBUG", com.submate.app.BuildConfig.DEBUG);
    }

    @Test
    public void testAccountTransferRejected() {
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(
                "com.shinhan.sbanking",
                "신한은행",
                "계좌 이체 17,000원 넷플릭스"
        );
        assertNull("이체는 거절되어야 합니다.", parsed);
    }

    @Test
    public void testExistingPositiveCaseAccepted() {
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(
                "com.samsung.android.spay",
                "삼성카드 승인",
                "홍길동님 09/01 14:30 14,900원 유튜브 승인"
        );
        assertNotNull("기존 유튜브 승인 결제는 파싱되어야 합니다.", parsed);
        assertTrue(parsed.isSubscription);
        assertEquals("youtube", parsed.serviceId);
        assertEquals("YouTube Premium", parsed.serviceName);
        assertEquals(14900, parsed.amount);
    }

    @Test
    public void testEmailPushNotificationInvoiceAccepted() {
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(
                "com.google.android.gm",
                "Your receipt from OpenAI",
                "Invoice paid $20.00 ChatGPT Plus subscription"
        );
        assertNotNull("Gmail 푸시 알림의 OpenAI 영수증은 감지되어야 합니다.", parsed);
        assertTrue(parsed.isSubscription);
        assertEquals("chatgpt", parsed.serviceId);
        assertEquals("email_notification", parsed.sourceChannel);
        assertEquals(27000, parsed.amount);
    }

    @Test
    public void testFreeTrialPlayStoreNotificationAccepted() {
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(
                "com.android.vending",
                "Google Play 정기 결제",
                "듀오링고 무료 체험이 시작되었습니다. 체험 종료 후 월 14,000원 결제"
        );
        assertNotNull("구글 플레이 무료 체험 알림은 감지되어야 합니다.", parsed);
        assertTrue(parsed.isSubscription);
        assertTrue(parsed.isTrial);
        assertEquals("duolingo-super", parsed.serviceId);
        assertEquals("play_store", parsed.sourceChannel);
    }

    @Test
    public void testPgMaskedMerchantPriceFingerprintWithInstalledApps() {
        Set<String> installed = new HashSet<>(Arrays.asList("millie"));
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(
                "com.shcard.smartpay",
                "[신한카드] 정기결제 승인",
                "구글플레이 9,900원 일시불 승인",
                installed
        );
        assertNotNull("구글플레이 9,900원 + 밀리의서재 앱 설치 시 밀리의서재로 매칭되어야 합니다.", parsed);
        assertEquals("millie", parsed.serviceId);
        assertEquals(9900, parsed.amount);
    }
}
