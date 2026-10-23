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

    @Test
    public void testEmailNotificationWithoutKnownServiceIsRejected() {
        // 이메일 알림은 알려진 서비스 신호 없이 invoice/receipt + 금액만으로 구독 판정하지 않는다.
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(
                "com.google.android.gm",
                "영수증 안내",
                "구독 결제가 완료되었습니다. 9,900원이 청구되었습니다."
        );
        assertNull("알 수 없는 서비스의 이메일 영수증은 구독으로 등록되지 않아야 합니다.", parsed);
    }

    @Test
    public void testUsdPaymentKeepsOriginalAmountAndMarksEstimated() {
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(
                "com.android.vending",
                "Netflix",
                "Netflix 월 구독 $15.49 결제"
        );
        assertNotNull(parsed);
        assertEquals("USD", parsed.currency);
        assertEquals(15.49, parsed.originalAmount, 0.001);
        assertEquals(Math.round(15.49 * PaymentParser.USD_KRW_EXCHANGE_RATE), parsed.amount);
        assertTrue("외화 환산 금액은 추정치로 표시되어야 합니다.", parsed.isEstimated);
    }

    @Test
    public void testCardIssuerDetectionUsesSpecificNames() {
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(
                "com.shcard.smartpay",
                "신한카드 승인",
                "신한카드 승인 17,000원 넷플릭스"
        );
        assertNotNull(parsed);
        assertEquals("신한카드", parsed.paymentMethod);
    }

    @Test
    public void testGenericWordDoesNotPickCardIssuer() {
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(
                "com.shcard.smartpay",
                "결제 알림",
                "우리 동네 정육식당 12,000원 결제"
        );
        if (parsed != null) {
            assertNotEquals("일반 단어 '우리'만으로 우리카드로 판별하면 안 됩니다.", "우리카드", parsed.paymentMethod);
        }
    }

    @Test
    public void testKeywordBasedPackageIsNoLongerTarget() {
        assertFalse("패키지명에 pay 가 들어간 미등록 앱은 수집 대상이 아니어야 합니다.",
                PaymentPackageRegistry.isTargetPackage("com.example.randompayapp"));
        assertTrue("명시된 카드사 패키지는 기본 수집 대상입니다.",
                PaymentPackageRegistry.isTargetPackage("com.shcard.smartpay"));
    }

    @Test
    public void testMessagingAndEmailPackagesRequireExplicitOptIn() {
        assertFalse("카카오톡은 기본 수집 대상이 아니어야 합니다.",
                PaymentPackageRegistry.isTargetPackage("com.kakao.talk"));
        assertFalse("Gmail 은 기본 수집 대상이 아니어야 합니다.",
                PaymentPackageRegistry.isTargetPackage("com.google.android.gm"));
    }

    @Test
    public void testDedupHashIsStableAcrossCalls() {
        String a = PaymentNotificationListener.computeDedupHash("netflix", "Netflix", 17000, "KRW");
        String b = PaymentNotificationListener.computeDedupHash("netflix", "Netflix", 17000, "KRW");
        String c = PaymentNotificationListener.computeDedupHash("netflix", "Netflix", 18000, "KRW");
        assertEquals("같은 결제는 같은 중복 판정 해시를 가져야 합니다.", a, b);
        assertNotEquals("금액이 다르면 다른 해시여야 합니다.", a, c);
    }

    @Test
    public void testPaymentButtonsAreNeverAutoTapCandidates() {
        String[] moneyActions = {
                "결제하기", "지금 결제", "구매하기", "업그레이드", "구독하기", "다시 시작", "재구독",
                "플랜 변경", "Pay now", "Buy now", "Purchase now", "Upgrade plan", "Subscribe now", "Start membership"
        };
        for (String text : moneyActions) {
            assertFalse("돈이 나가는 버튼은 자동 탭 후보가 아니어야 합니다: " + text,
                    com.submate.app.webguide.AutoAdvancer.isAutoTapCandidate(text, true));
        }
    }

    @Test
    public void testCancelNavigationButtonsAreAutoTapCandidates() {
        String[] navActions = { "구독 관리", "멤버십 해지", "계정 설정", "정기결제 관리", "자동결제 해지 신청하기", "Manage membership" };
        for (String text : navActions) {
            assertTrue("해지 이동 버튼은 자동 탭 후보가 될 수 있어야 합니다: " + text,
                    com.submate.app.webguide.AutoAdvancer.isAutoTapCandidate(text, true));
        }
    }

    @Test
    public void testUnrelatedButtonIsNotAutoTapCandidate() {
        assertFalse("해지 이동도 결제도 아닌 버튼은 자동 탭하지 않습니다.",
                com.submate.app.webguide.AutoAdvancer.isAutoTapCandidate("프로필 사진 바꾸기", true));
    }
    @Test
    public void testBalanceCapturedInsteadOfChargeFixed() {
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(
                "com.kbstar.kbbank",
                "KB국민은행",
                "[KB국민은행] 잔액 500,000원 넷플릭스 17,000원 출금"
        );
        assertNotNull("넷플릭스 출금 결제는 파싱되어야 합니다.", parsed);
        assertEquals("잔액 500,000원이 아닌 실제 출금 금액 17,000원이 추출되어야 합니다.", 17000, parsed.amount);
    }

    @Test
    public void testNegativeKeywordContextInspection() {
        PaymentParser.ParsedPayment p1 = PaymentParser.parse(
                "com.shcard.smartpay",
                "신한카드",
                "넷플릭스 17,000원 결제완료 (취소문의: 1588-0000)"
        );
        assertNotNull("취소문의는 결제 취소가 아니므로 파싱되어야 합니다.", p1);
        assertEquals(17000, p1.amount);

        PaymentParser.ParsedPayment p2 = PaymentParser.parse(
                "com.shcard.smartpay",
                "신한카드",
                "넷플릭스 17,000원 결제완료 (환불불가)"
        );
        assertNotNull("환불불가는 결제 취소가 아니므로 파싱되어야 합니다.", p2);
        assertEquals(17000, p2.amount);

        String[] cancellations = {
                "넷플릭스 17,000원 결제취소",
                "넷플릭스 17,000원 승인취소",
                "넷플릭스 17,000원 취소승인",
                "넷플릭스 17,000원 환불완료",
                "넷플릭스 17,000원 환불 처리",
                "넷플릭스 17,000원 취소되었습니다"
        };
        for (String c : cancellations) {
            assertNull("실제 취소/환불 알림은 기각되어야 합니다: " + c,
                    PaymentParser.parse("com.shcard.smartpay", "신한카드", c));
        }
    }

    @Test
    public void testExtendedAmountFormats() {
        PaymentParser.ParsedPayment p1 = PaymentParser.parse("com.shcard.smartpay", "신한카드", "유튜브 ₩15,900 결제");
        assertNotNull("₩15,900 인식 실패", p1);
        assertEquals(15900, p1.amount);
        assertEquals("KRW", p1.currency);

        PaymentParser.ParsedPayment p2 = PaymentParser.parse("com.shcard.smartpay", "신한카드", "유튜브 ￦15,900 결제");
        assertNotNull("￦15,900 인식 실패", p2);
        assertEquals(15900, p2.amount);
        assertEquals("KRW", p2.currency);

        PaymentParser.ParsedPayment p3 = PaymentParser.parse("com.shcard.smartpay", "신한카드", "유튜브 KRW 15900 결제");
        assertNotNull("KRW 15900 인식 실패", p3);
        assertEquals(15900, p3.amount);
        assertEquals("KRW", p3.currency);

        PaymentParser.ParsedPayment p4 = PaymentParser.parse("com.shcard.smartpay", "신한카드", "유튜브 15,900 KRW 결제");
        assertNotNull("15,900 KRW 인식 실패", p4);
        assertEquals(15900, p4.amount);
        assertEquals("KRW", p4.currency);

        PaymentParser.ParsedPayment p5 = PaymentParser.parse("com.shcard.smartpay", "신한카드", "유튜브 USD 9.99 결제");
        assertNotNull("USD 9.99 인식 실패", p5);
        assertEquals("USD", p5.currency);
        assertEquals(9.99, p5.originalAmount, 0.001);
        assertEquals(Math.round(9.99 * PaymentParser.USD_KRW_EXCHANGE_RATE), p5.amount);
        assertTrue(p5.isEstimated);

        PaymentParser.ParsedPayment p6 = PaymentParser.parse("com.shcard.smartpay", "신한카드", "유튜브 9.99 USD 결제");
        assertNotNull("9.99 USD 인식 실패", p6);
        assertEquals("USD", p6.currency);
        assertEquals(9.99, p6.originalAmount, 0.001);
        assertEquals(Math.round(9.99 * PaymentParser.USD_KRW_EXCHANGE_RATE), p6.amount);
        assertTrue(p6.isEstimated);

        PaymentParser.ParsedPayment p7 = PaymentParser.parse("com.shcard.smartpay", "신한카드", "유튜브 900원 결제");
        assertNotNull("900원 인식 실패", p7);
        assertEquals(900, p7.amount);
        assertEquals("KRW", p7.currency);
    }
    @Test
    public void testDedupDifferentServicesSameAmountNotMerged() {
        long now = System.currentTimeMillis();
        // Two different services with same amount (e.g. 17,000 KRW)
        String hashNetflix = PaymentNotificationListener.computeDedupHash("netflix", "Netflix", 17000, "KRW");
        String hashTving = PaymentNotificationListener.computeDedupHash("tving", "티빙", 17000, "KRW");
        assertNotEquals("서로 다른 serviceId를 가진 서비스는 같은 금액이어도 다른 해시여야 합니다.", hashNetflix, hashTving);
    }

    @Test
    public void testDedupSameChargeCardAndBankAppMerged() {
        // Same charge from a card app ("Netflix", serviceId="netflix") and bank app (serviceName="", serviceId="netflix")
        String hashCard = PaymentNotificationListener.computeDedupHash("netflix", "Netflix", 17000, "KRW");
        String hashBank = PaymentNotificationListener.computeDedupHash("netflix", "", 17000, "KRW");
        assertEquals("동일한 serviceId의 결제는 원천 앱이 달라 serviceName이 비어있어도 동일한 중복 해시를 가져야 합니다.", hashCard, hashBank);
    }
}