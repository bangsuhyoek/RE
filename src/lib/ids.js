// 구독 고유 식별자 생성기
// crypto.randomUUID 지원 환경에서는 UUID 기반, 미지원 환경에서는 시간+순번+난수 폴백 사용

let fallbackCounter = 0;

export function createSubscriptionId(prefix = "manual") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return `${prefix}-${crypto.randomUUID()}`;
    } catch {
      // ignore and use fallback
    }
  }

  const timestamp = Date.now();
  fallbackCounter = (fallbackCounter + 1) % 10000;
  const counterStr = String(fallbackCounter).padStart(4, "0");
  const randomStr = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${counterStr}-${randomStr}`;
}
