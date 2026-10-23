// 공동 구독 정산 알림 순수 로직 모듈
import { calculateEqualShare } from "./subscriptionAdd.js";
import { getNextChargeDate, daysUntilCharge, formatWon } from "./dates.js";

/**
 * 10자리 이상 연속된 숫자를 '***'로 가립니다.
 * 법적 이유(결제·송금 관여 금지) 및 계좌·카드번호 노출 방지를 위해 사용합니다.
 */
function maskLongDigits(text = "") {
  // 하이픈·공백·점으로 끊은 계좌·전화번호(예: 110-123-456789, 010-1234-5678)도 숫자만 세어 10자리 이상이면 가린다.
  return String(text).replace(/\d(?:[\s.-]*\d){9,}/g, "***");
}

/**
 * 공유가 활성화되어 있고 2인 이상이며 해지되지 않은 구독 목록을 반환합니다.
 */
export function getSharedSubscriptions(subscriptions = []) {
  if (!Array.isArray(subscriptions)) return [];
  return subscriptions.filter(
    (sub) =>
      Boolean(sub?.sharingEnabled) &&
      Number(sub?.shareCount) > 1 &&
      sub?.status !== "cancelled"
  );
}

/**
 * 특정 공동 구독에 대한 정산 요청 정보를 생성합니다.
 */
export function buildSettlementRequest(subscription, { now = new Date(), memo = "" } = {}) {
  const members = Number(subscription?.shareCount) || 1;
  const others = Math.max(0, members - 1);

  const amount = Number(subscription?.amount) || 0;
  const total =
    subscription?.grossAmount != null
      ? Number(subscription.grossAmount)
      : amount * members;

  const perPerson = calculateEqualShare(total, members);
  const chargeDate = getNextChargeDate(subscription, now);

  const month = chargeDate.getMonth() + 1;
  const day = chargeDate.getDate();

  const planText = subscription?.plan ? ` ${subscription.plan}` : "";
  const title = `[꾸독 정산] ${subscription?.name || "구독"} 정산 요청`;

  let message = `[꾸독 정산] ${subscription?.name || "구독"}${planText}
${month}월 ${day}일 결제 ${formatWon(total)} ÷ ${members}명
1인 ${formatWon(perPerson)} 보내 주세요.`;

  if (memo && String(memo).trim()) {
    const safeMemo = maskLongDigits(String(memo).trim());
    message += `\n${safeMemo}`;
  }

  return {
    subscriptionId: subscription?.subscriptionId,
    perPerson,
    total,
    members,
    others,
    chargeDate,
    title,
    message,
  };
}

/**
 * 결제일이 0~withinDays일 남은 공동 구독의 정산 요청 배열을 반환합니다.
 */
export function getSettlementDue(subscriptions = [], { now = new Date(), withinDays = 1 } = {}) {
  const shared = getSharedSubscriptions(subscriptions);
  return shared
    .filter((sub) => {
      const days = daysUntilCharge(sub, now);
      return days >= 0 && days <= withinDays;
    })
    .map((sub) => buildSettlementRequest(sub, { now }));
}

/**
 * Web Share API 및 클립보드 복사용 공유 타깃 객체를 생성합니다.
 */
export function buildShareTarget(request) {
  const title = request?.title || "[꾸독 정산] 정산 요청";
  const text = request?.message || "";
  return {
    title,
    text,
    fallbackText: text,
  };
}
