/**
 * 공식 검증 모듈 (Formal Verification & Self-Correction Pipeline)
 * 
 * 역할:
 * 1. 파싱된 요금제 데이터의 타입, 범위, 필수 정보 누락 여부를 엄격히 검증.
 * 2. 이상 발견 시 시스템 자체 오류 인지 및 재시도/폴백(fallback) 메커니즘을 트리거하여 데이터 무결성 보장.
 */

export class FormalVerifier {
  /**
   * 단일 수집 데이터의 정밀 공식 검증 수행
   * @param {Object} item - 추출 에이전트가 변환한 카탈로그 항목
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  verifyItem(item) {
    const errors = [];

    if (!item) {
      return { isValid: false, errors: ["Data item is null or undefined"] };
    }

    // 1. 필수 문자열 식별자 검증
    if (typeof item.id !== "string" || item.id.trim() === "") {
      errors.push("Invalid or missing 'id' string field");
    }
    if (typeof item.name !== "string" || item.name.trim() === "") {
      errors.push("Invalid or missing 'name' string field");
    }

    // 2. 대표 가격(amount) 숫자 포맷 및 긍정 수치 검증
    if (typeof item.amount !== "number" || isNaN(item.amount) || item.amount <= 0) {
      errors.push(`Invalid price 'amount': expected positive number, got ${item.amount}`);
    }

    // 3. 요금제 목록(availablePlans 및 plans) 검증
    if (!Array.isArray(item.availablePlans) || item.availablePlans.length === 0) {
      errors.push("Field 'availablePlans' must be a non-empty array");
    } else {
      item.availablePlans.forEach((planItem, idx) => {
        if (!planItem.plan || typeof planItem.plan !== "string") {
          errors.push(`availablePlans[${idx}]: missing or invalid 'plan' string`);
        }
        if (typeof planItem.amount !== "number" || isNaN(planItem.amount) || planItem.amount <= 0) {
          errors.push(`availablePlans[${idx}]: price 'amount' must be positive number`);
        }
      });
    }

    if (!Array.isArray(item.plans) || item.plans.length === 0) {
      errors.push("Field 'plans' must be a non-empty array");
    }

    // 4. 해지 가이드 단계(guideSteps) 검증
    if (!Array.isArray(item.guideSteps) || item.guideSteps.length === 0) {
      errors.push("Field 'guideSteps' must be a non-empty array");
    } else {
      item.guideSteps.forEach((step, idx) => {
        if (typeof step.stepNumber !== "number" || step.stepNumber <= 0) {
          errors.push(`guideSteps[${idx}]: stepNumber must be positive integer`);
        }
        if (!step.title || typeof step.title !== "string") {
          errors.push(`guideSteps[${idx}]: missing step title`);
        }
        if (!step.description || typeof step.description !== "string") {
          errors.push(`guideSteps[${idx}]: missing step description`);
        }
      });
    }

    // 5. 날짜 포맷 검증
    if (!item.lastUpdated || isNaN(Date.parse(item.lastUpdated))) {
      errors.push("Field 'lastUpdated' must be a valid ISO date string");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 검증 결과 및 자체 재시도/폴백(Self-Correction) 로직 수행
   * @param {Object} item - 파싱된 카탈로그 항목
   * @param {Object} target - 원본 대상 설정
   * @param {Object} parserAgent - 파서 에이전트 인스턴스
   * @returns {Object} 검증 통과된 최종 안전 카탈로그 항목
   */
  ensureVerifiedItem(item, target, parserAgent) {
    const check = this.verifyItem(item);
    if (check.isValid) {
      return { item, isVerified: true, isCorrected: false, errors: [] };
    }

    // [자체 오류 인지 및 재시도(Self-Correction)]
    console.warn(
      `[FormalVerifier Warning] Validation failed for target '${target.id}':`,
      check.errors
    );
    console.warn(`[FormalVerifier] Triggering Fallback Extraction strategy for '${target.id}'...`);

    // 파서 에이전트에 자가 치유(Fallback Extraction) 명령
    const correctedItem = parserAgent.buildCatalogItemFromFallback(
      target,
      `VERIFICATION_FAILED_RETRY: ${check.errors.join("; ")}`
    );

    const recheck = this.verifyItem(correctedItem);
    if (!recheck.isValid) {
      throw new Error(
        `[FormalVerifier Fatal] Secondary fallback verification failed for '${target.id}': ${recheck.errors.join(", ")}`
      );
    }

    return {
      item: correctedItem,
      isVerified: true,
      isCorrected: true,
      errors: check.errors,
    };
  }
}
