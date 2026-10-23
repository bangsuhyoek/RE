/**
 * 해지 후 결제 발생 시 소비자가 직접 제출할 수 있는 상담·신고서 초안 생성
 * - 1372 소비자상담센터 (한국소비자원 피해구제 연계)
 * - 공정거래위원회 불공정거래(전자상거래법 위반) 온라인 신고
 *
 * 주의: 꾸독/SubMate는 절대 사용자를 대리하여 접수/신고하지 않으며,
 * 사용자가 내용을 확인하고 복사하여 직접 제출할 수 있도록 돕습니다.
 */

export const SUBMIT_URLS = {
  ccn1372: "https://www.ccn.go.kr",
  ftcReport: "https://www.ftc.go.kr/www/contents.do?key=372",
};

/**
 * 금액을 한국어 원화 표기 (예: "17,000원")로 변환
 */
export function formatWonKR(amount) {
  if (amount == null) return null;
  return `${Number(amount || 0).toLocaleString("ko-KR")}원`;
}

/**
 * 날짜 객체 또는 ISO 문자열을 KST 기준 "YYYY년 M월 D일 HH:mm" 형식으로 변환
 * 유효하지 않거나 없으면 null 반환
 */
export function formatKSTDateTime(dateVal) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;

  // KST = UTC+9
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 3600000);

  const year = kst.getFullYear();
  const month = kst.getMonth() + 1;
  const day = kst.getDate();
  const hours = String(kst.getHours()).padStart(2, "0");
  const minutes = String(kst.getMinutes()).padStart(2, "0");

  return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
}

/**
 * 결제수단 표현 안전 정규화
 */
function resolvePaymentMethod(paymentMethod) {
  if (!paymentMethod) return "[결제수단]";
  if (typeof paymentMethod === "string") {
    const trimmed = paymentMethod.trim();
    return trimmed || "[결제수단]";
  }
  if (typeof paymentMethod === "object") {
    const issuer = paymentMethod.issuer || paymentMethod.type || "";
    const last4 = paymentMethod.last4 || "";
    const res = [issuer, last4].filter(Boolean).join(" ");
    return res || "[결제수단]";
  }
  return "[결제수단]";
}

/**
 * 1372 소비자상담센터 상담 신청 초안 생성
 * @param {Object} params
 * @param {string} [params.serviceName]
 * @param {Object} [params.subscription]
 * @param {number} [params.amount]
 * @param {string|Date} [params.cancelledAt]
 * @param {string|Date} [params.chargedAt]
 * @param {string|Object} [params.paymentMethod]
 * @param {Object|null} [params.proof]
 * @returns {{ title: string, body: string, submitUrl: string, submitLabel: string, tips: string[] }}
 */
export function build1372Draft({
  serviceName,
  subscription,
  amount,
  cancelledAt,
  chargedAt,
  paymentMethod,
  proof = null,
} = {}) {
  const service = serviceName || subscription?.name || "[서비스명]";
  const resolvedAmount =
    amount != null
      ? formatWonKR(amount)
      : subscription?.amount != null
      ? formatWonKR(subscription.amount)
      : "[결제 금액]";
  const cancelledTimeStr = formatKSTDateTime(cancelledAt || proof?.cancelledAt) || "[해지 일시]";
  const chargedTimeStr = formatKSTDateTime(chargedAt) || "[결제 일시]";
  const methodStr = resolvePaymentMethod(paymentMethod || subscription?.paymentMethod);

  const hasProofImage = Boolean(proof?.imageDataUrl);
  const proofText = hasProofImage
    ? "해지 완료 화면 캡처 보유 (기기 내 보관 중)"
    : "해지 완료 시각 기록 보유";

  const title = `[소비자상담] ${service} 해지 완료 후 무단 결제 피해 구제 요청`;

  const body = [
    `1. 상담 신청 개요`,
    `- 대상 서비스(사업자): ${service}`,
    `- 피해 유형: 구독 해지 완료 후 무단 결제 (청약철회/해지 효력 미반영)`,
    `- 결제 금액: ${resolvedAmount}`,
    `- 결제 일시: ${chargedTimeStr}`,
    `- 결제 수단: ${methodStr}`,
    ``,
    `2. 해지 경과 및 사실 관계`,
    `- 해지 완료 일시: ${cancelledTimeStr}`,
    `- 증빙 보유 여부: ${proofText}`,
    `- 내용: 위 일시에 해당 서비스의 해지 절차를 정상 완료하였음에도 불구하고, 이후 ${chargedTimeStr}에 사전 동의 없이 ${resolvedAmount}이 추가 결제되었습니다.`,
    ``,
    `3. 법적 근거 및 요청 사항`,
    `- 소비자기본법상 소비자 피해구제 원칙 및 전자상거래법 규정에 따라 부당하게 청구된 결제 금액 전액의 즉시 환불 및 추가 자동결제 중단을 요청합니다.`,
    `- 사업자 측의 자진 시정이 이루어지지 않을 경우 한국소비자원 피해구제 및 분쟁조정 절차 연계를 희망합니다.`,
  ].join("\n");

  const tips = [
    "1372 누리집(ccn.go.kr) 접속 후 '상담신청' 메뉴에 복사한 내용을 붙여 넣으세요.",
    "소비자상담 후 원만한 합의가 되지 않으면 한국소비자원 피해구제로 바로 이관할 수 있습니다.",
    "보유 중인 해지 화면 캡처 이미지를 상담 신청 첨부파일로 함께 등록하면 처리가 훨씬 빠릅니다.",
  ];

  return {
    title,
    body,
    submitUrl: SUBMIT_URLS.ccn1372,
    submitLabel: "1372 소비자상담센터 바로가기",
    tips,
  };
}

/**
 * 공정거래위원회 전자상거래법 위반 신고서 초안 생성
 * @param {Object} params
 * @param {string} [params.serviceName]
 * @param {Object} [params.subscription]
 * @param {number} [params.amount]
 * @param {string|Date} [params.cancelledAt]
 * @param {string|Date} [params.chargedAt]
 * @param {string|Object} [params.paymentMethod]
 * @param {Object|null} [params.proof]
 * @param {string} [params.darkPatternNotes]
 * @returns {{ title: string, body: string, submitUrl: string, submitLabel: string, tips: string[] }}
 */
export function buildFtcReportDraft({
  serviceName,
  subscription,
  amount,
  cancelledAt,
  chargedAt,
  paymentMethod,
  proof = null,
  darkPatternNotes = null,
} = {}) {
  const service = serviceName || subscription?.name || "[피신고인(서비스명)]";
  const resolvedAmount =
    amount != null
      ? formatWonKR(amount)
      : subscription?.amount != null
      ? formatWonKR(subscription.amount)
      : "[결제 금액]";
  const cancelledTimeStr = formatKSTDateTime(cancelledAt || proof?.cancelledAt) || "[해지 일시]";
  const chargedTimeStr = formatKSTDateTime(chargedAt) || "[결제 일시]";
  const methodStr = resolvePaymentMethod(paymentMethod || subscription?.paymentMethod);

  const hasProofImage = Boolean(proof?.imageDataUrl);
  const proofText = hasProofImage
    ? "해지 완료 화면 캡처 파일 보유"
    : "해지 완료 시각 및 결제 내역 증빙 보유";

  const title = `[불공정거래 신고] ${service}의 전자상거래법 위반(해지 방해 및 해지 후 대금 청구)`;

  const darkPatternSection = darkPatternNotes
    ? `- 다크패턴 의심 정황: ${darkPatternNotes}\n`
    : "";

  const body = [
    `1. 사건 개요 및 피신고인`,
    `- 피신고인(서비스/회사): ${service}`,
    `- 신고 취지: 소비자의 정당한 계약 해지 후 무단 결제 및 계약 해지 방해 행위 신고`,
    `- 피해 금액: ${resolvedAmount}`,
    `- 결제 수단: ${methodStr}`,
    ``,
    `2. 구체적 위반 행위 사실`,
    `- 해지 완료 일시: ${cancelledTimeStr}`,
    `- 부당 결제 일시: ${chargedTimeStr}`,
    `- 사실 관계: 신고인은 ${cancelledTimeStr}에 해당 서비스의 계약 해지 의사를 표시하고 절차를 완료하였습니다. 그러나 피신고인은 해지 효력을 즉시 반영하지 않고 ${chargedTimeStr}에 ${resolvedAmount}을 무단 결제 청구하였습니다.`,
    darkPatternSection +
    `- 입증 자료: ${proofText}`,
    ``,
    `3. 법 위반 사항`,
    `- 전자상거래 등에서의 소비자보호에 관한 법률상 소비자의 청약철회 및 계약 해지 방해 금지 위반 (전자상거래법 다크패턴 규제, 2025년 2월 시행)`,
    `- 정당한 이유 없이 계약 해지를 지연시키거나 계약 종료 후 대금을 부당 청구한 행위에 대한 조사 및 시정명령을 요청합니다.`,
  ].join("\n");

  const tips = [
    "공정거래위원회 누리집(ftc.go.kr)의 '국민신문고에 신고하기' 또는 사건신고 접수 페이지를 이용하세요.",
    "공정위 신고는 개별 피해 환불 명령보다는 위법 행위에 대한 시정명령·과태료 처분 중심이므로, 환불이 급한 경우 1372 소비자상담을 함께 병행하시는 것을 권장합니다.",
    "보유 중인 해지 완료 화면 캡처와 결제 승인 내역을 입증 자료로 첨부하세요.",
  ];

  return {
    title,
    body,
    submitUrl: SUBMIT_URLS.ftcReport,
    submitLabel: "공정거래위원회 신고 페이지 바로가기",
    tips,
  };
}
