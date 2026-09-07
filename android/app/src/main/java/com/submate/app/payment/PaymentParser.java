package com.submate.app.payment;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class PaymentParser {

    public static class KnownService {
        public final String id;
        public final String name;
        public final String category;
        public final List<String> aliases;

        public KnownService(String id, String name, String category, String... aliases) {
            this.id = id;
            this.name = name;
            this.category = category;
            this.aliases = new ArrayList<>();
            this.aliases.add(name.toLowerCase());
            for (String a : aliases) {
                this.aliases.add(a.toLowerCase());
            }
        }
    }

    public static final List<KnownService> KNOWN_SERVICES = new ArrayList<>();

    static {
        KNOWN_SERVICES.add(new KnownService("netflix", "Netflix", "OTT", "넷플릭스", "netflix.com"));
        KNOWN_SERVICES.add(new KnownService("youtube", "YouTube Premium", "OTT", "유튜브", "youtube", "google youtube", "구글유튜브"));
        KNOWN_SERVICES.add(new KnownService("coupang", "쿠팡 와우", "쇼핑", "쿠팡", "coupang", "쿠팡와우", "와우멤버십"));
        KNOWN_SERVICES.add(new KnownService("spotify", "Spotify", "음악", "스포티파이"));
        KNOWN_SERVICES.add(new KnownService("chatgpt", "ChatGPT Plus", "AI/생산성", "챗gpt", "chatgpt", "openai", "챗지피티"));
        KNOWN_SERVICES.add(new KnownService("tving", "티빙", "OTT", "tving", "cj enm"));
        KNOWN_SERVICES.add(new KnownService("disney", "Disney+", "OTT", "디즈니+", "디즈니플러스", "disneyplus", "disney"));
        KNOWN_SERVICES.add(new KnownService("watcha", "왓챠", "OTT", "watcha"));
        KNOWN_SERVICES.add(new KnownService("wavve", "웨이브", "OTT", "wavve"));
        KNOWN_SERVICES.add(new KnownService("millie", "밀리의서재", "도서", "밀리", "밀리의 서재"));
        KNOWN_SERVICES.add(new KnownService("notion", "Notion", "AI/생산성", "노션"));
        KNOWN_SERVICES.add(new KnownService("adobe", "Adobe", "AI/생산성", "어도비"));
        KNOWN_SERVICES.add(new KnownService("claude", "Claude Pro", "AI/생산성", "클로드", "anthropic"));
        KNOWN_SERVICES.add(new KnownService("apple", "Apple One", "기타", "apple.com/bill", "애플"));
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
    private static final Pattern RECURRING_KEYWORD = Pattern.compile("(정기|자동결제|정기결제|매월|구독|멤버십|월간)");

    public static ParsedPayment parse(String packageName, String title, String body) {
        String safeTitle = title != null ? title : "";
        String safeBody = body != null ? body : "";
        String combined = safeTitle + " " + safeBody;
        String compactCombined = combined.toLowerCase().replaceAll("[^a-zA-Z0-9가-힣]", "");

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

        ParsedPayment result = new ParsedPayment();
        result.amount = amount;
        result.rawText = combined;

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

        boolean hasRecurringKeyword = RECURRING_KEYWORD.matcher(combined).find();

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
        if (text.contains("플러스") || text.toLowerCase().contains("plus")) return "Plus";

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

