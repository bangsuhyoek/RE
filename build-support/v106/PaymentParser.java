package kr.co.re.subscription.payment;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** v1.0.6 parser aligned to the physically verified team-main behavior. */
public final class PaymentParser {
    private PaymentParser() {}

    private static final Pattern AMOUNT = Pattern.compile("([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})\\s*원|[$]\\s*([0-9]+(?:[.][0-9]{2})?)", Pattern.CASE_INSENSITIVE);
    private static final Pattern RECURRING = Pattern.compile("(정기|자동결제|정기결제|매월|구독|멤버십|와우|플러스멤버십|월간|연간|정기과금)", Pattern.CASE_INSENSITIVE);
    private static final Pattern NEGATIVE = Pattern.compile("(취소|환불|승인취소|결제취소|반품|카드대금|후불교통|교통카드|송금|이체|출금|적금|대출|이자|현금서비스|배송완료|주문취소|장바구니)");
    private static final Pattern BUSINESS_SUFFIX = Pattern.compile("(헤어|미용실|치과|식당|마트|로지스틱스|물류|카페|베이커리|의원|병원|모텔|호텔|빌딩|세탁|주유소|약국|분식|반점)");

    private static final class KnownService {
        final String id, name, category;
        final boolean strictAmount;
        final Set<Integer> expectedAmounts;
        final List<String> aliases = new ArrayList<>();
        KnownService(String id, String name, String category, boolean strictAmount, Integer[] amounts, String... aliases) {
            this.id=id; this.name=name; this.category=category; this.strictAmount=strictAmount;
            this.expectedAmounts = new HashSet<>(Arrays.asList(amounts));
            this.aliases.add(name.toLowerCase(Locale.ROOT));
            for (String a: aliases) this.aliases.add(a.toLowerCase(Locale.ROOT));
        }
    }

    private static final List<KnownService> SERVICES = Arrays.asList(
        new KnownService("netflix", "Netflix", "영상", false, new Integer[]{5500,13500,17000}, "넷플릭스", "netflix.com"),
        new KnownService("youtube", "YouTube Premium", "영상", false, new Integer[]{8690,10450,14900,19000}, "유튜브", "youtube", "google youtube", "구글유튜브"),
        new KnownService("tving", "티빙", "영상", false, new Integer[]{5500,9500,13500,17000}, "tving", "cj enm"),
        new KnownService("disney", "Disney+", "영상", false, new Integer[]{9900,13900,99000,139000}, "디즈니+", "디즈니플러스", "disneyplus", "disney"),
        new KnownService("watcha", "왓챠", "영상", false, new Integer[]{7900,12900}, "watcha"),
        new KnownService("wavve", "웨이브", "영상", false, new Integer[]{7900,10900,13900}, "wavve"),
        new KnownService("spotify", "Spotify", "음악", false, new Integer[]{8690,10900,11990,17900}, "스포티파이"),
        new KnownService("melon", "멜론", "음악", false, new Integer[]{7900,10900,11900}, "melon"),
        new KnownService("chatgpt", "ChatGPT Plus", "AI·생산성", false, new Integer[]{27000,29000}, "챗gpt", "chatgpt", "openai", "챗지피티"),
        new KnownService("notion", "Notion", "AI·생산성", false, new Integer[]{11000,13500,20000}, "노션"),
        new KnownService("adobe", "Adobe", "AI·생산성", false, new Integer[]{13200,26400,35200,61600}, "어도비"),
        new KnownService("claude", "Claude Pro", "AI·생산성", false, new Integer[]{27000,29000}, "클로드", "anthropic"),
        new KnownService("millie", "밀리의서재", "도서", false, new Integer[]{9900,99000}, "밀리", "밀리의 서재"),
        new KnownService("coupang", "쿠팡 와우", "쇼핑", true, new Integer[]{4990,7890}, "쿠팡", "coupang", "쿠팡와우", "와우멤버십"),
        new KnownService("naver", "네이버플러스 멤버십", "쇼핑", true, new Integer[]{4900,46800}, "네이버플러스", "네이버멤버십", "네이버"),
        new KnownService("apple", "Apple One", "기타", true, new Integer[]{14900,20900,3300,4400,8900}, "apple.com/bill", "애플")
    );

    public static final class ParsedPayment {
        public String serviceId="";
        public String serviceName="";
        public String category="기타";
        public String plan="기본 요금제";
        public String paymentMethod="신용·체크카드";
        public int amount;
        public int confidence;
        public boolean isSubscription;
    }

    public static ParsedPayment parse(String packageName, String title, String body) {
        if (!PaymentPackageRegistry.isTargetPackage(packageName)) return null;
        String combined = safe(title) + " " + safe(body);
        if (NEGATIVE.matcher(combined).find()) return null;

        Matcher amountMatcher = AMOUNT.matcher(combined);
        int amount = 0;
        while (amountMatcher.find()) {
            String krw = amountMatcher.group(1);
            String usd = amountMatcher.group(2);
            try {
                if (krw != null) { amount = Integer.parseInt(krw.replace(",", "").replace("원", "").trim()); break; }
                if (usd != null) { amount = (int)Math.round(Double.parseDouble(usd) * 1350); break; }
            } catch (Exception ignored) {}
        }
        if (amount <= 0) return null;

        String compact = compact(combined);
        KnownService match = null;
        int matchLength = 0;
        for (KnownService service : SERVICES) {
            for (String alias : service.aliases) {
                String c = compact(alias);
                if (!c.isEmpty() && compact.contains(c) && c.length() > matchLength) {
                    match = service; matchLength = c.length();
                }
            }
        }

        if (match != null) {
            Matcher suffix = BUSINESS_SUFFIX.matcher(combined);
            if (suffix.find()) {
                for (String alias : match.aliases) {
                    if (combined.toLowerCase(Locale.ROOT).contains(alias + suffix.group(1))) return null;
                }
            }
        }

        boolean recurring = RECURRING.matcher(combined).find();
        if (match == null && !recurring) return null;
        if (match != null && match.strictAmount && !match.expectedAmounts.contains(amount) && !recurring) return null;

        ParsedPayment result = new ParsedPayment();
        result.amount = amount;
        result.paymentMethod = detectPaymentMethod(packageName, combined);
        result.isSubscription = true;
        if (match != null) {
            result.serviceId = match.id;
            result.serviceName = match.name;
            result.category = match.category;
            result.plan = inferPlan(match.id, amount, combined);
            result.confidence = recurring || match.expectedAmounts.contains(amount) ? 95 : 82;
        } else {
            result.serviceId = "unknown";
            result.serviceName = extractServiceNameFallback(combined);
            result.confidence = 70;
        }
        return result;
    }

    private static String safe(String v){ return v==null?"":v; }
    private static String compact(String v){ return v.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9가-힣]", ""); }
    private static String extractServiceNameFallback(String text) {
        Matcher m=Pattern.compile("(?:가맹점명|가맹점|상호명|서비스)[:：\\s]*([가-힣a-zA-Z0-9]+)").matcher(text);
        return m.find()?m.group(1).trim():"확인이 필요한 구독";
    }
    private static String detectPaymentMethod(String pkg, String text) {
        String p=pkg==null?"":pkg;
        if (p.contains("shcard")||text.contains("신한")) return "신한카드";
        if (p.contains("kbcard")||p.contains("kbstar")||text.contains("KB")||text.contains("국민")) return "KB국민카드";
        if (p.contains("hyundaicard")||text.contains("현대")) return "현대카드";
        if (p.contains("samsungcard")||text.contains("삼성카드")) return "삼성카드";
        if (p.contains("wooricard")||text.contains("우리")) return "우리카드";
        if (p.contains("lotte")||text.contains("롯데")) return "롯데카드";
        if (p.contains("hana")||text.contains("하나")) return "하나카드";
        if (p.contains("nh.smart")||text.contains("농협")) return "NH농협카드";
        if (p.contains("kakaopay")||text.contains("카카오페이")) return "카카오페이";
        if (p.contains("toss")||text.contains("토스")) return "토스페이";
        if (p.contains("spay")||text.contains("삼성월렛")||text.contains("삼성페이")) return "삼성월렛";
        return "신용·체크카드";
    }
    private static String inferPlan(String id,int amount,String text){
        String l=text.toLowerCase(Locale.ROOT);
        if(text.contains("프리미엄")||l.contains("premium")) return "프리미엄";
        if(text.contains("스탠다드")||l.contains("standard")) return "스탠다드";
        if(text.contains("베이직")||l.contains("basic")) return "베이직";
        if(text.contains("와우")) return "와우 멤버십";
        if(!"disney".equals(id)&&text.contains("플러스")) return "Plus";
        if("netflix".equals(id)){ if(amount==17000)return "프리미엄"; if(amount==13500)return "스탠다드"; if(amount==5500)return "광고형 스탠다드"; }
        if("youtube".equals(id)){ if(amount==14900)return "개인 멤버십"; if(amount==19000)return "프리미엄"; }
        if("coupang".equals(id)) return "와우 멤버십";
        if("chatgpt".equals(id)) return "Plus";
        return "기본 요금제";
    }
}