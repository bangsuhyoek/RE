import { Capacitor } from "@capacitor/core";
import { SystemIntents } from "./shareIntake.js";
import {
  storageKeys,
  readStoredValue,
  readCancelHistory,
  readEvidenceCases,
} from "./storage.js";
import { readEvidenceConsent } from "./evidenceStore.js";
import { readDifficultyConsent } from "./cancelDifficulty.js";
import { readCancelAiConsent } from "./cancelBrowser.js";
import { CHAT_CONSENT_KEY } from "./chatClient.js";

/**
 * 사용자 내보내기용 JSON 데이터를 구성합니다.
 * 게스트 모드와 로그인 회원 모두 로컬 데이터를 포함하여 완전하게 내보낼 수 있습니다.
 */
export function buildExportPayload({
  userId = null,
  profile = null,
  subscriptions = null,
  cancelHistory = null,
  evidenceCases = null,
} = {}) {
  const currentSubscriptions =
    subscriptions !== null
      ? subscriptions
      : readStoredValue(storageKeys.subscriptions, []);

  const currentCancelHistory =
    cancelHistory !== null ? cancelHistory : readCancelHistory();

  const currentEvidenceCases =
    evidenceCases !== null ? evidenceCases : readEvidenceCases();

  const consents = {
    evidenceConsent: Boolean(readEvidenceConsent(userId)),
    difficultyConsent: Boolean(readDifficultyConsent(userId)),
    cancelAiConsent: Boolean(readCancelAiConsent()),
    chatConsent: Boolean(readStoredValue(CHAT_CONSENT_KEY, false)),
    agentMandates: readStoredValue(storageKeys.agentMandates, []),
    approvalRequests: readStoredValue(storageKeys.agentApprovals, []),
  };

  return {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    user: {
      userId: userId || null,
      nickname: profile?.nickname || "사용자",
      isGuest: !userId,
    },
    subscriptions: Array.isArray(currentSubscriptions) ? currentSubscriptions : [],
    cancellationHistory: Array.isArray(currentCancelHistory) ? currentCancelHistory : [],
    evidenceCases: currentEvidenceCases || {},
    consents,
  };
}

/**
 * 데이터를 JSON으로 내보냅니다.
 * - Android: 설치된 SystemIntents 플러그인을 사용하여 텍스트 공유
 * - 웹: Blob 다운로드 링크 생성
 */
export async function exportUserData(options = {}) {
  const payload = buildExportPayload(options);
  const jsonString = JSON.stringify(payload, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `submate-data-export-${dateStr}.json`;

  if (Capacitor.isNativePlatform()) {
    try {
      await SystemIntents.shareText({
        title: "꾸독 데이터 내보내기",
        text: jsonString,
      });
      return { ok: true, method: "intent", payload, jsonString };
    } catch (err) {
      console.warn("SystemIntents.shareText 내보내기 실패, 웹 다운로드로 전환 시도:", err);
    }
  }

  // 웹 브라우저 환경: Blob 다운로드
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      return { ok: true, method: "blob", payload, jsonString };
    } catch (err) {
      console.error("Blob 다운로드 실패:", err);
      return { ok: false, error: err?.message || "DOWNLOAD_FAILED", payload, jsonString };
    }
  }

  // Node 또는 headless 테스트 환경
  return { ok: true, method: "headless", payload, jsonString };
}
