/**
 * 프로모션 문구 추출/비교 (네트워크 없음, 순수 함수)
 *
 * 앱 카탈로그의 혜택 문구(예: "3개월 0원 무료 체험")를 조건으로 바꾸고,
 * 실제 페이지 텍스트에서 같은 조건이 적힌 문장을 찾는다.
 * 같은 종류의 조건이 다른 숫자로 적혀 있으면(3개월 → 1개월) 변경 후보로 보고한다.
 */

const DAY_PER_UNIT = { day: 1, week: 7, month: 30, year: 365 };

export function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200d\u2060\ufeff\u00ad]/g, "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function toNumber(raw) {
  return Number(String(raw).replace(/,/g, ""));
}

/** 가격(원/₩/만원/$), 기간(일/주/개월/년/첫 달), 퍼센트를 뽑는다. */
export function parseTerms(text) {
  const source = String(text ?? "");
  const prices = [];
  const usd = [];
  const durations = [];
  const percents = [];

  for (const m of source.matchAll(/[₩￦]\s*(\d[\d,]*(?:\.\d+)?)/g)) prices.push(toNumber(m[1]));
  for (const m of source.matchAll(/(?<![\d.,])(\d[\d,]*(?:\.\d+)?)\s*(만\s*)?원(?!하)/g)) {
    const value = toNumber(m[1]) * (m[2] ? 10000 : 1);
    prices.push(value);
  }
  for (const m of source.matchAll(/(?:US)?\$\s*(\d[\d,]*(?:\.\d+)?)/g)) usd.push(toNumber(m[1]));
  for (const m of source.matchAll(/(?<![\d.,])(\d[\d,]*(?:\.\d+)?)\s*(?:달러|USD)/gi)) usd.push(toNumber(m[1]));

  const addDuration = (n, unit) => durations.push({ n, unit, days: n * DAY_PER_UNIT[unit] });
  // "1개월 후 자동 결제", "1개월마다", "매 1개월" 같은 갱신·결제 주기는 혜택 기간이 아니므로 제외
  for (const m of source.matchAll(/(?<![\d.])(?<!매\s*)(\d{1,3})\s*(개월|달|주일?|일|년)(?!\s*마다)(?![가-힣]*\s*(?:전|후에?\s*자동))/g)) {
    const unit = { 개월: "month", 달: "month", 주: "week", 주일: "week", 일: "day", 년: "year" }[m[2]];
    // "10주년" 같은 기념 표기는 기간이 아님
    if (unit === "week" && source[m.index + m[0].length] === "년") continue;
    // "2026년", "15일"(날짜) 같은 달력 표기는 제외
    if (unit === "year" && Number(m[1]) > 10) continue;
    if (unit === "day" && /(?:\d|매)\s*[.\/월]\s*$/.test(source.slice(Math.max(0, m.index - 4), m.index))) continue;
    addDuration(Number(m[1]), unit);
  }
  for (const m of source.matchAll(/(첫|한)\s*달(?!\s*마다)/g)) addDuration(1, "month");
  for (const m of source.matchAll(/첫\s*해/g)) addDuration(1, "year");
  for (const m of source.matchAll(/\b(\d{1,3})[\s-]*(months?|weeks?|days?|years?)\b/gi)) {
    addDuration(Number(m[1]), m[2].toLowerCase().replace(/s$/, ""));
  }
  for (const m of source.matchAll(/\bfirst\s+(?:[a-z]+\s+)?(month|week|year)\b/gi)) addDuration(1, m[1].toLowerCase());
  for (const m of source.matchAll(/(?<![\d.])(\d{1,3}(?:\.\d+)?)\s*%/g)) percents.push(Number(m[1]));

  const free = FREE_PATTERN.test(source.replace(NOT_OFFER_FREE, " ")) || prices.includes(0) || usd.includes(0);
  return { prices, usd, durations, percents, free };
}

// 혜택으로서의 "무료"만 인정한다. 무료반품·무료배송·"무료로 시작하기"(무료 플랜 가입) 등은 제외.
const NOT_OFFER_FREE = /무료\s*(?:반품|배송|교환|반송|배달|로\s*시작|로\s*사용|로\s*가입|회원\s*가입|다운로드|상담|문의)|start (?:for )?free|sign up (?:for )?free|get started (?:for )?free|free (?:plan|shipping|returns?|download)/gi;
const FREE_PATTERN = /무료|공짜|\bfree\b/i;

/** 페이지 텍스트를 줄 단위 + 인접 2~3줄 묶음으로 나눈다. (가격과 기간이 줄바꿈으로 갈라지는 경우 대비) */
export function buildSegments(pageText, { maxLineLength = 400 } = {}) {
  const lines = normalizeText(pageText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.length > maxLineLength ? line.slice(0, maxLineLength) : line));
  const segments = [];
  const seen = new Set();
  const push = (text) => {
    if (!seen.has(text)) {
      seen.add(text);
      segments.push(text);
    }
  };
  lines.forEach((line, i) => {
    push(line);
    if (lines[i + 1]) push(line + " " + lines[i + 1]);
    if (lines[i + 1] && lines[i + 2]) push(line + " " + lines[i + 1] + " " + lines[i + 2]);
  });
  return segments;
}

const EDU_WORDS = ["학생", "교육", "교사", "student", "education", "educator", "teacher"];
const PAYBACK_WORDS = ["페이백", "캐시백", "돌려", "적립", "payback", "cashback"];
// 최종 가격만으로 확인할 때, 그 가격이 혜택(할인·특가·첫 결제 등) 맥락에 있는지 본다.
const PROMO_CONTEXT = /할인|특가|이벤트|프로모션|혜택가|첫\s*(?:달|해|결제|구독)|연간|\/\s*년|\boff\b|\bsave\b|\bfirst\b/i;
// "최소 결제가 100원" 같은 결제 규정 문구는 혜택 가격이 아님
const NOT_OFFER_PRICE_CONTEXT = /최소\s*결제/;

function stripParentheses(text) {
  return text.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * 카탈로그 항목의 혜택 문구를 검증 가능한 조건으로 바꾼다.
 * type: free | percent | price | payback | manual(자동 확인 불가)
 */
export function parseClaim(promotion, override = {}) {
  const headline = String(override.text ?? promotion.kind ?? promotion.subtitle ?? "");
  const primary = stripParentheses(headline);
  let terms = parseTerms(primary);
  const hasNumeric = (t) => t.durations.length || t.percents.length || t.prices.some((p) => p > 0) || t.usd.length;
  if (!hasNumeric(terms)) terms = parseTerms(headline);

  const lower = headline.toLowerCase();
  const keywordGroups = [...(override.keywords ?? [])];
  if (override.keywords === undefined && EDU_WORDS.some((w) => lower.includes(w))) keywordGroups.push(EDU_WORDS);

  const base = {
    headline,
    keywordGroups,
    requires: (override.requires ?? []).map((p) => new RegExp(p, "i")),
    free: false,
    duration: null,
    percent: null,
    prices: [],
    usd: [],
    offerPrice: Number(promotion.offerPrice) > 0 ? Number(promotion.offerPrice) : null,
  };

  if (override.type === "manual") return { ...base, type: "manual", reason: override.reason ?? "MANUAL_OVERRIDE" };

  if (override.patterns?.length) {
    return { ...base, type: "pattern", patterns: override.patterns.map((p) => new RegExp(p, "i")) };
  }

  if (PAYBACK_WORDS.some((w) => lower.includes(w))) {
    return {
      ...base,
      type: "payback",
      keywordGroups: [...keywordGroups, PAYBACK_WORDS],
      percent: terms.percents[0] ?? null,
    };
  }

  const paidPrices = terms.prices.filter((p) => p > 0);
  if (paidPrices.length || terms.usd.length) {
    return {
      ...base,
      type: "price",
      prices: paidPrices,
      usd: terms.usd,
      duration: terms.durations[0] ?? null,
    };
  }

  if (terms.percents.length && !(terms.percents[0] === 100 && terms.free)) {
    return { ...base, type: "percent", percent: terms.percents[0] };
  }

  if (terms.free && terms.durations.length) {
    return { ...base, type: "free", free: true, duration: terms.durations[0] };
  }

  if (terms.free && keywordGroups.length) {
    return { ...base, type: "free", free: true };
  }

  return { ...base, type: "manual", reason: "CLAIM_NOT_MACHINE_CHECKABLE" };
}

function sameDuration(a, b) {
  return Math.abs(a.days - b.days) <= 1;
}

function hasKeywords(segmentLower, groups) {
  return groups.every((group) => group.some((word) => segmentLower.includes(String(word).toLowerCase())));
}

function hasRequired(segment, claim) {
  return claim.requires.every((re) => re.test(segment));
}

function describe(claim) {
  if (claim.type === "pattern") return claim.patterns.map((p) => p.source).join(" & ");
  const parts = [];
  if (claim.free) parts.push("무료");
  if (claim.duration) parts.push(claim.duration.n + claim.duration.unit);
  if (claim.percent != null) parts.push(claim.percent + "%");
  claim.prices.forEach((p) => parts.push(p.toLocaleString("ko-KR") + "원"));
  claim.usd.forEach((p) => parts.push("$" + p));
  return parts.join(" + ");
}

/**
 * 페이지 텍스트에서 혜택 조건을 찾는다.
 * - confirmed: 모든 조건이 한 문장(또는 인접 줄 묶음)에 함께 있음
 * - variants: 같은 종류의 조건이 다른 숫자로 적힌 문장 (혜택 변경 후보)
 */
export function matchClaim(claim, pageText, { maxVariants = 3 } = {}) {
  const result = { confirmed: false, evidence: null, basis: null, variants: [], expected: describe(claim) };
  if (!claim || claim.type === "manual") return result;

  if (claim.type === "pattern") {
    const hit = shortest(
      buildSegments(pageText).filter(
        (s) => hasKeywords(s.toLowerCase(), claim.keywordGroups) && hasRequired(s, claim) && claim.patterns.every((re) => re.test(s))
      )
    );
    if (hit) Object.assign(result, { confirmed: true, evidence: hit, basis: "pattern" });
    return result;
  }

  const variants = [];
  const hits = [];
  for (const segment of buildSegments(pageText)) {
    const lower = segment.toLowerCase();
    if (!hasKeywords(lower, claim.keywordGroups) || !hasRequired(segment, claim)) continue;
    const t = parseTerms(segment);
    let ok = true;
    let variant = false;

    if (claim.free && !t.free) continue;
    if (claim.duration) {
      if (t.durations.some((d) => sameDuration(d, claim.duration))) {
        // ok
      } else if (t.durations.length && (claim.type === "free" || claim.type === "price")) {
        ok = false;
        variant = claim.type === "free" || t.prices.length > 0;
      } else ok = false;
    }
    if (claim.percent != null) {
      if (!t.percents.includes(claim.percent)) {
        ok = false;
        if (t.percents.length && claim.type === "percent" && /할인|절약|저렴|\boff\b|\bsave\b/i.test(segment)) variant = true;
      }
    }
    if (claim.prices.length && !claim.prices.every((p) => t.prices.includes(p))) {
      ok = false;
      if (
        claim.type === "price" &&
        t.prices.length &&
        (!claim.duration || t.durations.length) &&
        PROMO_CONTEXT.test(segment) &&
        !NOT_OFFER_PRICE_CONTEXT.test(segment)
      )
        variant = true;
    }
    if (claim.usd.length && !claim.usd.every((p) => t.usd.includes(p))) ok = false;
    if (claim.type === "payback" && claim.percent == null && !t.durations.length && !t.prices.length) {
      // 페이백 문구는 기간이나 금액이 함께 있어야 의미 있는 근거로 본다
      ok = ok && /첫|달|개월|이용권/.test(segment);
    }

    if (ok) {
      hits.push(segment);
      continue;
    }
    if (variant && variants.length < maxVariants && !variants.some((v) => segment.includes(v) || v.includes(segment))) {
      variants.push(segment);
    }
  }
  if (hits.length) return Object.assign(result, { confirmed: true, evidence: shortest(hits), basis: "claim" });

  // 할인율 대신 최종 가격만 적는 페이지(연간 이용권 등): 제시 가격이 보이면 근거로 인정
  if ((claim.type === "percent" || claim.type === "price") && claim.offerPrice) {
    const hit = shortest(
      buildSegments(pageText).filter(
        (s) =>
          hasRequired(s, claim) &&
          PROMO_CONTEXT.test(s) &&
          !NOT_OFFER_PRICE_CONTEXT.test(s) &&
          parseTerms(s).prices.includes(claim.offerPrice)
      )
    );
    if (hit) {
      result.confirmed = true;
      result.evidence = hit;
      result.basis = "offerPrice";
      return result;
    }
  }

  result.variants = variants;
  return result;
}

function shortest(list) {
  return list.length ? list.reduce((a, b) => (b.length < a.length ? b : a)) : null;
}

/**
 * 마감 표기를 찾는다. 없으면 null.
 * 예: "9월 30일에 종료", "2026.10.31까지", "2026. 9. 30.에 프로모션 종료", "2026년 9월 30일 23:59까지", "~ 2026.09.30"
 */
export function extractDeadline(text, { now = Date.now() } = {}) {
  const s = normalizeText(text);
  const kstNow = new Date(now + 9 * 3600000);
  const tail = String.raw`\s*(?:\([^)]*\)\s*)?(?:\d{1,2}\s*:\s*\d{2}\s*)?(?:까지|[^\n\d]{0,10}?(?:종료|마감))`;
  const m =
    s.match(new RegExp(String.raw`(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})\s*[.일]?` + tail)) ??
    s.match(/~\s*(20\d{2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})(?!\d)/) ??
    s.match(new RegExp(String.raw`()(\d{1,2})\s*월\s*(\d{1,2})\s*일` + tail));
  if (!m) return null;
  const year = m[1] ? Number(m[1]) : kstNow.getUTCFullYear();
  const date = year + "-" + String(m[2]).padStart(2, "0") + "-" + String(m[3]).padStart(2, "0");
  return Number.isNaN(Date.parse(date)) ? null : date;
}

/** "이후 ₩14,900/월", "월 9,900원" 같은 정가 표기를 뽑는다. */
export function extractMonthlyPrices(pageText) {
  const found = new Set();
  const text = normalizeText(pageText);
  for (const m of text.matchAll(/[₩￦]\s*(\d[\d,]*)\s*\/\s*(?:월|month|mo)/gi)) found.add(toNumber(m[1]));
  // 줄바꿈을 넘지 않고, 통화 표기(₩ 또는 원)가 있는 경우만 가격으로 본다 ("/월\n400GB" 오인 방지)
  const monthly = [/월[ \t]*[₩￦][ \t]*(\d[\d,]*)/g, /월[ \t]*(\d[\d,]*)[ \t]*원/g];
  for (const re of monthly) {
    for (const m of text.matchAll(re)) {
      const v = toNumber(m[1]);
      if (v >= 100) found.add(v);
    }
  }
  return [...found].filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
}
