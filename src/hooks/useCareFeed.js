import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildCareItems } from "../lib/careFeed";
import { answerCancelCheck, reviewCancelVerifications } from "../lib/cancelVerification";
import { answerUsage as recordUsageAnswer } from "../lib/usageCheck";
import { checkPaymentCapturePermission } from "../lib/paymentCapture";
import { readCancelHistory, readStoredValue, storageKeys, writeCancelHistory, writeStoredValue } from "../lib/storage";

const readMap = (key) => {
  const value = readStoredValue(key, {});
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
};

// 홈 '오늘 챙길 일' 상태. 해지 확인 루프는 1분마다 확인 시각이 된 기록을 처리한다.
export function useCareFeed({ subscriptions = [], catalog = [], onEvents } = {}) {
  const [cancelHistory, setCancelHistory] = useState(() => readCancelHistory());
  const [usageAnswers, setUsageAnswers] = useState(() => readMap(storageKeys.usageAnswers));
  const [acks, setAcks] = useState(() => readMap(storageKeys.careAcks));
  const [rotation, setRotation] = useState(() => readStoredValue(storageKeys.rotationPlan, null));
  const [now, setNow] = useState(() => new Date());
  // 콜백이 바뀌어도 1분 타이머를 다시 걸지 않도록 최신 콜백을 ref로 넘긴다.
  const onEventsRef = useRef(onEvents);
  onEventsRef.current = onEvents;

  // 해지하면 기록이 늘어나므로 구독 목록이 바뀔 때 다시 읽는다.
  useEffect(() => {
    setCancelHistory(readCancelHistory());
  }, [subscriptions]);

  useEffect(() => {
    let active = true;
    const review = async () => {
      const capture = await checkPaymentCapturePermission();
      if (!active) return;
      const current = readCancelHistory();
      const result = reviewCancelVerifications(current, { now: new Date(), captureEnabled: capture.hasPermission });
      if (result.events.length > 0) {
        writeCancelHistory(result.history);
        setCancelHistory(result.history);
        onEventsRef.current?.(result.events);
      }
      setNow(new Date());
    };
    review();
    const timer = window.setInterval(review, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const items = useMemo(
    () => buildCareItems({ subscriptions, cancelHistory, usageAnswers, acks, rotation, catalog, now }),
    [subscriptions, cancelHistory, usageAnswers, acks, rotation, catalog, now]
  );

  const ack = useCallback((key) => {
    setAcks((current) => {
      const next = { ...current, [key]: new Date().toISOString() };
      writeStoredValue(storageKeys.careAcks, next);
      return next;
    });
  }, []);

  const answerUsage = useCallback((subscription, answer) => {
    setUsageAnswers((current) => {
      const next = recordUsageAnswer(current, subscription, answer, new Date());
      writeStoredValue(storageKeys.usageAnswers, next);
      return next;
    });
  }, []);

  const answerCancel = useCallback((key, answer) => {
    const { history, record } = answerCancelCheck(readCancelHistory(), key, answer, new Date());
    writeCancelHistory(history);
    setCancelHistory(history);
    return record;
  }, []);

  const saveRotation = useCallback((plan) => {
    writeStoredValue(storageKeys.rotationPlan, plan);
    setRotation(plan);
  }, []);

  const clearRotation = useCallback(() => {
    writeStoredValue(storageKeys.rotationPlan, null);
    setRotation(null);
  }, []);

  const refreshHistory = useCallback(() => setCancelHistory(readCancelHistory()), []);

  return { items, rotation, ack, answerUsage, answerCancel, saveRotation, clearRotation, refreshHistory };
}
