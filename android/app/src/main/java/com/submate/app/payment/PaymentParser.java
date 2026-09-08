package com.submate.app.payment;

import java.util.ArrayList;
import java.util.Arrays;
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
    }

    public static final List<KnownService> KNOWN_SERVICES = new ArrayList<>();

    static {
        // OTT
        KNOWN_SERVICES.add(new KnownService("netflix", "Netflix", "OTT", false, new Integer[]{5500, 13500, 17000}, "넷플릭스", "netflix.com"));
        KNOWN_SERVICES.add(new KnownService("youtube", "YouTube Premium", "OTT", false, new Integer[]{8690, 10450, 14900}, "유튜브", "youtube", "google youtube", "구글유튜브"));
        KNOWN_SERVICES.add(new KnownService("tving", "티빙", "OTT", false, new Integer[]{5500, 9500, 13500, 17000}, "tving", "cj enm"));
        KNOWN_SERVICES.add(new KnownService("disney", "Disney+", "OTT", false, new Integer[]{9900, 13900, 99000, 139000}, "디즈니+", "디즈니플러스", "disneyplus", "disney"));
        KNOWN_SERVICES.add(new KnownService("watcha", "왓챠", "OTT", false, new Integer[]{7900, 12900}, "watcha"));
        KNOWN_SERVICES.add(new KnownService("wavve", "웨이브", "OTT", false, new Integer[]{7900, 10900, 13900}, "wavve"));

        // 쇼핑 & 커머스 (쿠팡 등 복합 플랫폼은 일반 주문 오탐 방지를 위해 strictAmountCheck = true)
        KNOWN_SERVICES.add(new KnownService("coupang", "쿠팡 와우", "쇼핑", true, new Integer[]{4990, 7890}, "쿠팡", "coupang", "쿠팡와우", "와우멤버십"));
        KNOWN_SERVICES.add(new KnownService("naver", "네이버플러스 멤버십", "쇼핑", true, new Integer[]{4900, 46800}, "네이버플러스", "네이버멤버십", "네이버"));

        // 음악
        KNOWN_SERVICES.add(new KnownService("spotify", "Spotify", "음악", false, new Integer[]{8690, 10900, 11990, 17900}, "스포티파이"));
        KNOWN_SERVICES.add(new KnownService("melon", "멜론", "음악", false, new Integer[]{7900, 10900, 11900}, "melon"));

        // AI & 생산성
        KNOWN_SERVICES.add(new KnownService("chatgpt", "ChatGPT Plus", "AI/생산성", false, new Integer[]{27000, 29000}, "챗gpt", "chatgpt", "openai", "챗지피티"));
        KNOWN_SERVICES.add(new KnownService("notion", "Notion", "AI/생산성", false, new Integer[]{11000, 13500, 20000}, "노션"));
        KNOWN_SERVICES.add(new KnownService("adobe", "Adobe", "AI/생산성", false, new Integer[]{13200, 26400, 35200, 61600}, "어도비"));
        KNOWN_SERVICES.add(new KnownService("claude", "Claude Pro", "AI/생산성", false, new Integer[]{27000, 29000}, "클로드", "anthropic"));
        KNOWN_SERVICES.add(new KnownService("millie", "밀리의서재", "도서", false, new Integer[]{9900, 99000}, "밀리", "밀리의 서재"));
        KNOWN_SERVICES.add(new KnownService("apple", "Apple One", "기타", true, new Integer[]{14900, 20900, 3300, 4400, 8900}, "apple.com/bill", "애플"));
    }

    public static class ParsedPayment {
        public String serviceId = "";
        public String serviceName = "";
        public String category = "기타";
        public String plan = "";
        public int amount = 0;
        public String paymentMethod = "카드";
        public boolean isSubscription = false;
        public String rawText = "";
    }

    private static final Pattern AMOUNT_PATTERN = Pattern.compile("([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})\\s*원|[$]\\s*([0-9]+(?:[.][0-9]{2})?)");
    private static final Pattern RECURRING_KEYWORD = Pattern.compile("(정기|자동결제|정기결제|매월|구독|멤버십|와우|플러스멤버십|월간)");
    private static final Pattern NEGATIVE_KEYWORD = Pattern.compile("(취소|환불|승인취소|결제취소|반품|카드대금|후불교통|교통카드|송금|이체|출금|적금|대출|이자|현금서비스|배송완료|주문취소|장바구니)");
    private static final Pattern BUSINESS_SUFFIX = Pattern.compile("(헤어|미용실|치과|식당|마트|로지스틱스|물류|카페|베이커리|의원|병원|모텔|호텔|빌딩|세탁|주유소|약국|분식|반점)");

    public static ParsedPayment parse(String packageName, String title, String body) {
        String safeTitle = title != null ? title : "";
        String safeBody = body != null ? body : "";
        String combined = safeTitle + " " + safeBody;

        // 1. 제외 키워드(취소, 대금, 이체 등)가 포함된 경우 즉시 기각
        if (NEGATIVE_KEYWORD.matcher(combined).find()) {
            return null;
        }

        // 2. 금액 파싱
        Matcher amountMatcher = AMOUNT_PATTERN.matcher(combined);
        int amount = 0;
        while (amountMatcher.find()) {
            String krw = amountMatcher.group(1);
            String usd = amountMatcher.group(2);
            if (krw != null) {
                try {
                    amount = Integer.parseInt(krw.replace(",", ""));
                    break;
                } catch (NumberFormatException ignored) {}
            } else if (usd != null) {
                try {
                    double dollars = Double.parseDouble(usd);
                    amount = (int) Math.round(dollars * 1350);
                    break;
                } catch (NumberFormatException ignored) {}
            }
        }

        if (amount == 0) {
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

        boolean hasRecurringKeyword = RECURRING_KEYWORD.matcher(combined).find();

        // 5. 복합 플랫폼(쿠팡, 네이버 등) 금액 일치성 검증 (Price Matcher)
        if (bestMatch != null) {
            if (bestMatch.strictAmountCheck) {
                boolean isAmountMatched = bestMatch.allowedAmounts.contains(amount);
                // 금액이 일치하지 않고 명시적 정기결제/멤버십 단어도 없다면 -> 일반 쇼핑 결제이므로 기각!
                if (!isAmountMatched && !hasRecurringKeyword) {
                    return null;
                }
            }
        }

        ParsedPayment result = new ParsedPayment();
        result.amount = amount;
        result.rawText = combined;

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
        if (pkg.contains("shcard") || text.contains("신한")) return "신한카드";
        if (pkg.contains("kbcard") || pkg.contains("kbstar") || text.contains("KB") || text.contains("국민")) return "KB국민카드";
        if (pkg.contains("hyundaicard") || text.contains("현대")) return "현대카드";
        if (pkg.contains("samsungcard") || text.contains("삼성카드")) return "삼성카드";
        if (pkg.contains("wooricard") || text.contains("우리")) return "우리카드";
        if (pkg.contains("lotte") || text.contains("롯데")) return "롯데카드";
        if (pkg.contains("hana") || text.contains("하나")) return "하나카드";
        if (pkg.contains("nh.smart") || text.contains("농협")) return "NH농협카드";
        if (pkg.contains("kakaopay") || text.contains("카카오페이")) return "카카오페이";
        if (pkg.contains("toss") || text.contains("토스")) return "토스페이";
        if (pkg.contains("nhn") || text.contains("네이버페이")) return "네이버페이";
        if (pkg.contains("spay") || text.contains("삼성월렛") || text.contains("삼성페이")) return "삼성월렛";
        return "신용/체크카드";
    }

    private static String inferPlan(String serviceId, int amount, String text) {
        if (text.contains("프리미엄") || text.toLowerCase().contains("premium")) return "프리미엄";
        if (text.contains("스탠다드") || text.toLowerCase().contains("standard")) return "스탠다드";
        if (text.contains("베이직") || text.toLowerCase().contains("basic")) return "베이직";
        if (text.contains("와우")) return "와우 멤버십";
        if (text.contains("플러스")) return "Plus";

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

