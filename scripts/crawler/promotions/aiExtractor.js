/**
 * Gemini 기반 하이브리드 프로모션 추출기 (Fallback)
 *
 * 1차 규칙 기반 매칭(matchClaim)에서 CHANGED 또는 NOT_FOUND가 발생했을 때,
 * 정상 수집된 페이지 본문(PageState.OK)을 바탕으로 현재 유효한 프로모션 조건을 추출한다.
 *
 * 환각(Hallucination) 방지를 위해:
 * 1. evidenceQuote가 실제 페이지 원문에 그대로 존재하는지 검증(verifyEvidenceQuote)
 * 2. 할인가(offerPrice) < 정가(originalPrice) 및 마감일 유효성 검증(validateUpdatedOffer)
 */

import { normalizeText } from "./offerExtractor.js";

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-3.5-flash-lite"];

function collapseWhitespace(text) {
  return normalizeText(text).replace(/\s+/g, " ").trim();
}

/**
 * AI가 제시한 근거 인용구(evidenceQuote)가 실제 페이지 원문(pageText)에
 * 그대로 포함되어 있는지 검증한다. (최소 6자 이상)
 */
export function verifyEvidenceQuote(pageText, evidenceQuote) {
  const normalizedQuote = collapseWhitespace(evidenceQuote);
  if (!normalizedQuote || normalizedQuote.length < 6) return false;
  const normalizedPage = collapseWhitespace(pageText);
  return normalizedPage.includes(normalizedQuote);
}

/**
 * 추출된 프로모션 변경 후보가 자동 반영 안전 조건을 충족하는지 검증한다.
 */
export function validateUpdatedOffer(candidate, promotion = {}, { now = Date.now() } = {}) {
  if (!candidate || candidate.isActive !== true) {
    return { valid: false, reason: "OFFER_NOT_ACTIVE" };
  }

  const kind = String(candidate.kind ?? "").trim();
  const subtitle = String(candidate.subtitle ?? kind).trim();
  if (!kind) {
    return { valid: false, reason: "MISSING_KIND" };
  }

  const originalPrice = Number(candidate.originalPrice ?? promotion.originalPrice);
  const offerPrice = Number(candidate.offerPrice);
  if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
    return { valid: false, reason: "INVALID_ORIGINAL_PRICE" };
  }
  if (!Number.isFinite(offerPrice) || offerPrice < 0 || offerPrice >= originalPrice) {
    return { valid: false, reason: "UNSAFE_OFFER_PRICE" };
  }

  if (candidate.deadline) {
    const deadlineMs = Date.parse(String(candidate.deadline) + "T23:59:59.999+09:00");
    if (!Number.isFinite(deadlineMs) || deadlineMs < now) {
      return { valid: false, reason: "DEADLINE_ALREADY_PASSED" };
    }
  }

  const saving = originalPrice - offerPrice;
  const benefitPeriod = candidate.benefitPeriod
    ? String(candidate.benefitPeriod).trim()
    : promotion.benefitPeriod || "상시 진행 (공식 검증 완료)";

  return {
    valid: true,
    offer: {
      kind,
      subtitle,
      originalPrice,
      offerPrice,
      saving,
      benefitPeriod,
      ...(candidate.deadline ? { deadline: String(candidate.deadline) } : {}),
    },
  };
}

function buildExtractionPrompt(promotion, pageText) {
  const truncatedText = String(pageText ?? "").slice(0, 12000);
  return [
    "당신은 구독 서비스 공식 웹페이지에서 실제 진행 중인 할인·무료체험 프로모션 조건을 추출하는 검증기입니다.",
    "반드시 제공된 [페이지 본문]에 적힌 사실만 추출하고, 추측하거나 없는 문장을 지어내지 마세요.",
    "",
    `[대상 서비스]: ${promotion.title ?? promotion.id}`,
    `[기존 카탈로그 조건]: ${promotion.kind ?? ""} (정가: ${promotion.originalPrice ?? 0}원, 혜택가: ${promotion.offerPrice ?? 0}원)`,
    "",
    "아래 JSON 형식으로만 응답하세요:",
    JSON.stringify({
      isActive: true,
      kind: "요약 혜택명 (예: 1개월 0원 무료 체험)",
      subtitle: "보조 제목 (예: ₩0에 1개월 무료 체험)",
      offerPrice: 0,
      originalPrice: 11990,
      benefitPeriod: "가입 후 1개월",
      deadline: "YYYY-MM-DD 또는 null",
      evidenceQuote: "페이지 본문에 글자 그대로 존재하는 근거 문장 (최소 10자 이상 원문 그대로 복사)",
    }),
    "",
    "[페이지 본문]:",
    truncatedText,
  ].join("\n");
}

function parseJsonResponse(rawText) {
  const cleaned = String(rawText ?? "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

/**
 * Gemini API를 호출하여 변경된 혜택 정보를 추출하고 원문 인용구 및 안전 조건을 검증한다.
 */
export async function extractOfferWithAi(
  promotion,
  pageText,
  {
    apiKey = process.env.GEMINI_API_KEY,
    fetchImpl = globalThis.fetch,
    now = Date.now(),
    timeoutMs = 10000,
  } = {}
) {
  if (!apiKey || typeof fetchImpl !== "function") {
    return { confirmed: false, reason: "NO_API_KEY" };
  }
  if (!pageText || String(pageText).trim().length < 40) {
    return { confirmed: false, reason: "EMPTY_PAGE_TEXT" };
  }

  const prompt = buildExtractionPrompt(promotion, pageText);
  let parsed = null;
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetchImpl(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
          },
        }),
      });
      if (!res.ok) {
        lastError = `HTTP_${res.status}`;
        continue;
      }
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        lastError = "EMPTY_MODEL_OUTPUT";
        continue;
      }
      parsed = parseJsonResponse(rawText);
      break;
    } catch (err) {
      lastError = err?.name === "AbortError" ? "AI_TIMEOUT" : String(err?.message ?? err);
    } finally {
      clearTimeout(timer);
    }
  }

  if (!parsed) {
    return { confirmed: false, reason: lastError || "AI_EXTRACTION_FAILED" };
  }

  if (!verifyEvidenceQuote(pageText, parsed.evidenceQuote)) {
    return { confirmed: false, reason: "EVIDENCE_QUOTE_NOT_IN_PAGE" };
  }

  const validation = validateUpdatedOffer(parsed, promotion, { now });
  if (!validation.valid) {
    return { confirmed: false, reason: validation.reason };
  }

  return {
    confirmed: true,
    basis: "ai_hybrid",
    evidenceQuote: collapseWhitespace(parsed.evidenceQuote),
    updatedOffer: validation.offer,
  };
}
