package com.submate.app.payment;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class PaymentParser {

    public static class KnownService {
        public final String id;
        public final String name;
        public final String category;
        public final List<String> aliases;
        public final Set<Integer> allowedAmounts;
        public final Set<Integer> annualAmounts = new HashSet<>(); // allowedAmounts 중 연간 결제 요금
        public final boolean strictAmountCheck; // 복합 플랫폼(쿠팡 등)인 경우 금액 필수 일치 여부

        public KnownService(String id, String name, String category, boolean strictAmountCheck, Integer[] amounts, String... aliases) {
            this.id = id;
            this.name = name;
            this.category = category;
            this.strictAmountCheck = strictAmountCheck;
            this.allowedAmounts = amounts != null ? new HashSet<>(Arrays.asList(amounts)) : new HashSet<>();
            this.aliases = new ArrayList<>();
            this.aliases.add(name.toLowerCase());
            for (String a : aliases) {
                this.aliases.add(a.toLowerCase());
            }
        }

        KnownService annual(Integer... amounts) {
            annualAmounts.addAll(Arrays.asList(amounts));
            allowedAmounts.addAll(Arrays.asList(amounts));
            return this;
        }
    }

    public static final List<KnownService> KNOWN_SERVICES = new ArrayList<>();

    static {
        // OTT
        KNOWN_SERVICES.add(new KnownService("netflix", "Netflix", "OTT", false, new Integer[]{5500, 13500, 17000}, "넷플릭스", "netflix.com"));
        KNOWN_SERVICES.add(new KnownService("youtube", "YouTube Premium", "OTT", false, new Integer[]{8690, 10450, 14900}, "유튜브", "youtube", "google youtube", "구글유튜브"));
        KNOWN_SERVICES.add(new KnownService("tving", "티빙", "OTT", false, new Integer[]{5500, 9500, 13500, 17000}, "tving", "cj enm"));
        KNOWN_SERVICES.add(new KnownService("disney", "Disney+", "OTT", false, new Integer[]{9900, 13900}, "디즈니+", "디즈니플러스", "disneyplus", "disney").annual(99000, 139000));
        KNOWN_SERVICES.add(new KnownService("watcha", "왓챠", "OTT", false, new Integer[]{7900, 12900}, "watcha"));
        KNOWN_SERVICES.add(new KnownService("wavve", "웨이브", "OTT", false, new Integer[]{7900, 10900, 13900}, "wavve"));
        KNOWN_SERVICES.add(new KnownService("laftel", "라프텔", "OTT", false, new Integer[]{9900, 14900}, "laftel"));
        KNOWN_SERVICES.add(new KnownService("appletv", "Apple TV+", "OTT", false, new Integer[]{6500}, "애플tv", "apple tv"));

        // 쇼핑 & 커머스 (쿠팡 등 복합 플랫폼은 일반 주문 오탐 방지를 위해 strictAmountCheck = true)
        KNOWN_SERVICES.add(new KnownService("coupang", "쿠팡 와우", "쇼핑", true, new Integer[]{4990, 7890}, "쿠팡", "coupang", "쿠팡와우", "와우멤버십"));
        KNOWN_SERVICES.add(new KnownService("naver", "네이버플러스 멤버십", "쇼핑", true, new Integer[]{4900}, "네이버플러스", "네이버멤버십", "네이버", "네이버파이낸셜").annual(46800));
        KNOWN_SERVICES.add(new KnownService("baemin-club", "배민클럽", "쇼핑", true, new Integer[]{1990, 3990}, "배민클럽", "배달의민족", "우아한형제들"));
        KNOWN_SERVICES.add(new KnownService("yogipass", "요기패스X", "쇼핑", true, new Integer[]{2900, 4900}, "요기패스", "요기패스x", "위대한상상"));
        KNOWN_SERVICES.add(new KnownService("kurly-members", "컬리멤버스", "쇼핑", true, new Integer[]{1900}, "컬리멤버스", "마켓컬리"));
        KNOWN_SERVICES.add(new KnownService("shinsegae-universe", "신세계 유니버스 클럽", "쇼핑", true, new Integer[]{30000}, "유니버스클럽", "신세계유니버스"));

        // 음악
        KNOWN_SERVICES.add(new KnownService("spotify", "Spotify", "음악", false, new Integer[]{8690, 10900, 11990, 17900}, "스포티파이"));
        KNOWN_SERVICES.add(new KnownService("melon", "멜론", "음악", false, new Integer[]{7900, 10900, 11900}, "melon"));
        KNOWN_SERVICES.add(new KnownService("genie", "지니뮤직", "음악", false, new Integer[]{7400, 8400, 10900}, "지니", "genie music"));
        KNOWN_SERVICES.add(new KnownService("flo", "FLO", "음악", false, new Integer[]{7900, 8000, 10900}, "플로", "드림어스"));
        KNOWN_SERVICES.add(new KnownService("ytmusic", "YouTube Music", "음악", false, new Integer[]{8690, 11990}, "유튜브뮤직", "youtube music"));
        KNOWN_SERVICES.add(new KnownService("applemusic", "Apple Music", "음악", false, new Integer[]{8900, 13500}, "애플뮤직", "apple music"));

        // AI & 생산성
        KNOWN_SERVICES.add(new KnownService("chatgpt", "ChatGPT Plus", "AI/생산성", false, new Integer[]{27000, 29000}, "챗gpt", "chatgpt", "openai", "챗지피티"));
        KNOWN_SERVICES.add(new KnownService("notion", "Notion", "AI/생산성", false, new Integer[]{11000, 13500, 20000}, "노션"));
        KNOWN_SERVICES.add(new KnownService("adobe", "Adobe", "AI/생산성", false, new Integer[]{13200, 26400, 35200, 61600}, "어도비"));
        KNOWN_SERVICES.add(new KnownService("claude", "Claude Pro", "AI/생산성", false, new Integer[]{27000, 29000}, "클로드", "anthropic"));
        KNOWN_SERVICES.add(new KnownService("perplexity-pro", "Perplexity Pro", "AI/생산성", false, new Integer[]{27000, 29000}, "퍼플렉시티", "perplexity"));
        KNOWN_SERVICES.add(new KnownService("cursor-pro", "Cursor Pro", "AI/생산성", false, new Integer[]{27000, 29000}, "cursor", "anysphere"));
        KNOWN_SERVICES.add(new KnownService("midjourney", "Midjourney", "AI/생산성", false, new Integer[]{13500, 14000, 40500}, "미드저니", "midjourney"));
        KNOWN_SERVICES.add(new KnownService("figma", "Figma Professional", "AI/생산성", false, new Integer[]{16200, 20250, 21000}, "피그마", "figma"));
        KNOWN_SERVICES.add(new KnownService("canva", "Canva Pro", "AI/생산성", false, new Integer[]{14000, 14900}, "캔바", "canva"));
        KNOWN_SERVICES.add(new KnownService("ms365", "Microsoft 365", "AI/생산성", false, new Integer[]{8900, 11900}, "마이크로소프트365", "microsoft 365", "office 365").annual(89000));
        KNOWN_SERVICES.add(new KnownService("github-copilot", "GitHub Copilot", "AI/생산성", false, new Integer[]{13500, 14000}, "깃허브", "github", "copilot"));

        // 도서 & 교육 & 통신사 구독
        KNOWN_SERVICES.add(new KnownService("millie", "밀리의서재", "도서", false, new Integer[]{9900}, "밀리", "밀리의 서재").annual(99000));
        KNOWN_SERVICES.add(new KnownService("ridiselect", "리디셀렉트", "도서", false, new Integer[]{4900}, "리디", "리디북스", "ridi"));
        KNOWN_SERVICES.add(new KnownService("welaaa", "윌라 오디오북", "도서", false, new Integer[]{9900, 12500}, "윌라", "welaaa"));
        KNOWN_SERVICES.add(new KnownService("duolingo-super", "Duolingo Super", "교육", false, new Integer[]{12900, 14000}, "듀오링고", "duolingo").annual(89000));
        KNOWN_SERVICES.add(new KnownService("skt-universe", "T 우주패스", "기타", false, new Integer[]{4900, 9900}, "우주패스", "t우주"));
        KNOWN_SERVICES.add(new KnownService("lgu-yudok", "U+ 유독", "기타", false, new Integer[]{4900, 9900, 13900}, "유독"));
        // APPLE.COM/BILL은 앱스토어 인앱 구독을 모두 대신 청구하므로 요금표로 거르지 않는다(AGGREGATOR_SERVICE_IDS).
        KNOWN_SERVICES.add(new KnownService("apple", "Apple One", "기타", false, new Integer[]{14900, 20900, 3300, 4400, 8900}, "apple.com/bill", "애플"));
    }

    public static final int USD_KRW_EXCHANGE_RATE = 1350;

    /**
     * 구독 결제로 볼 최소 금액(원). 이보다 작은 결제는 구독으로 판정하지 않는다.
     * - 카드 등록·본인 확인용 인증 결제와 소액 결제(100~900원대)가 구독 감지 알림으로 뜨는 문제를 막는다.
     * - 앱의 다른 금액 파서(영수증·공유 문자·명세서, api/_lib/receiptParser.js MIN_SUBSCRIPTION_AMOUNT_KRW)와 같은 기준이다.
     * - 등록된 요금 중 가장 낮은 값(컬리멤버스 1,900원)보다 낮다.
     * 무료체험 알림은 예외로, 소액 금액 대신 서비스 정가(또는 0원)로 처리한다.
     */
    public static final int MIN_SUBSCRIPTION_AMOUNT_KRW = 1000;

    /** 서비스 이름이 맞아도 등록 요금 중 최저가의 이 비율보다 싸면 그 서비스 결제로 보지 않는다(할인·광고형 요금 여유 포함). */
    public static final double MIN_PRICE_RATIO = 0.5;

    /** 서비스 이름이 맞아도 등록 요금 중 최고가의 이 배수보다 비싸면 그 서비스 결제로 보지 않는다(월 요금 1년치 연간 결제까지 허용). */
    public static final double MAX_PRICE_MULTIPLIER = 12.0;

    /** 알림에 연간 결제 표시(연간·1년·annual 등)가 있으면 최고가의 이 배수까지 허용한다(연간 요금 + 환율·요금 인상 여유 50%). */
    public static final double ANNUAL_PRICE_MULTIPLIER = 18.0;

    /**
     * 앱스토어처럼 여러 앱의 인앱 구독을 대신 청구하는 곳. 요금표로 거르지 않고
     * 최소 금액과 이 상한(연간 인앱 구독까지 포함하는 넉넉한 값)만 본다.
     */
    public static final Set<String> AGGREGATOR_SERVICE_IDS = new HashSet<>(Collections.singletonList("apple"));
    public static final int AGGREGATOR_MAX_AMOUNT_KRW = 300_000;

    private static class AmountCandidate {
        int amount;
        String currency;
        double originalAmount;
        boolean isEstimated;
        int start;
        int end;
        int distanceToVerb;
    }


    public static class ParsedPayment {
        public String serviceId = "";
        public String serviceName = "";
        public String category = "기타";
        public String plan = "";
        public int amount = 0;              // 원화 금액 (외화인 경우 고정 환율 환산값)
        public String currency = "KRW";      // 원통화 (KRW, USD 등)
        public double originalAmount = 0.0;  // 원금액
        public boolean isEstimated = false; // 외화 환산 추정 여부 플래그
        public String paymentMethod = "카드";
        public boolean isSubscription = false;
        public boolean isTrial = false;
        public String sourceChannel = "notification";
        public String rawText = "";
    }

    private static final Pattern AMOUNT_PATTERN = Pattern.compile(
            "(?:[₩￦]|(?i:KRW)\s*)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\s*(?:원|(?i:KRW))" +
            "|(?i:KRW)\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)" +
            "|[$]\s*([0-9]+(?:[.][0-9]{2})?)" +
            "|([0-9]+(?:[.][0-9]{2})?)\s*(?i:USD)" +
            "|(?i:USD)\s*([0-9]+(?:[.][0-9]{2})?)" +
            "|[₩￦]\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)"
    );
    // 구독이라는 직접 신호. '결제 영수증', '주문 영수증', 'receipt', '와우' 같은 말은 일반 쇼핑 결제에도 붙으므로 여기 넣지 않는다.
    private static final Pattern RECURRING_KEYWORD = Pattern.compile("(정기|자동\\s*결제|자동\\s*갱신|매월|구독|멤버십|월간|연간|갱신|subscription|renew)", Pattern.CASE_INSENSITIVE);
    // 쇼핑 겸용 플랫폼에서 멤버십 요금 자체를 청구했다는 신호. '멤버십 적립/혜택'은 쇼핑 결제의 부가 문구라 제외한다.
    private static final Pattern MEMBERSHIP_BILLING = Pattern.compile("(정기\\s*결제|자동\\s*결제|멤버십\\s*(?:요금|이용료|회비|정기|결제|갱신|가입)|구독료|월\\s*회비)", Pattern.CASE_INSENSITIVE);
    private static final Pattern TRIAL_KEYWORD = Pattern.compile("(무료\\s*체험|체험\\s*기간|체험판|free\\s*trial|첫\\s*달\\s*0원|0원\\s*시작|체험\\s*종료)", Pattern.CASE_INSENSITIVE);
    private static final Pattern PG_MASKED_MERCHANT = Pattern.compile("(google\\s*\\*\\s*services|google\\s*play|구글플레이|애플코리아|apple\\.com/bill|이니시스|kg이니시스|토스페이먼츠|나이스페이|다날|케이씨피|nhn\\s*kcp)", Pattern.CASE_INSENSITIVE);
    private static final Pattern NEGATIVE_KEYWORD = Pattern.compile("(결제\s*취소|승인\s*취소|취소\s*승인|주문\s*취소|취소되었습니다|취소\s*완료|환불\s*완료|환불\s*처리|환불\s*되었습니다|환불\s*진행|반품|카드대금|후불교통|교통카드|송금|이체|적금|대출|이자|현금서비스|배송완료|장바구니)");
    // 'KB국민카드 1234 취소 홍*동 17,000원'처럼 단독으로 쓰인 취소·환불. '취소문의', '환불불가', '취소 가능'은 결제 안내 문구라 제외한다.
    private static final Pattern CANCEL_OR_REFUND_TOKEN = Pattern.compile(
            "(?<![가-힣])(?:취소|환불)(?![가-힣])(?!\\s*(?:문의|가능|불가|안내|규정|정책|수수료))"
            + "|\\b(?:refund(?:ed)?|cancell?ed|reversal|voided)\\b"
            // 환불 대신 크레딧을 돌려주는 'Credit note'와 '플랜이 갱신되지 않습니다' 같은 해지 예약 안내.
            + "|credit\\s*note|갱신되지\\s*않|(?:will\\s*not|won't)\\s*(?:auto-?)?renew",
            Pattern.CASE_INSENSITIVE);
    // 카드 등록·본인 확인·결제수단 확인용 인증 결제와 임시 승인. 구독 결제가 아니다.
    private static final Pattern VERIFICATION_KEYWORD = Pattern.compile(
            "(카드\\s*(?:인증|등록|확인)|본인\\s*(?:인증|확인)\\s*(?:결제|승인)|인증\\s*(?:결제|승인|금액)|결제\\s*수단\\s*(?:등록|확인|인증)"
            + "|유효성\\s*(?:확인|검사|검증)|가승인|임시\\s*승인|테스트\\s*결제|test\\s*(?:charge|payment)"
            + "|temporary\\s*(?:hold|authori[sz]ation)|authori[sz]ation\\s*hold|card\\s*verification|verification\\s*charge|pre-?auth)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern WITHDRAWAL_NEGATIVE = Pattern.compile("(ATM|계좌|이체|송금|예금|입금)");
    private static final Pattern CARD_APPROVAL_HINT = Pattern.compile("(체크카드|체크|승인|결제)");
    private static final Pattern BUSINESS_SUFFIX = Pattern.compile("(헤어|미용실|치과|식당|마트|로지스틱스|물류|카페|베이커리|의원|병원|모텔|호텔|빌딩|세탁|주유소|약국|분식|반점)");
    // 금액 바로 앞에 붙어 결제 금액이 아님을 나타내는 말 ('잔액 500,000원', '누적 사용금액 123,000원', '포인트 적립 300원', '할인금액: 2,000원').
    private static final Pattern NON_CHARGE_PREFIX = Pattern.compile(
            "(잔액|잔여|누적|한도|포인트|적립(?:금|예정)?|할인|캐시백|쿠폰|마일리지|페이백|리워드|사용\\s*가능|이용\\s*가능|VAT|부가세|부가가치세|세액)"
            + "(?:\\s*(?:사용|이용|결제|승인|청구))?(?:\\s*(?:금액|액))?\\s*[:：|]*\\s*(?:KRW|₩|￦)?\\s*$", Pattern.CASE_INSENSITIVE);
    // 연간 결제 표시. 있으면 연간 요금 상한(ANNUAL_PRICE_MULTIPLIER)과 연간 멤버십 요금 근접 판정을 쓴다.
    private static final Pattern ANNUAL_HINT = Pattern.compile(
            "(연간|(?<![가-힣])연\\s*(?:결제|회비|이용료)|(?<![0-9])1\\s*년|12\\s*개월|annual|yearly|per\\s*year|/\\s*년|/\\s*yr)",
            Pattern.CASE_INSENSITIVE);
    // 금액 바로 뒤에 붙어 결제 금액이 아님을 나타내는 말 ('300원 적립', '2,000원(할인)').
    private static final Pattern NON_CHARGE_SUFFIX = Pattern.compile(
            "^\\s*[(\\[]?\\s*(?:적립|할인|캐시백|페이백|포인트|쿠폰|리워드|환급|사용\\s*가능)");
    private static final Pattern PAYMENT_VERB = Pattern.compile("(결제|승인|출금|사용)");

    public static ParsedPayment parse(String packageName, String title, String body) {
        return parse(packageName, title, body, Collections.emptySet());
    }

    public static ParsedPayment parse(String packageName, String title, String body, Set<String> installedServiceIds) {
        String safeTitle = title != null ? title : "";
        String safeBody = body != null ? body : "";
        String combined = safeTitle + " " + safeBody;

        // 1. 제외 키워드(취소, 대금, 이체 등)가 포함된 경우 즉시 기각
        if (NEGATIVE_KEYWORD.matcher(combined).find()) {
            return null;
        }
        // 1-1. 단독으로 쓰인 취소·환불 알림, 카드 등록·본인 확인용 인증 결제는 구독이 아니다.
        if (CANCEL_OR_REFUND_TOKEN.matcher(combined).find() || VERIFICATION_KEYWORD.matcher(combined).find()) {
            return null;
        }

        boolean containsWithdrawal = combined.contains("출금");
        if (containsWithdrawal) {
            if (WITHDRAWAL_NEGATIVE.matcher(combined).find()) {
                return null;
            }
        }

        boolean isTrial = TRIAL_KEYWORD.matcher(combined).find();

        // 2. 금액 파싱 (원통화 및 원금액 보존, 잔액/잔여/누적/한도 금액 제외 및 결제 동사 최근접 우선)
        Matcher amountMatcher = AMOUNT_PATTERN.matcher(combined);
        List<AmountCandidate> candidates = new ArrayList<>();

        while (amountMatcher.find()) {
            int matchStart = amountMatcher.start();
            int matchEnd = amountMatcher.end();

            // 금액 앞뒤에 잔액·누적·포인트·적립·할인 같은 말이 붙어 있으면 결제 금액이 아니다.
            String prefix = combined.substring(0, matchStart);
            String suffix = combined.substring(matchEnd);
            if (NON_CHARGE_PREFIX.matcher(prefix).find() || NON_CHARGE_SUFFIX.matcher(suffix).find()) {
                continue;
            }

            String krw1 = amountMatcher.group(1);
            String krw2 = amountMatcher.group(2);
            String usd1 = amountMatcher.group(3);
            String usd2 = amountMatcher.group(4);
            String usd3 = amountMatcher.group(5);
            String krw3 = amountMatcher.group(6);

            AmountCandidate cand = new AmountCandidate();
            cand.start = matchStart;
            cand.end = matchEnd;

            if (krw1 != null || krw2 != null || krw3 != null) {
                String raw = krw1 != null ? krw1 : (krw2 != null ? krw2 : krw3);
                try {
                    cand.amount = Integer.parseInt(raw.replace(",", ""));
                    cand.currency = "KRW";
                    cand.originalAmount = cand.amount;
                    cand.isEstimated = false;
                    candidates.add(cand);
                } catch (NumberFormatException ignored) {}
            } else if (usd1 != null || usd2 != null || usd3 != null) {
                String rawUsd = usd1 != null ? usd1 : (usd2 != null ? usd2 : usd3);
                try {
                    double dollars = Double.parseDouble(rawUsd);
                    cand.currency = "USD";
                    cand.originalAmount = dollars;
                    cand.amount = (int) Math.round(dollars * USD_KRW_EXCHANGE_RATE);
                    cand.isEstimated = true;
                    candidates.add(cand);
                } catch (NumberFormatException ignored) {}
            }
        }

        // 구독 최소 금액보다 작은 금액(인증 결제·소액 결제·수수료)은 결제 금액 후보에서 뺀다.
        candidates.removeIf(c -> c.amount < MIN_SUBSCRIPTION_AMOUNT_KRW);

        int amount = 0;
        String currency = "KRW";
        double originalAmount = 0.0;
        boolean isEstimated = false;

        if (!candidates.isEmpty()) {
            // 결제 동사(결제/승인/출금/사용)와의 거리 계산
            List<int[]> verbSpans = new ArrayList<>();
            Matcher verbMatcher = PAYMENT_VERB.matcher(combined);
            while (verbMatcher.find()) {
                verbSpans.add(new int[]{verbMatcher.start(), verbMatcher.end()});
            }

            AmountCandidate bestCand = candidates.get(0);
            int minDistance = Integer.MAX_VALUE;

            for (AmountCandidate c : candidates) {
                int dist = Integer.MAX_VALUE;
                if (verbSpans.isEmpty()) {
                    dist = 0;
                } else {
                    for (int[] span : verbSpans) {
                        int currentDist;
                        if (span[1] <= c.start) {
                            currentDist = c.start - span[1];
                        } else if (c.end <= span[0]) {
                            currentDist = span[0] - c.end;
                        } else {
                            currentDist = 0;
                        }
                        if (currentDist < dist) {
                            dist = currentDist;
                        }
                    }
                }
                c.distanceToVerb = dist;
                if (dist < minDistance) {
                    minDistance = dist;
                    bestCand = c;
                }
            }

            amount = bestCand.amount;
            currency = bestCand.currency;
            originalAmount = bestCand.originalAmount;
            isEstimated = bestCand.isEstimated;
        }

        if (amount == 0 && !isTrial) {
            return null;
        }

        String compactCombined = combined.toLowerCase().replaceAll("[^a-zA-Z0-9가-힣]", "");

        // 3. 알려진 서비스 매칭
        KnownService bestMatch = null;
        int longestMatchLen = 0;
        for (KnownService service : KNOWN_SERVICES) {
            for (String alias : service.aliases) {
                String compactAlias = alias.toLowerCase().replaceAll("[^a-zA-Z0-9가-힣]", "");
                if (!compactAlias.isEmpty() && compactCombined.contains(compactAlias)) {
                    if (compactAlias.length() > longestMatchLen) {
                        longestMatchLen = compactAlias.length();
                        bestMatch = service;
                    }
                }
            }
        }

        // 3-1. 가맹점명이 '구글플레이', '이니시스', '토스페이먼츠' 등 PG/인앱결제로 가려진 경우 금액 지문(Price Fingerprint) + 설치 앱 교차 매칭
        boolean isPgMasked = PG_MASKED_MERCHANT.matcher(combined).find();
        if ((bestMatch == null || "apple".equals(bestMatch.id)) && isPgMasked && amount > 0) {
            KnownService fingerprintMatch = inferServiceByPriceFingerprint(amount, installedServiceIds);
            if (fingerprintMatch != null) {
                bestMatch = fingerprintMatch;
            }
        }

        if (containsWithdrawal) {
            boolean hasCardApprovalHint = CARD_APPROVAL_HINT.matcher(combined).find();
            if (bestMatch == null && !hasCardApprovalHint) {
                return null;
            }
        }

        // 4. 일반 상호명 후치어 필터 (예: "웨이브헤어", "디즈니치과" 등 동음이의어 오프라인 매장 배제)
        if (bestMatch != null) {
            Matcher suffixMatcher = BUSINESS_SUFFIX.matcher(combined);
            if (suffixMatcher.find()) {
                // 서비스명 바로 뒤에 사업자 접미사가 붙어있는지 확인
                for (String alias : bestMatch.aliases) {
                    if (combined.contains(alias + suffixMatcher.group(1))) {
                        return null;
                    }
                }
            }
        }

        boolean hasRecurringKeyword = RECURRING_KEYWORD.matcher(combined).find() || isTrial;

        // 5. 복합 플랫폼(쿠팡, 네이버 등) 금액 일치성 검증 (Price Matcher)
        boolean hasAnnualHint = ANNUAL_HINT.matcher(combined).find();
        if (bestMatch != null && amount > 0) {
            double maxMultiplier = hasAnnualHint ? ANNUAL_PRICE_MULTIPLIER : MAX_PRICE_MULTIPLIER;
            if (AGGREGATOR_SERVICE_IDS.contains(bestMatch.id)) {
                if (amount > AGGREGATOR_MAX_AMOUNT_KRW) {
                    return null;
                }
            } else if (bestMatch.strictAmountCheck) {
                // 쇼핑 겸용 플랫폼은 멤버십 요금과 정확히 같은 금액이거나, 멤버십 요금 청구 문구('월회비', '멤버십 요금' 등)가 있을 때만 받는다.
                // 실제 쿠팡 주문 메일에는 멤버십 요금 근처 가격(5,630원·8,860원·9,900원)의 일반 상품이 흔해서 '가까운 금액'은 근거가 되지 못한다.
                // ('결제 영수증', '주문 영수증', '멤버십 적립'도 일반 쇼핑 결제와 구별할 수 없다.)
                boolean membershipBilling = MEMBERSHIP_BILLING.matcher(combined).find();
                boolean exactPrice = bestMatch.allowedAmounts.contains(amount);
                boolean explicitBilling = membershipBilling
                        && isPlausibleServiceAmount(amount, bestMatch.allowedAmounts, maxMultiplier);
                if (!exactPrice && !explicitBilling) {
                    return null;
                }
            } else if (!isPlausibleServiceAmount(amount, bestMatch.allowedAmounts, maxMultiplier)) {
                // 이름만 같고 금액이 그 서비스 요금과 동떨어지면(예: '지니' 편의점 2,500원) 그 서비스 결제로 보지 않는다.
                return null;
            }
        }

        boolean isEmailChannel = packageName != null && (
                packageName.contains("gm") ||
                packageName.contains("mail") ||
                packageName.contains("outlook") ||
                PaymentPackageRegistry.EMAIL_PACKAGES.contains(packageName)
        );

        // 이메일 앱 알림인 경우, 알려진 서비스명(bestMatch)이나 명시적인 서비스 신호 없이는
        // 단순 invoice/receipt/구독 단어 + 금액만으로 구독 판정하지 않는다.
        if (isEmailChannel && bestMatch == null) {
            return null;
        }

        ParsedPayment result = new ParsedPayment();
        result.amount = (amount == 0 && isTrial && bestMatch != null && !bestMatch.allowedAmounts.isEmpty())
                ? Collections.min(bestMatch.allowedAmounts)
                : amount;
        result.currency = currency;
        result.originalAmount = originalAmount;
        result.isEstimated = isEstimated;
        result.isTrial = isTrial;
        result.rawText = combined;
        if (isEmailChannel) {
            result.sourceChannel = "email_notification";
        } else if ("com.android.vending".equals(packageName)) {
            result.sourceChannel = "play_store";
        }

        if (bestMatch != null) {
            result.serviceId = bestMatch.id;
            result.serviceName = bestMatch.name;
            result.category = bestMatch.category;
            result.isSubscription = true;
        } else if (hasRecurringKeyword) {
            result.isSubscription = true;
            result.serviceName = extractServiceNameFallback(combined);
            result.category = "기타";
        } else {
            return null;
        }

        result.paymentMethod = detectPaymentMethod(packageName, combined);
        result.plan = inferPlan(result.serviceId, result.amount, combined);

        return result;
    }

    /**
     * PG/인앱결제('구글플레이 14,900원', '이니시스 7,890원' 등)처럼 가맹점이 마스킹된 경우
     * 한국 주요 구독 요금 지문(Price Fingerprint)과 기기 내 설치된 앱 목록을 교차 검증하여 서비스를 특정한다.
     */
    public static KnownService inferServiceByPriceFingerprint(int amount, Set<String> installedServiceIds) {
        List<KnownService> candidates = new ArrayList<>();
        for (KnownService service : KNOWN_SERVICES) {
            if ("apple".equals(service.id)) continue;
            if (service.allowedAmounts.contains(amount)) {
                candidates.add(service);
            }
        }
        if (candidates.isEmpty()) {
            return null;
        }
        if (candidates.size() == 1) {
            return candidates.get(0);
        }
        // 후보가 여러 개면 사용자의 기기에 실제로 설치된 앱을 최우선 선택
        if (installedServiceIds != null && !installedServiceIds.isEmpty()) {
            for (KnownService candidate : candidates) {
                if (installedServiceIds.contains(candidate.id)) {
                    return candidate;
                }
            }
        }
        // 대표적인 고유 가격대 우선순위 매핑
        if (amount == 14900) return findKnownById("youtube");
        if (amount == 7890 || amount == 4990) return findKnownById("coupang");
        if (amount == 4900) return findKnownById("naver");
        if (amount == 17000 || amount == 13500) return findKnownById("netflix");
        return candidates.get(0);
    }

    /** 금액이 그 서비스 결제로 볼 만한 범위(최저가 x MIN_PRICE_RATIO ~ 최고가 x maxMultiplier)인지. */
    static boolean isPlausibleServiceAmount(int amount, Set<Integer> knownAmounts, double maxMultiplier) {
        if (knownAmounts == null || knownAmounts.isEmpty()) return true;
        int min = Collections.min(knownAmounts);
        int max = Collections.max(knownAmounts);
        return amount >= min * MIN_PRICE_RATIO && amount <= max * maxMultiplier;
    }

    private static KnownService findKnownById(String id) {
        for (KnownService s : KNOWN_SERVICES) {
            if (s.id.equals(id)) return s;
        }
        return null;
    }

    private static String extractServiceNameFallback(String text) {
        Pattern pattern = Pattern.compile("(?:가맹점명|가맹점|상호명|서비스)[:：\\s]*([가-힣a-zA-Z0-9]+)");
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return "신규 구독 서비스";
    }

    private static String detectPaymentMethod(String packageName, String text) {
        String pkg = packageName != null ? packageName : "";
        if (pkg.contains("shcard") || text.contains("신한카드") || text.contains("신한SOL") || text.contains("신한체크") || text.contains("신한")) return "신한카드";
        if (pkg.contains("kbcard") || pkg.contains("kbstar") || text.contains("KB국민카드") || text.contains("KB Pay") || text.contains("국민카드") || text.contains("KB체크")) return "KB국민카드";
        if (pkg.contains("hyundaicard") || text.contains("현대카드") || text.contains("현대체크")) return "현대카드";
        if (pkg.contains("samsungcard") || text.contains("삼성카드") || text.contains("삼성체크")) return "삼성카드";
        if (pkg.contains("wooricard") || text.contains("우리카드") || text.contains("우리WON") || text.contains("우리체크")) return "우리카드";
        if (pkg.contains("lotte") || text.contains("롯데카드") || text.contains("디지로카") || text.contains("롯데체크")) return "롯데카드";
        if (pkg.contains("hanamembers") || pkg.contains("hana") || text.contains("하나카드") || text.contains("하나Pay") || text.contains("하나체크")) return "하나카드";
        if (pkg.contains("nh.smart.card") || pkg.contains("nh.smart") || text.contains("NH농협카드") || text.contains("농협카드") || text.contains("NH체크") || text.contains("농협체크")) return "NH농협카드";
        if (pkg.contains("bccard") || text.contains("비씨카드") || text.contains("페이북")) return "BC카드";
        if (pkg.contains("kakaopay") || text.contains("카카오페이")) return "카카오페이";
        if (pkg.contains("toss") || text.contains("토스페이")) return "토스페이";
        if (pkg.contains("nhn") || text.contains("네이버페이")) return "네이버페이";
        if (pkg.contains("spay") || text.contains("삼성월렛") || text.contains("삼성페이")) return "삼성월렛";
        return "신용/체크카드";
    }

    private static String inferPlan(String serviceId, int amount, String text) {
        if (text.contains("프리미엄") || text.toLowerCase().contains("premium")) return "프리미엄";
        if (text.contains("스탠다드") || text.toLowerCase().contains("standard")) return "스탠다드";
        if (text.contains("베이직") || text.toLowerCase().contains("basic")) return "베이직";
        if (text.contains("와우")) return "와우 멤버십";
        if (!"disney".equals(serviceId) && text.contains("플러스")) return "Plus";

        if ("netflix".equals(serviceId)) {
            if (amount == 17000) return "프리미엄";
            if (amount == 13500) return "스탠다드";
            if (amount == 5500) return "광고형 스탠다드";
        } else if ("youtube".equals(serviceId)) {
            if (amount == 14900) return "개인 멤버십";
        } else if ("coupang".equals(serviceId)) {
            if (amount == 7890 || amount == 4990) return "와우 멤버십";
        } else if ("disney".equals(serviceId)) {
            if (amount == 9900) return "스탠다드";
            if (amount == 13900) return "프리미엄";
        } else if ("tving".equals(serviceId)) {
            if (amount == 13500) return "스탠다드";
            if (amount == 17000) return "프리미엄";
            if (amount == 5500) return "광고형 스탠다드";
        }
        return "기본 플랜";
    }
}
