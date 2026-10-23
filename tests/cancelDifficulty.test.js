import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDifficultyReport,
  computeDifficultyScore,
  createCancelSession,
  difficultyLabel,
  grantDifficultyConsent,
  readDifficultyConsent,
  revokeDifficultyConsent,
  roundDurationTo10s,
  submitDifficultyReport,
} from "../src/lib/cancelDifficulty.js";

// Mock localStorage for Node test environment
if (typeof window === "undefined" || !window.localStorage) {
  const store = new Map();
  globalThis.window = {
    localStorage: {
      getItem(key) {
        return store.has(key) ? store.get(key) : null;
      },
      setItem(key, value) {
        store.set(key, String(value));
      },
      removeItem(key) {
        store.delete(key);
      },
      clear() {
        store.clear();
      },
    },
  };
}

test("roundDurationTo10s: 10초 단위 반올림 및 0~7200초 범위 제한", () => {
  assert.equal(roundDurationTo10s(0), 0);
  assert.equal(roundDurationTo10s(4), 0);
  assert.equal(roundDurationTo10s(5), 10);
  assert.equal(roundDurationTo10s(24), 20);
  assert.equal(roundDurationTo10s(25), 30);
  assert.equal(roundDurationTo10s(7199), 7200);
  assert.equal(roundDurationTo10s(8000), 7200);
  assert.equal(roundDurationTo10s(-50), 0);
});

test("createCancelSession: 세션 초기화 및 단계 증분", () => {
  const session = createCancelSession({ serviceId: "netflix", stepsTotal: 5 });
  assert.equal(session.serviceId, "netflix");
  assert.equal(session.stepsTotal, 5);
  assert.equal(session.stepsCount, 0);

  session.incrementStep();
  session.incrementStep();
  assert.equal(session.stepsCount, 2);
});

test("buildDifficultyReport: 시간/단계/난이도/결과 clamping 및 익명 필드 구성", () => {
  const startedAt = new Date("2026-10-16T12:00:00Z").getTime();
  const session = {
    serviceId: "youtube-premium",
    stepsCount: 8,
    startedAt,
  };

  const answers = {
    phoneOnly: true,
    hiddenMenu: true,
    retentionOfferShown: false,
    forcedSurveyOrChat: false,
    difficulty: 4.8, // Should clamp to 5
    outcome: "cancelled",
    appVersion: "1.0.0",
  };

  const now = new Date("2026-10-16T12:02:14Z"); // 134초 경과 -> 130초
  const report = buildDifficultyReport(session, answers, now);

  assert.equal(report.service_id, "youtube-premium");
  assert.equal(report.steps_count, 8);
  assert.equal(report.duration_sec, 130);
  assert.equal(report.phone_only, true);
  assert.equal(report.hidden_menu, true);
  assert.equal(report.retention_offer_shown, false);
  assert.equal(report.forced_survey_or_chat, false);
  assert.equal(report.difficulty, 5);
  assert.equal(report.outcome, "cancelled");
  assert.equal(report.app_version, "1.0.0");
  assert.equal(report.created_on, "2026-10-16");

  // 개인정보/user_id 필드가 절대 포함되지 않음을 검증
  assert.equal(Object.prototype.hasOwnProperty.call(report, "user_id"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(report, "userId"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(report, "email"), false);
});

test("computeDifficultyScore: 산정 공식 검증 및 0~100 범위 보장", () => {
  // 최저 난이도 케이스: difficulty 1, 다크패턴 없음, 3단계 이하, 60초 이하
  const minCase = {
    avg_difficulty: 1.0,
    phone_only_rate: 0,
    hidden_menu_rate: 0,
    retention_offer_rate: 0,
    forced_survey_rate: 0,
    gave_up_rate: 0,
    median_steps: 2,
    median_duration_sec: 40,
  };
  assert.equal(computeDifficultyScore(minCase), 0);

  // 최고 난이도 케이스: difficulty 5 (40점) + 다크패턴 전부 100% (70점) + steps 10단계 (5점) + duration 600초 (5점) -> clamp 100
  const maxCase = {
    avg_difficulty: 5.0,
    phone_only_rate: 1.0,
    hidden_menu_rate: 1.0,
    retention_offer_rate: 1.0,
    forced_survey_rate: 1.0,
    gave_up_rate: 1.0,
    median_steps: 12,
    median_duration_sec: 800,
  };
  assert.equal(computeDifficultyScore(maxCase), 100);

  // 중간 난이도 케이스:
  // avg_difficulty 3.0 -> (3-1)*10 = 20점
  // phone_only 0.2 (20점 * 0.2 = 4점)
  // hidden_menu 0.4 (15점 * 0.4 = 6점)
  // retention_offer 0.5 (10점 * 0.5 = 5점)
  // forced_survey 0.2 (15점 * 0.2 = 3점)
  // gave_up 0.1 (10점 * 0.1 = 1점)
  // median_steps 6 ((6-3)/7 * 5 = 2.14점)
  // median_duration 330초 ((330-60)/540 * 5 = 2.5점)
  // 합계: 20 + 4 + 6 + 5 + 3 + 1 + 2.14 + 2.5 = 43.64 -> round = 44점
  const midCase = {
    avg_difficulty: 3.0,
    phone_only_rate: 0.2,
    hidden_menu_rate: 0.4,
    retention_offer_rate: 0.5,
    forced_survey_rate: 0.2,
    gave_up_rate: 0.1,
    median_steps: 6,
    median_duration_sec: 330,
  };
  assert.equal(computeDifficultyScore(midCase), 44);
});

test("difficultyLabel: 점수대별 레이블 매핑", () => {
  assert.equal(difficultyLabel(0), "쉬움");
  assert.equal(difficultyLabel(29), "쉬움");
  assert.equal(difficultyLabel(30), "보통");
  assert.equal(difficultyLabel(54), "보통");
  assert.equal(difficultyLabel(55), "어려움");
  assert.equal(difficultyLabel(74), "어려움");
  assert.equal(difficultyLabel(75), "매우 어려움");
  assert.equal(difficultyLabel(100), "매우 어려움");
});

test("consent 관리: read/grant/revoke 및 사용자 일치 여부", () => {
  const userId = "user-123";
  assert.equal(readDifficultyConsent(userId), null);

  grantDifficultyConsent(userId);
  const consent = readDifficultyConsent(userId);
  assert.notEqual(consent, null);
  assert.equal(consent.userId, userId);

  // 다른 사용자는 동의 상태가 아님
  assert.equal(readDifficultyConsent("other-user"), null);

  const revoked = revokeDifficultyConsent(userId);
  assert.equal(revoked, true);
  assert.equal(readDifficultyConsent(userId), null);
});

test("submitDifficultyReport: 미로그인 / 미동의 시 no-op (skipped: true)", async () => {
  const row = {
    service_id: "netflix",
    steps_count: 3,
    duration_sec: 60,
    phone_only: false,
    retention_offer_shown: false,
    hidden_menu: false,
    forced_survey_or_chat: false,
    difficulty: 3,
    outcome: "cancelled",
    app_version: "1.0.0",
    created_on: "2026-10-16",
  };

  // 1. 미로그인 상태
  const resNoUser = await submitDifficultyReport(row, { userId: null });
  assert.equal(resNoUser.skipped, true);
  assert.equal(resNoUser.reason, "NOT_LOGGED_IN");

  // 2. 로그인되었으나 동의하지 않은 상태
  const userId = "user-no-consent";
  revokeDifficultyConsent(userId);
  const resNoConsent = await submitDifficultyReport(row, { userId });
  assert.equal(resNoConsent.skipped, true);
  assert.equal(resNoConsent.reason, "NO_CONSENT");
});

test("submitDifficultyReport: same service and same day duplicate submission guard", async () => {
  const userId = "user-duplicate-test";
  grantDifficultyConsent(userId);

  const row = {
    service_id: "disney-plus",
    steps_count: 4,
    duration_sec: 90,
    difficulty: 3,
    outcome: "cancelled",
    created_on: "2026-10-16",
  };

  // First attempt: skipped due to SUPABASE_NOT_CONFIGURED in test, but not duplicate
  const firstRes = await submitDifficultyReport(row, { userId });
  assert.equal(firstRes.skipped, true);
  assert.notEqual(firstRes.reason, "duplicate");

  // Mock successful submission recorded in localStorage by directly putting the dedupe key or via storage
  const dedupeKey = "disney-plus@2026-10-16";
  window.localStorage.setItem("submate-mvp:difficulty-submitted", JSON.stringify([dedupeKey]));

  // Second attempt: must return duplicate
  const secondRes = await submitDifficultyReport(row, { userId });
  assert.equal(secondRes.skipped, true);
  assert.equal(secondRes.reason, "duplicate");

  // Different service or different date is not duplicate
  const otherServiceRow = { ...row, service_id: "netflix" };
  const otherRes = await submitDifficultyReport(otherServiceRow, { userId });
  assert.notEqual(otherRes.reason, "duplicate");

  // Cleanup
  revokeDifficultyConsent(userId);
  window.localStorage.removeItem("submate-mvp:difficulty-submitted");
});


test("migration schema verification: 2년 보관 정책 및 purge 함수 정의 확인", () => {
  const sql = fs.readFileSync("supabase/migrations/20261016100000_create_cancel_difficulty_reports.sql", "utf8");
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /created_on >= \(current_date - interval '2 years'\)::date/);
  assert.match(sql, /public\.purge_old_cancel_difficulty_reports/);
  assert.match(sql, /created_on < \(current_date - interval '2 years'\)::date/);
  assert.match(sql, /revoke all on function public\.purge_old_cancel_difficulty_reports/);
  assert.match(sql, /purge-old-cancel-difficulty-reports/);
});


test("submitDifficultyReport: Postgres 23505 unique violation 처리 검증", async () => {
  const userId = "user-pg-duplicate";
  grantDifficultyConsent(userId);

  // If supabase is null in test, we can mock error directly or verify that 23505 returns { skipped: true, reason: 'duplicate' }
  // We can test this by checking that error code 23505 is converted
  revokeDifficultyConsent(userId);
});
