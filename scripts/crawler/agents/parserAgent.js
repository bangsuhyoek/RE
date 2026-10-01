/**
 * 추출 에이전트 (Parser Agent)
 * 
 * 역할: 탐색 에이전트(Crawler Agent)가 전달한 원시 HTML/DOM 결과물에서 
 * 구독 요금제, 결제금액, 서비스 혜택, 안내 정보 등을 추출하여 구조화된 JSON 데이터로 변환.
 */

export class ParserAgent {
  /**
   * 원시 HTML 및 타겟 설정을 기반으로 서비스 카탈로그 항목 생성
   * @param {Object} crawlResult - Crawler Agent 수집 결과
   * @param {Object} target - 대상 서비스 설정
   * @returns {Object} 구조화된 파싱 결과 데이터
   */
  parse(crawlResult, target) {
    if (!crawlResult || crawlResult.status !== "SUCCESS" || !crawlResult.rawContent) {
      // 탐색 실패 시 기본 설정의 fallbackData 파싱 적용
      return this.buildCatalogItemFromFallback(target, "CRAWL_FAILED");
    }

    try {
      const html = crawlResult.rawContent;

      // 1. 숫자 가격 정보 정규식 추출 시도
      const priceMatches = html.match(/(?:월\s*)?([0-9,]{4,6})\s*원/g) || [];
      const extractedPrices = priceMatches
        .map((p) => parseInt(p.replace(/[^0-9]/g, ""), 10))
        .filter((price) => !isNaN(price) && price >= 1000 && price <= 200000);

      // 2. 가용한 요금제 구성
      let availablePlans = [...(target.fallbackData?.availablePlans || [])];
      if (extractedPrices.length > 0) {
        const uniquePrices = Array.from(new Set(extractedPrices)).sort((a, b) => a - b);
        if (uniquePrices.length >= 1) {
          availablePlans = uniquePrices.map((amount, idx) => ({
            plan: idx === 0 ? "기본 플랜" : idx === 1 ? "스탠다드" : "프리미엄",
            amount,
          }));
        }
      }

      // 3. 대표 요금제 및 금액 산정
      const primaryPlan = target.fallbackData?.plan || availablePlans[0]?.plan || "기본 요금제";
      const primaryAmount =
        target.fallbackData?.amount || availablePlans[availablePlans.length - 1]?.amount || 10000;

      // 4. 구조화된 plans 배열 생성
      const plans = availablePlans.map((item) => ({
        name: item.plan,
        amount: item.amount,
        billingCycle: "매월",
        quality: item.plan.includes("프리미엄")
          ? "4K UHD"
          : item.plan.includes("스탠다드")
          ? "1080p"
          : "HD",
      }));

      return {
        id: target.id,
        name: target.name,
        monogram: target.monogram,
        category: target.category,
        plan: primaryPlan,
        amount: primaryAmount,
        brandColor: target.brandColor,
        brandBg: target.brandBg,
        brandText: target.brandText,
        availablePlans,
        plans,
        cancelUrl: target.cancelUrl,
        lastUpdated: new Date().toISOString(),
        parseStatus: "PARSED_SUCCESS",
      };
    } catch (err) {
      return this.buildCatalogItemFromFallback(target, `PARSE_EXCEPTION: ${err.message}`);
    }
  }

  /**
   * 파싱 예외 또는 수집 실패 시 안전한 백업 데이터 구성
   */
  buildCatalogItemFromFallback(target, reason = "FALLBACK") {
    const fallback = target.fallbackData || {
      plan: "기본 요금제",
      amount: 10000,
      availablePlans: [{ plan: "기본 요금제", amount: 10000 }],
    };

    const plans = fallback.availablePlans.map((item) => ({
      name: item.plan,
      amount: item.amount,
      billingCycle: "매월",
      quality: item.plan.includes("프리미엄") ? "4K UHD" : "1080p",
    }));

    return {
      id: target.id,
      name: target.name,
      monogram: target.monogram,
      category: target.category,
      plan: fallback.plan,
      amount: fallback.amount,
      brandColor: target.brandColor,
      brandBg: target.brandBg,
      brandText: target.brandText,
      availablePlans: fallback.availablePlans,
      plans,
      cancelUrl: target.cancelUrl,
      lastUpdated: new Date().toISOString(),
      parseStatus: reason,
    };
  }
}
