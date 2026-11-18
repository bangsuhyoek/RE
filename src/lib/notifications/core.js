import { storageKeys } from "../storage.js";

export const NOTIFICATION_STORAGE_KEY = storageKeys.notifications;
export const NOTIFICATION_SETTINGS_KEY = storageKeys.notificationSettings;
export const DEFAULT_NOTIFICATION_DURATION = 2500; // 사용자 피드백 반영: 2~3초 내 빠른 자동 사라짐 (2.5초)
export const CANCEL_REMINDER_TYPE = "cancel_reminder";
export const AGENT_INSIGHT_NOTIFICATION_TYPE = "agent_insight";
export const MONTHLY_REPORT_TYPE = "monthly_report";
export const MONTHLY_REPORT_NOTIFICATION_ID = 300000000;
export const USAGE_CHECK_ACTION_TYPE_ID = "usage_check";
export const AGENT_INSIGHT_LAST_NOTIFIED_KEY = storageKeys.agentInsightsLastNotified;

/**
 * 예약 알림 필드. 오전 9시 안내라 분 단위 정확도는 필요 없으므로 부정확 알람을 쓴다.
 * - isExactNotification: false — 기본값(true)이면 Android 12+에서 정확한 알람 권한이 없을 때
 *   플러그인이 예약할 때마다 시스템 '알람 및 리마인더' 설정 화면을 연다(앱 실행마다 재예약됨).
 * - allowWhileIdle: true — 없으면 기기를 깨우지 않는 AlarmManager.set(RTC)이 되어
 *   절전(Doze) 중에는 화면을 켤 때까지 밀린다. 켜면 setAndAllowWhileIdle로 최대 1시간 안에 울린다.
 */
export function scheduledAt(at) {
  return { schedule: { at, allowWhileIdle: true }, isExactNotification: false };
}

/** 알림 ID를 구독·알림 키에서 안정적으로 만들기 위한 32비트 해시. */
export function stringHashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
