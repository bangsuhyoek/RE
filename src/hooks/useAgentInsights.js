import { useState, useEffect, useMemo, useCallback } from "react";
import {
  generateAgentInsights,
  dismissInsightId,
  snoozeInsightId,
  isInsightDismissed,
  isInsightSnoozed,
  pruneExpiredSnoozes,
} from "../lib/agentInsights.js";
import { toLocalDateKey } from "../lib/dates.js";
import { readStoredValue, storageKeys } from "../lib/storage.js";
import { scheduleAgentInsightNotification } from "../lib/notifications.js";

/**
 * Hook to manage proactive agent insights.
 *
 * @param {Array} subscriptions List of user subscriptions
 * @returns {{
 *   insights: Array,
 *   topInsight: Object|null,
 *   dismiss: Function,
 *   snooze: Function
 * }}
 */
export function useAgentInsights(subscriptions = []) {
  const [version, setVersion] = useState(0);

  // Memoize date key so calculation remains stable across the same day
  const todayKey = toLocalDateKey(new Date());

  const usageAnswers = useMemo(() => {
    return readStoredValue(storageKeys.usageAnswers, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- storageKeys.usageAnswers�� ���� Ű�̸� dismiss/snooze(version) ������ �亯 ����ȸ
  }, [version]);

  const rawInsights = useMemo(() => {
    const now = new Date();
    return generateAgentInsights(subscriptions, { now, usageAnswers });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ���� ����(todayKey)�� ���� ���, ���� �亯�� ���� �λ���Ʈ�� ����
  }, [subscriptions, usageAnswers, todayKey]);

  // Filter out dismissed and snoozed insights
  const insights = useMemo(() => {
    const now = new Date();
    pruneExpiredSnoozes(now);
    return rawInsights.filter((item) => {
      if (isInsightDismissed(item.id)) return false;
      if (isInsightSnoozed(item.id, now)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dismiss/snooze ����(version) ���� �� ���͸��� �ٽ� ����
  }, [rawInsights, version]);

  const topInsight = insights.length > 0 ? insights[0] : null;

  // Proactive notification scheduling: at most one local notification per KST day for top high-priority insight
  useEffect(() => {
    if (!topInsight || topInsight.priority !== "high") return;
    scheduleAgentInsightNotification(topInsight, new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- topInsight 객체 전체가 아닌 식별자와 우선순위 속성만 감지하여 불필요한 알림 발송 방지
  }, [topInsight?.id, topInsight?.priority]);

  const dismiss = useCallback((id) => {
    if (!id) return;
    dismissInsightId(id);
    setVersion((v) => v + 1);
  }, []);

  const snooze = useCallback((id) => {
    if (!id) return;
    snoozeInsightId(id, new Date());
    setVersion((v) => v + 1);
  }, []);

  return {
    insights,
    topInsight,
    dismiss,
    snooze,
  };
}
