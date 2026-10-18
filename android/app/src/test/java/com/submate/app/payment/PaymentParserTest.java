package com.submate.app.payment;

import org.junit.Test;
import static org.junit.Assert.*;

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
}
