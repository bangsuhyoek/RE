import { supabase } from "./supabase.js";
import { readStoredValue, writeStoredValue } from "./storage.js";

export const DIFFICULTY_CONSENT_KEY = "submate-mvp:difficulty-consent";
export const DIFFICULTY_SUBMITTED_KEY = "submate-mvp:difficulty-submitted";
export const APP_VERSION = "1.0.0";

/**
 * 해지 난이도 익명 공유 동의 확인
 * - 로그인한 사용자 기준(userId 일치)으로 동의 여부를 확인합니다.
 * - 기본값은 OFF(null/false)입니다.
 */
export function readDifficultyConsent(userId) {
  if (!userId) return null;
  const consent = readStoredValue(DIFFICULTY_CONSENT_KEY, null);
  return consent?.userId === userId ? consent : null;
}

/**
 * 해지 난이도 익명 공유 동의 저장
 */
export function grantDifficultyConsent(userId) {
  if (!userId) return null;
  const record = {
    userId,
    grantedAt: new Date().toISOString(),
    version: APP_VERSION,
  };
  writeStoredValue(DIFFICULTY_CONSENT_KEY, record);
  return record;
}

/**
 * 해지 난이도 익명 공유 동의 철회
 */
export function revokeDifficultyConsent(userId) {
  if (!userId) return false;
  const current = readStoredValue(DIFFICULTY_CONSENT_KEY, null);
  if (current?.userId === userId) {
    writeStoredValue(DIFFICULTY_CONSENT_KEY, null);
    return true;
  }
  return false;
}

/**
 * 해지 진행 세션 생성
 * - 시작 시간과 단계 수를 추적합니다.
 */
export function createCancelSession({ serviceId = "", stepsTotal = 0, startedAt = Date.now() } = {}) {
  return {
    serviceId: String(serviceId || "").slice(0, 64),
    stepsTotal: Math.max(0, Math.min(50, Math.round(Number(stepsTotal) || 0))),
    stepsCount: 0,
    startedAt: typeof startedAt === "number" ? startedAt : new Date(startedAt).getTime(),
    incrementStep() {
      this.stepsCount = Math.min(50, this.stepsCount + 1);
      return this.stepsCount;
    },
  };
}

/**
 * 해지 소요 시간을 10초 단위로 반올림하고 0~7200초 범위로 제한합니다.
 */
export function roundDurationTo10s(seconds) {
  const s = Math.max(0, Math.min(7200, Math.round(Number(seconds) || 0)));
  return Math.min(7200, Math.round(s / 10) * 10);
}

/**
 * 사용자 응답과 세션 데이터를 기반으로 DB 저장용 순수 행(row)을 구성합니다.
 * - user_id 및 개인 식별 정보는 일체 포함하지 않습니다.
 * - created_on은 YYYY-MM-DD 날짜 문자열(시간 배제)입니다.
 */
export function buildDifficultyReport(session = {}, answers = {}, now = new Date()) {
  const rawDuration = session.startedAt
    ? Math.max(0, Math.floor(((now instanceof Date ? now.getTime() : new Date(now).getTime()) - session.startedAt) / 1000))
    : (Number(answers.durationSec) || 0);

  const stepsCount = session.stepsCount != null
    ? session.stepsCount
    : (Number(answers.stepsCount) || 0);

  const nowDate = now instanceof Date ? now : new Date(now);
  const year = nowDate.getFullYear();
  const month = String(nowDate.getMonth() + 1).padStart(2, "0");
  const day = String(nowDate.getDate()).padStart(2, "0");
  const createdOn = `${year}-${month}-${day}`;

  const difficulty = Math.max(1, Math.min(5, Math.round(Number(answers.difficulty) || 3)));
  const outcome = answers.outcome === "gave_up" ? "gave_up" : "cancelled";

  return {
    service_id: String(session.serviceId || answers.serviceId || "").slice(0, 64),
    steps_count: Math.max(0, Math.min(50, Math.round(Number(stepsCount) || 0))),
    duration_sec: roundDurationTo10s(rawDuration),
    phone_only: Boolean(answers.phoneOnly),
    retention_offer_shown: Boolean(answers.retentionOfferShown),
    hidden_menu: Boolean(answers.hiddenMenu),
    forced_survey_or_chat: Boolean(answers.forcedSurveyOrChat),
    difficulty,
    outcome,
    app_version: String(answers.appVersion || APP_VERSION).slice(0, 20),
    created_on: createdOn,
  };
}

/**
 * 점수 산정 공식 (SQL get_cancel_difficulty_scores와 동일)
 * - avg_difficulty (1-5): 40점 비중 ( (avg - 1) * 10 )
 * - 다크패턴 비율:
 *   - phone_only_rate: 20점
 *   - hidden_menu_rate: 15점
 *   - retention_offer_rate: 10점
 *   - forced_survey_rate: 15점
 * - gave_up_rate: 10점
 * - median_steps (3~10단계 초과분): 5점
 * - median_duration_sec (60~600초 초과분): 5점
 * - 총합 0~100 clamp
 */
export function computeDifficultyScore(aggregate = {}) {
  const avgDifficulty = Math.max(1, Math.min(5, Number(aggregate.avg_difficulty ?? aggregate.avgDifficulty) || 1));
  const phoneOnlyRate = Math.max(0, Math.min(1, Number(aggregate.phone_only_rate ?? aggregate.phoneOnlyRate) || 0));
  const hiddenMenuRate = Math.max(0, Math.min(1, Number(aggregate.hidden_menu_rate ?? aggregate.hiddenMenuRate) || 0));
  const retentionOfferRate = Math.max(0, Math.min(1, Number(aggregate.retention_offer_rate ?? aggregate.retentionOfferRate) || 0));
  const forcedSurveyRate = Math.max(0, Math.min(1, Number(aggregate.forced_survey_rate ?? aggregate.forcedSurveyRate) || 0));
  const gaveUpRate = Math.max(0, Math.min(1, Number(aggregate.gave_up_rate ?? aggregate.gaveUpRate) || 0));

  const medianSteps = Math.max(0, Number(aggregate.median_steps ?? aggregate.medianSteps) || 0);
  const medianDurationSec = Math.max(0, Number(aggregate.median_duration_sec ?? aggregate.medianDurationSec) || 0);

  const stepsBonus = (Math.max(0, Math.min(10, medianSteps - 3)) / 7.0) * 5.0;
  const durationBonus = (Math.max(0, Math.min(600, medianDurationSec - 60)) / 540.0) * 5.0;

  const raw = (avgDifficulty - 1.0) * 10.0
    + phoneOnlyRate * 20.0
    + hiddenMenuRate * 15.0
    + retentionOfferRate * 10.0
    + forcedSurveyRate * 15.0
    + gaveUpRate * 10.0
    + stepsBonus
    + durationBonus;

  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * 점수 구간별 레이블
 * 0~29: 쉬움
 * 30~54: 보통
 * 55~74: 어려움
 * 75~100: 매우 어려움
 */
export function difficultyLabel(score) {
  const s = Math.round(Number(score) || 0);
  if (s < 30) return "쉬움";
  if (s < 55) return "보통";
  if (s < 75) return "어려움";
  return "매우 어려움";
}

/**
 * 해지 난이도 보고서 서버 제출
 * - 미동의, 미로그인, Supabase 미설정 시 안전하게 { skipped: true, reason: ... } 반환
 * - 동일 서비스에 대해 당일(created_on) 이미 제출한 기록이 있으면 중복 방지: { skipped: true, reason: "duplicate" } 반환
 */
export async function submitDifficultyReport(row, { userId } = {}) {
  if (!userId) {
    return { skipped: true, reason: "NOT_LOGGED_IN" };
  }
  if (!readDifficultyConsent(userId)) {
    return { skipped: true, reason: "NO_CONSENT" };
  }

  const serviceId = row?.service_id || "";
  const createdOn = row?.created_on || new Date().toISOString().slice(0, 10);
  const dedupeKey = serviceId + "@" + createdOn;
  const submittedHistory = readStoredValue(DIFFICULTY_SUBMITTED_KEY, []);
  const historyList = Array.isArray(submittedHistory) ? submittedHistory : [];
  if (historyList.includes(dedupeKey)) {
    return { skipped: true, reason: "duplicate" };
  }

  if (!supabase) {
    return { skipped: true, reason: "SUPABASE_NOT_CONFIGURED" };
  }

  try {
    const { error } = await supabase
      .from("cancel_difficulty_reports")
      .insert([row]);

    if (error) {
      if (error.code === "23505" || String(error.message || "").includes("23505")) {
        const nextHistory = [...historyList, dedupeKey];
        writeStoredValue(DIFFICULTY_SUBMITTED_KEY, nextHistory);
        return { skipped: true, reason: "duplicate" };
      }
      console.warn("submitDifficultyReport error:", error);
      return { skipped: false, success: false, error: error.message };
    }
    const nextHistory = [...historyList, dedupeKey];
    writeStoredValue(DIFFICULTY_SUBMITTED_KEY, nextHistory);
    return { skipped: false, success: true };
  } catch (err) {
    if (err?.code === "23505" || String(err?.message || "").includes("23505")) {
      const nextHistory = [...historyList, dedupeKey];
      writeStoredValue(DIFFICULTY_SUBMITTED_KEY, nextHistory);
      return { skipped: true, reason: "duplicate" };
    }
    console.warn("submitDifficultyReport exception:", err);
    return { skipped: false, success: false, error: err.message };
  }
}

/**
 * 인메모리 캐시 (10분 만료)
 */
const scoreCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

export function clearDifficultyScoreCache() {
  scoreCache.clear();
}

/**
 * 서비스별 해지 난이도 집계 점수 조회
 * - cancel_difficulty_scores 뷰에서 조회 (k >= 5)
 * - 10분간 메모리 캐시 유지
 */
export async function fetchDifficultyScore(serviceId) {
  if (!serviceId) return null;
  const key = String(serviceId).toLowerCase();
  const cached = scoreCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("cancel_difficulty_scores")
      .select("*")
      .eq("service_id", serviceId)
      .maybeSingle();

    if (error) {
      console.warn("fetchDifficultyScore error:", error);
      return null;
    }

    const result = data || null;
    scoreCache.set(key, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.warn("fetchDifficultyScore exception:", err);
    return null;
  }
}

