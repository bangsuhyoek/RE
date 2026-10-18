export const ALLOWED_KINDS = [
  "nav",
  "cancel",
  "retention_continue",
  "final",
  "login",
  "none",
];

const CANCEL_UPGRADE_KEYWORDS = [
  "해지",
  "취소",
  "종료",
  "탈퇴",
  "해제",
  "포기",
  "예약",
  "확정",
  "완료",
  "cancel",
  "end",
  "terminate",
  "downgrade",
  "unsubscribe",
  "confirm",
  "finish",
];

const FORBIDDEN_TEXT_KEYWORDS = [
  "탈퇴",
  "delete account",
  "계정 삭제",
  "로그아웃",
  "logout",
  "결제수단",
  "payment method",
];

/**
 * Masks emails, sequences of 4+ digits (card/phone/order numbers),
 * and Korean name patterns like "OOO님" -> "회원님".
 */
export function scrub(text) {
  if (typeof text !== "string") return "";
  let out = text;
  out = out.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]");
  out = out.replace(/\d{4,}/g, "[NUM]");
  out = out.replace(/[가-힣a-zA-Z0-9OㅇXx]{1,5}님/g, "회원님");
  return out;
}

/**
 * Validates and clamps request body.
 * Returns { valid: boolean, value?: object }
 */
export function validateAndClamp(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false };
  }

  const { serviceName, host, pageTitle, history, elements } = body;

  if (typeof serviceName !== "string" || !serviceName.trim() || serviceName.length > 60) {
    return { valid: false };
  }

  if (typeof host !== "string" || !host.trim() || host.length > 100) {
    return { valid: false };
  }
  const hostTrimmed = host.trim();
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(hostTrimmed)) {
    return { valid: false };
  }

  if (typeof pageTitle !== "string" || pageTitle.length > 80) {
    return { valid: false };
  }

  if (!Array.isArray(history) || history.length > 10) {
    return { valid: false };
  }
  for (const item of history) {
    if (typeof item !== "string" || item.length > 60) {
      return { valid: false };
    }
  }

  if (!Array.isArray(elements) || elements.length < 1 || elements.length > 60) {
    return { valid: false };
  }

  const clampedElements = [];
  const seenIndices = new Set();
  for (const el of elements) {
    if (!el || typeof el !== "object" || Array.isArray(el)) {
      return { valid: false };
    }
    const { i, text, role, tag, inDialog } = el;
    if (typeof i !== "number" || !Number.isInteger(i) || seenIndices.has(i)) {
      return { valid: false };
    }
    seenIndices.add(i);

    if (typeof text !== "string" || text.length > 60) {
      return { valid: false };
    }
    if (typeof role !== "string" || role.length > 20) {
      return { valid: false };
    }
    if (typeof tag !== "string" || tag.length > 12) {
      return { valid: false };
    }
    if (typeof inDialog !== "boolean") {
      return { valid: false };
    }

    clampedElements.push({
      i,
      text: scrub(text.trim()),
      role: role.trim(),
      tag: tag.trim(),
      inDialog,
    });
  }

  return {
    valid: true,
    value: {
      serviceName: scrub(serviceName.trim()),
      host: hostTrimmed,
      pageTitle: scrub(pageTitle.trim()),
      history: history.map((h) => scrub(h.trim())),
      elements: clampedElements,
    },
  };
}

export const cancelNextStepResponseSchema = {
  type: "OBJECT",
  properties: {
    index: {
      type: "INTEGER",
      description: "The index i of the chosen element, or null if none/login.",
      nullable: true,
    },
    kind: {
      type: "STRING",
      enum: ["nav", "cancel", "retention_continue", "final", "login", "none"],
      description: "The action kind classification.",
    },
    confidence: {
      type: "NUMBER",
      description: "Confidence level between 0.0 and 1.0.",
    },
  },
  required: ["kind", "confidence"],
};

export function buildPrompt(input) {
  const elementsText = input.elements
    .map(
      (el) =>
        "- index: " + el.i + ", tag: <" + el.tag + ">, role: \"" + el.role + "\", text: \"" + el.text + "\", inDialog: " + el.inDialog
    )
    .join("\n");

  const historyText =
    input.history && input.history.length > 0
      ? input.history.map((h, idx) => (idx + 1) + ". \"" + h + "\"").join(", ")
      : "(none)";

  return [
    "You are an automated assistant helping a user navigate the subscription cancellation flow for the service \"" + input.serviceName + "\".",
    "Goal: Reach and complete the subscription cancellation flow for \"" + input.serviceName + "\".",
    "",
    "Rules:",
    "1. Choose ONE element from the candidate elements to press next, returning its index 'i'.",
    "2. Prefer navigation towards account, settings, subscription, billing, membership, or cancel menus (e.g., '계정', '설정', '구독 관리', '멤버십', '해지').",
    "3. NEVER choose buttons for: logout ('로그아웃'), delete account ('회원탈퇴', '계정 삭제'), payment method change ('결제수단 변경'), upgrades, or retention/benefit keeping buttons ('유지하기', '혜택 받기', '계속 이용하기', '취소 철회').",
    "4. If the page is a login/sign-in page, return kind 'login' and index null.",
    "5. If no suitable element can be found or you are unsure, return kind 'none' and index null.",
    "6. Classify 'kind' as one of:",
    "   - 'nav': Menu or navigation item leading toward settings or subscription management.",
    "   - 'cancel': A button or link that directly starts or continues the cancellation process.",
    "   - 'retention_continue': An explicit 'continue cancelling' or 'give up benefits/offer' action on a retention screen (e.g., '혜택 포기하고 계속 해지', '해지 계속하기').",
    "   - 'final': The definitive final button that confirms and executes cancellation (e.g., '해지 신청', '해지 완료', '즉시 해지').",
    "   - 'login': The page requires user sign-in.",
    "   - 'none': No valid action found.",
    "",
    "Current host: " + input.host,
    "Page title: \"" + input.pageTitle + "\"",
    "Previously clicked elements in this session: " + historyText,
    "",
    "Candidate elements on the current screen:",
    elementsText,
    "",
    "Respond ONLY with a JSON object conforming to the required schema: { index: integer|null, kind: string, confidence: number }.",
  ].join("\n");
}

export function normalize(modelOutput, input) {
  let parsed = modelOutput;
  if (typeof modelOutput === "string") {
    const match = modelOutput.match(/\{[\s\S]*\}/);
    try {
      parsed = match ? JSON.parse(match[0]) : null;
    } catch {
      parsed = null;
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return { index: null, kind: "none", confidence: 0 };
  }

  let kind = typeof parsed.kind === "string" ? parsed.kind.toLowerCase().trim() : "none";
  if (!ALLOWED_KINDS.includes(kind)) {
    kind = "none";
  }

  let confidence = typeof parsed.confidence === "number" && !Number.isNaN(parsed.confidence)
    ? parsed.confidence
    : 0;
  if (confidence < 0) confidence = 0;
  if (confidence > 1) confidence = 1;
  confidence = Math.round(confidence * 100) / 100;

  let index = parsed.index;
  if (index === undefined || index === null || typeof index !== "number" || !Number.isInteger(index)) {
    index = null;
  }

  if (kind === "login" || kind === "none") {
    return { index: null, kind, confidence };
  }

  if (index === null) {
    return { index: null, kind: "none", confidence };
  }

  const elements = input?.elements || [];
  const chosen = elements.find((el) => el.i === index);
  if (!chosen) {
    return { index: null, kind: "none", confidence };
  }

  const rawText = (chosen.text || "").toLowerCase();

  // Safety rule 1: If text contains forbidden terms (delete account, logout, payment method), reject to none
  for (const forbidden of FORBIDDEN_TEXT_KEYWORDS) {
    if (rawText.includes(forbidden.toLowerCase())) {
      return { index: null, kind: "none", confidence: 0 };
    }
  }

  // Safety rule 2: If model said nav, but element text contains cancel terms, upgrade to cancel
  if (kind === "nav") {
    const hasCancelTerm = CANCEL_UPGRADE_KEYWORDS.some((kw) =>
      rawText.includes(kw.toLowerCase())
    );
    if (hasCancelTerm) {
      kind = "cancel";
    }
  }

  return { index, kind, confidence };
}
