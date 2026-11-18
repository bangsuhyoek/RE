package com.submate.app.payment;

import static org.junit.Assert.*;

import org.junit.Test;

/**
 * 결제 알림 금액 인식과 구독 판정 표 테스트.
 * "오탐" 표의 항목은 수정 전 파서가 구독으로 판정하던 실제 형태의 알림이다.
 */
public class PaymentAmountRecognitionTest {

    /** 구독으로 판정하면 안 되는 알림: { 설명, 패키지, 제목, 본문 } */
    private static final String[][] NOT_SUBSCRIPTION = {
            {"네이버페이 300원 결제 영수증 (네이버 별칭 + '결제 영수증'으로 네이버플러스 멤버십 오인)",
                    "com.nhn.android.search", "네이버페이", "결제 영수증 · GS25 역삼점 300원 결제 완료"},
            {"이름이 겹치는 가게의 300원 결제 ('지니' 별칭)",
                    "com.hyundaicard.appcard", "현대카드", "[현대카드] 홍*동 300원 승인 지니24 11/02 08:10"},
            {"이름이 겹치는 꽃집 2,500원 결제 ('플로' 별칭, FLO 최저가의 절반 미만)",
                    "com.samsungcard.app", "삼성카드 승인", "삼성카드 승인 홍*동 2,500원 일시불 플로리스트 11/03"},
            {"구글 결제수단 확인용 1,100원 승인",
                    "com.shcard.smartpay", "[신한카드] 승인", "신한카드(1234)승인 홍*동 1,100원 GOOGLE *YouTube 결제수단 확인"},
            {"애플 카드 등록 인증 결제",
                    "com.kbcard.cxh.appcard", "KB국민카드", "KB국민카드 1234 승인 홍*동 1,000원 APPLE.COM/BILL 카드 등록 인증"},
            {"단독 '취소' 표기 카드 취소 알림",
                    "com.kbcard.cxh.appcard", "KB국민카드", "[KB국민카드]1234 취소 홍*동 17,000원 11/03 넷플릭스"},
            {"영문 환불 알림",
                    "com.android.vending", "Google Play", "Refunded: YouTube Premium 14,900원"},
            {"쿠팡 일반 주문 영수증 (쇼핑 결제를 쿠팡 와우로 오인)",
                    "com.coupang.mobile", "쿠팡", "쿠팡 주문 영수증 32,500원 결제 완료"},
            {"토스페이 일반 가게 결제 영수증 (이름 모를 '신규 구독 서비스'로 오인)",
                    "viva.republica.toss", "토스페이", "[토스페이] 결제 영수증 동네빵집 4,500원 결제 완료"},
            {"웹툰 쿠키 300원 결제 ('구독' 단어만으로 구독 오인)",
                    "com.kakaopay.app", "카카오페이", "[카카오페이] 결제 완료 300원 · 웹툰 구독 쿠키"},
            {"해외 소액 승인 USD 0.50",
                    "com.shcard.smartpay", "신한카드", "[신한카드] 해외승인 홍*동 USD 0.50 APPLE.COM/BILL"},
            {"네이버페이 쇼핑 결제의 '멤버십 적립' 부가 문구",
                    "com.nhn.android.search", "네이버페이", "네이버페이 15,800원 결제 완료 · 네이버플러스 멤버십 적립 4%"},
            {"네이버페이 35,000원 쇼핑 결제 (연간 요금 46,800원 ±30% 안이지만 연간 표시·청구 문구 없음)",
                    "com.nhn.android.search", "네이버페이", "네이버페이 35,000원 결제 완료 · 네이버플러스 멤버십 적립 4%"},
            // 아래는 실제 메일함 교차검증에서 찾은 형태를 개인정보 없이 다시 쓴 것이다.
            {"쿠팡 일반 주문 – 상품 가격(9,900원)이 와우 요금 근처",
                    "com.google.android.gm", "[쿠팡] 주문하신 내역을 확인해주세요", "구매 상세내역 전기모기채 9,900원 | 3 | 29,700원 | 쿠팡(주)"},
            {"쿠팡 일반 주문 – 결제금액 5,630원",
                    "com.google.android.gm", "[쿠팡] 주문하신 내역을 확인해주세요", "구매 상세내역 USB-C 케이블 결제금액 5,630원 쿠페이"},
            {"게임 결제를 결제수단 '네이버페이' 때문에 네이버플러스 멤버십으로 오인",
                    "com.google.android.gm", "[STOVE] 게임 결제 내역을 알려드립니다.", "게임 결제 완료 안내 최종 결제 금액 ₩6,000 결제유형 네이버페이"},
            {"OpenAI 크레딧 노트(환불)",
                    "com.google.android.gm", "Credit note from OpenAI for invoice", "Credit note from OpenAI $22.00 Issued January 2026 ChatGPT Plus Subscription"},
    };

    @Test
    public void nonSubscriptionNotificationsAreRejected() {
        for (String[] row : NOT_SUBSCRIPTION) {
            PaymentParser.ParsedPayment parsed = PaymentParser.parse(row[1], row[2], row[3]);
            assertNull("구독으로 판정하면 안 됩니다: " + row[0]
                    + (parsed != null ? " -> " + parsed.serviceName + " " + parsed.amount + "원" : ""), parsed);
        }
    }

    /** 구독으로 판정해야 하는 알림: { 설명, 패키지, 제목, 본문, serviceId, 원화 금액, 통화 } */
    private static final Object[][] SUBSCRIPTION = {
            {"신한 승인 + 누적 금액", "com.shcard.smartpay", "신한카드",
                    "[Web발신] 신한카드(1234)승인 홍*동 17,000원(일시불)11/02 14:21 넷플릭스 누적523,400원", "netflix", 17000, "KRW"},
            {"누적사용 금액이 결제 동사에 더 가까운 경우", "com.shcard.smartpay", "신한카드",
                    "신한카드 승인 홍*동 누적사용 523,400원 넷플릭스 17,000원", "netflix", 17000, "KRW"},
            {"KB 승인 GOOGLE*YOUTUBE", "com.kbcard.cxh.appcard", "KB국민카드",
                    "[KB국민카드]1234승인 홍*동 14,900원 일시불 11/03 10:00 GOOGLE*YOUTUBE", "youtube", 14900, "KRW"},
            {"현대 해외승인 USD", "com.hyundaicard.appcard", "현대카드",
                    "현대카드 홍*동 해외승인 USD 11.99 SPOTIFY 11/05", "spotify",
                    (int) Math.round(11.99 * PaymentParser.USD_KRW_EXCHANGE_RATE), "USD"},
            {"삼성 승인 스포티파이", "com.samsungcard.app", "삼성카드 승인",
                    "삼성카드 승인 홍*동 10,900원 스포티파이 일시불", "spotify", 10900, "KRW"},
            {"카카오페이 결제 + 포인트 적립 300원", "com.kakaopay.app", "카카오페이",
                    "[카카오페이] 넷플릭스 13,500원 결제 완료 · 포인트 300원 적립", "netflix", 13500, "KRW"},
            {"포인트 사용 300원이 결제 동사에 붙은 경우", "com.hyundaicard.appcard", "현대카드",
                    "[현대카드] 홍*동님 M포인트 300원 사용 넷플릭스 17,000원", "netflix", 17000, "KRW"},
            {"쿠팡 와우 정기결제", "com.coupang.mobile", "쿠팡",
                    "쿠팡 와우 멤버십 7,890원 정기결제 승인", "coupang", 7890, "KRW"},
            {"네이버플러스 멤버십 정기결제", "com.nhn.android.search", "네이버페이",
                    "[네이버페이] 네이버플러스 멤버십 4,900원 정기결제 완료", "naver", 4900, "KRW"},
            {"토스페이 유튜브 프리미엄", "viva.republica.toss", "토스페이",
                    "[토스페이] YouTube Premium 14,900원 결제", "youtube", 14900, "KRW"},
            {"쿠팡 와우 요금 인상분(월회비 청구 문구 있음)", "com.coupang.mobile", "쿠팡",
                    "[쿠팡] 와우 멤버십 월회비가 결제되었습니다 결제금액 9,900원", "coupang", 9900, "KRW"},
            {"쿠팡 와우 월회비 메일", "com.google.android.gm", "[쿠팡] 와우 멤버십 월회비가 결제되었습니다.",
                    "로켓와우클럽 월회비 결제내역 월회비 결제 정보 결제금액 7,890원", "coupang", 7890, "KRW"},
            {"앱스토어 인앱 구독 iCloud+ 1,100원 (앱스토어는 요금표로 거르지 않음)", "com.shcard.smartpay", "신한카드",
                    "[신한카드] 승인 홍*동 1,100원 APPLE.COM/BILL 정기결제", "apple", 1100, "KRW"},
            {"앱스토어 연간 인앱 구독 65,000원", "com.shcard.smartpay", "신한카드",
                    "[신한카드] 승인 홍*동 65,000원 APPLE.COM/BILL", "apple", 65000, "KRW"},
            {"유튜브 프리미엄 연간 USD 139.99 (월 요금 12배 초과, 연간 표시 있음)", "com.android.vending", "Google Play",
                    "YouTube Premium 연간 멤버십 USD 139.99 결제", "youtube",
                    (int) Math.round(139.99 * PaymentParser.USD_KRW_EXCHANGE_RATE), "USD"},
            {"괄호 안 '누적 승인금액'이 승인 동사에 더 가까운 경우", "com.shcard.smartpay", "신한카드",
                    "[신한카드] 넷플릭스 17,000원 일시불 승인 (누적 승인금액 523,400원)", "netflix", 17000, "KRW"},
            {"네이버플러스 멤버십 연간 결제", "com.nhn.android.search", "네이버페이",
                    "[네이버페이] 네이버플러스 멤버십 연간 46,800원 결제 완료", "naver", 46800, "KRW"},
    };

    @Test
    public void realSubscriptionChargesAreRecognized() {
        for (Object[] row : SUBSCRIPTION) {
            PaymentParser.ParsedPayment parsed = PaymentParser.parse((String) row[1], (String) row[2], (String) row[3]);
            assertNotNull("구독 결제로 인식해야 합니다: " + row[0], parsed);
            assertTrue(row[0].toString(), parsed.isSubscription);
            assertEquals("서비스: " + row[0], row[4], parsed.serviceId);
            assertEquals("금액: " + row[0], ((Integer) row[5]).intValue(), parsed.amount);
            assertEquals("통화: " + row[0], row[6], parsed.currency);
        }
    }

    @Test
    public void smallTrialChargeUsesRegularPriceInsteadOfTheSmallAmount() {
        PaymentParser.ParsedPayment parsed = PaymentParser.parse(
                "com.android.vending", "Google Play", "지니뮤직 무료 체험 시작 · 100원 결제");
        assertNotNull("무료체험 시작 알림은 체험 구독으로 인식해야 합니다.", parsed);
        assertTrue(parsed.isTrial);
        assertEquals("genie", parsed.serviceId);
        assertTrue("100원 같은 체험 결제 금액을 구독 금액으로 쓰면 안 됩니다.",
                parsed.amount >= PaymentParser.MIN_SUBSCRIPTION_AMOUNT_KRW);
    }
}
