/**
 * 꾸독 에이전트 AI 해석 보조
 * Gemini는 "무엇을 원하는지(intent)"와 "어떤 구독인지(subscriptionId)"만 고른다.
 * 실제 판단·행동은 규칙 기반 도구와 사용자 승인 카드가 맡는다.
 */
export const INTERPRETABLE_INTENTS = ["cancel_refund", "cancel", "refund", "upcoming", "unknown"];

export function buildInterpretationPrompt(text, services = []) {
  const list = services.map((service) => "- " + service.id + ": " + service.name).join("\n") || "- (없음)";
  return [
    "당신은 구독 관리 앱 '꾸독'의 요청 분류기입니다.",
    "사용자 문장을 읽고 아래 JSON 하나만 출력하세요. 설명은 쓰지 마세요.",
    '{"intent": "cancel_refund|cancel|refund|upcoming|unknown", "subscriptionId": "목록의 id 또는 null"}',
    "- cancel_refund: 해지와 환불을 모두 원함",
    "- cancel: 해지만 원함",
    "- refund: 환불만 원함",
    "- upcoming: 곧 결제될 구독이나 결제 예정을 묻는 경우",
    "- unknown: 위에 해당하지 않음",
    "subscriptionId는 반드시 아래 목록의 id 중 하나이거나 null이어야 합니다.",
    "사용자 구독 목록:",
    list,
    "사용자 문장: " + JSON.stringify(String(text).slice(0, 300)),
  ].join("\n");
}

export function normalizeInterpretation(raw, services = []) {
  let value = raw;
  if (typeof raw === "string") {
    const match = raw.match(/\{[\s\S]*\}/);
    try {
      value = match ? JSON.parse(match[0]) : null;
    } catch {
      value = null;
    }
  }
  const intent = INTERPRETABLE_INTENTS.includes(value?.intent) ? value.intent : "unknown";
  const allowedIds = new Set(services.map((service) => service.id));
  const subscriptionId = typeof value?.subscriptionId === "string" && allowedIds.has(value.subscriptionId)
    ? value.subscriptionId
    : null;
  return { intent, subscriptionId };
}

