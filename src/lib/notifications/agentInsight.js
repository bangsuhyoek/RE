import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { readStoredValue, writeStoredValue } from "../storage.js";
import { toLocalDateKey } from "../dates.js";
import { AGENT_INSIGHT_LAST_NOTIFIED_KEY, AGENT_INSIGHT_NOTIFICATION_TYPE, stringHashCode } from "./core.js";

// ============================================================================
// Agent Proactive Insight Notification Support
// ============================================================================

/**
 * Schedule or send at most one local notification per KST day for the top high-priority insight.
 * Dedupe by insight id and KST day key.
 * Uses ID range 200,000,000 ~ 299,999,999 (billing alert is <100M, care is 100M~200M).
 */
export async function scheduleAgentInsightNotification(insight, now = new Date()) {
  if (!insight || insight.priority !== "high") return false;
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return false;

    // Check if already notified today in KST
    const todayKey = toLocalDateKey(now);
    const lastNotified = readStoredValue(AGENT_INSIGHT_LAST_NOTIFIED_KEY, null);
    if (lastNotified && (lastNotified.dateKey === todayKey || lastNotified.insightId === insight.id)) {
      return false;
    }

    const notifId = 200000000 + (Math.abs(stringHashCode(insight.id)) % 100000000);
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notifId,
          title: "꾸독",
          body: insight.message || insight.title || "",
          channelId: "submate-billing-channel",
          extra: {
            insightId: insight.id,
            subscriptionId: insight.subscriptionId || null,
            type: AGENT_INSIGHT_NOTIFICATION_TYPE,
            insight,
          },
        },
      ],
    });

    writeStoredValue(AGENT_INSIGHT_LAST_NOTIFIED_KEY, {
      dateKey: todayKey,
      insightId: insight.id,
      timestamp: now.toISOString(),
    });
    return true;
  } catch (err) {
    console.warn("scheduleAgentInsightNotification error:", err);
    return false;
  }
}
