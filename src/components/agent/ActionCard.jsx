import { useState } from "react";
import { formatWon, getNextChargeDate } from "../../lib/dates.js";
import { ConfirmCard } from "./ConfirmCard";

const monthDay = (date) => (date instanceof Date && !Number.isNaN(date.getTime()) ? date.getMonth() + 1 + "월 " + date.getDate() + "일" : null);
const arrow = (before, after) => (before === undefined || before === null || before === "" ? String(after) : before + " → " + after);

export function ActionCard({
  action,
  subscriptions = [],
  onConfirm,
  onCancel,
}) {
  const [loading, setLoading] = useState(false);
  // 확인을 눌렀는데도 카드가 그대로면(실패) 카드 안에 실패 문장을 보여 준다. 실제 처리·토스트는 onConfirm 이 한다.
  const [attempted, setAttempted] = useState(false);

  const { type, payload, summary, status, before } = action;
  const isDone = status === "executed" || action.done;
  const isCancelled = status === "cancelled";

  // Find target subscription if applicable (for live checks like missing target)
  const targetSub = subscriptions.find(
    (s) => (s.subscriptionId || s.id) === payload?.subscriptionId || s.id === payload?.subscriptionId
  );
  const requiresTarget =
    type === "update_subscription" || type === "open_cancel" || (type === "set_alerts" && payload?.subscriptionId !== "all");
  const isTargetMissing = requiresTarget && !targetSub;

  // Use captured snapshot 'before' if available, otherwise fallback to targetSub
  const beforeSnapshot = before || targetSub || null;

  // Check if update_subscription has all changes equal to captured before values
  const isNoopUpdate = (() => {
    if (type !== "update_subscription" || !beforeSnapshot) return false;
    const changes = payload.changes || {};
    const changeKeys = Object.keys(changes);
    if (changeKeys.length === 0) return true;

    return changeKeys.every((k) => {
      const newVal = changes[k];
      if (k === "amount") {
        return newVal === (beforeSnapshot.amount ?? beforeSnapshot.grossAmount);
      }
      if (k === "billingCycle") {
        return newVal === (beforeSnapshot.billingCycle || "매월");
      }
      if (k === "nextChargeDate") {
        return newVal === (beforeSnapshot.nextChargeDate || beforeSnapshot.nextBillingDate || null);
      }
      if (k === "billingDay") {
        return newVal === (beforeSnapshot.dueDay ?? beforeSnapshot.billingDay ?? null);
      }
      if (k === "plan") {
        return (newVal || null) === (beforeSnapshot.plan || null);
      }
      if (k === "paymentMethod") {
        return (newVal || null) === (beforeSnapshot.paymentMethod || null);
      }
      return false;
    });
  })();

  const handleConfirmClick = async () => {
    if (isDone || isCancelled || loading || isTargetMissing || isNoopUpdate) return;
    setLoading(true);
    try {
      await onConfirm?.(action);
    } finally {
      setLoading(false);
      setAttempted(true);
    }
  };

  const handleCancelClick = () => {
    if (isDone || isCancelled || loading) return;
    onCancel?.(action);
  };

  const subName = beforeSnapshot?.name || targetSub?.name || null;
  const logoServiceId = targetSub?.serviceId || targetSub?.id || payload?.serviceId || null;

  const buildRows = () => {
    switch (type) {
      case "add_subscription":
        return [
          { label: "금액", value: formatWon(payload.amount) },
          { label: "결제 주기", value: payload.billingCycle || "매월" },
          {
            label: "결제일",
            value: payload.nextChargeDate || (payload.billingDay ? "매월 " + payload.billingDay + "일" : null),
          },
          { label: "결제 수단", value: payload.paymentMethod || null },
        ];
      case "update_subscription": {
        const changes = payload.changes || {};
        const rows = [];
        if (changes.amount !== undefined) {
          const prev = beforeSnapshot?.amount ?? beforeSnapshot?.grossAmount ?? targetSub?.amount ?? targetSub?.grossAmount;
          rows.push({ label: "금액", value: arrow(prev === undefined ? null : formatWon(prev), formatWon(changes.amount)) });
        }
        if (changes.plan !== undefined) {
          rows.push({ label: "요금제", value: arrow(beforeSnapshot?.plan || targetSub?.plan || "기본", changes.plan) });
        }
        if (changes.billingCycle !== undefined) {
          rows.push({ label: "결제 주기", value: arrow(beforeSnapshot?.billingCycle || targetSub?.billingCycle || "매월", changes.billingCycle) });
        }
        if (changes.nextChargeDate !== undefined || changes.billingDay !== undefined) {
          const prev =
            beforeSnapshot?.nextChargeDate ||
            beforeSnapshot?.nextBillingDate ||
            (beforeSnapshot?.billingDay ? "매월 " + beforeSnapshot.billingDay + "일" : null) ||
            (beforeSnapshot?.dueDay ? "매월 " + beforeSnapshot.dueDay + "일" : null) ||
            targetSub?.nextBillingDate ||
            (targetSub?.dueDay ? "매월 " + targetSub.dueDay + "일" : "-");
          rows.push({ label: "결제일", value: arrow(prev, changes.nextChargeDate || "매월 " + changes.billingDay + "일") });
        }
        if (changes.paymentMethod !== undefined) {
          rows.push({ label: "결제 수단", value: arrow(beforeSnapshot?.paymentMethod || targetSub?.paymentMethod || "미등록", changes.paymentMethod) });
        }
        return rows;
      }
      case "set_alerts":
        return [
          payload.alertD3 !== undefined ? { label: "3일 전 알림", value: payload.alertD3 ? "켜기" : "끄기" } : null,
          payload.alertD1 !== undefined ? { label: "1일 전 알림", value: payload.alertD1 ? "켜기" : "끄기" } : null,
        ].filter(Boolean);
      case "open_cancel": {
        const amount = targetSub?.amount ?? beforeSnapshot?.amount;
        const next = targetSub ? monthDay(getNextChargeDate(targetSub)) : null;
        return [
          { label: "해지 확정", value: (subName || "서비스") + "에서 직접 눌러요" },
          next ? { label: "다음 결제", value: next + (amount !== undefined && amount !== null ? " · " + formatWon(amount) : "") } : null,
        ].filter(Boolean);
      }
      default:
        return [];
    }
  };

  const getTitle = () => {
    if (summary) return summary;
    switch (type) {
      case "add_subscription": return (payload.name || "구독") + " 추가";
      case "update_subscription": return (subName || "구독") + " 정보 수정";
      case "set_alerts": return payload?.subscriptionId === "all" ? "전체 구독 알림 설정" : (subName || "구독") + " 알림 설정";
      case "open_cancel": return (subName || "구독") + " 해지";
      default: return "요청된 작업";
    }
  };

  const baseSubtitle =
    type === "add_subscription" ? payload.plan || null :
    type === "set_alerts" ? (payload?.subscriptionId === "all" ? "모든 구독" : null) :
    type === "update_subscription" ? targetSub?.plan || null :
    type === "open_cancel" ? targetSub?.plan || null : null;

  let subtitle = baseSubtitle;
  let note = null;
  let noteTone = "muted";
  let steps = [];
  let secondary = null;
  let primary = null;

  if (isDone) {
    subtitle = type === "open_cancel" ? "해지 안내를 열었어요" : "반영했어요";
    if (type === "open_cancel") {
      steps = [
        { label: "해지 방법 확인", state: "done" },
        { label: (subName || "서비스") + "에서 해지 확정하기", state: "now" },
        { label: "다음 결제일에 청구 안 됐는지 확인", state: "next" },
      ];
    }
  } else if (isCancelled) {
    subtitle = "그만뒀어요";
  } else {
    if (isTargetMissing) {
      note = "해당 구독을 찾을 수 없어요.";
      noteTone = "danger";
    } else if (isNoopUpdate) {
      note = "이미 같은 값이에요.";
    } else if (attempted && !loading) {
      note = "반영하지 못했어요. 다시 시도해 주세요.";
      noteTone = "danger";
    } else if (type === "open_cancel") {
      note = "진행하면 해지 안내와 공식 해지 페이지가 열려요. 비밀번호와 카드번호는 받지 않아요.";
    }
    if (isNoopUpdate) {
      secondary = { label: "닫기", onClick: handleCancelClick, disabled: loading };
    } else {
      secondary = { label: "그만두기", onClick: handleCancelClick, disabled: loading || isTargetMissing };
      primary = {
        label: loading ? "처리 중..." : attempted ? "다시 시도" : "진행할게요",
        onClick: handleConfirmClick,
        disabled: loading || isTargetMissing,
      };
    }
  }

  return (
    <ConfirmCard
      testId="agent-action-card"
      serviceId={logoServiceId}
      name={type === "add_subscription" ? payload?.name || "" : subName || ""}
      title={getTitle()}
      subtitle={subtitle}
      rows={buildRows()}
      note={note}
      noteTone={noteTone}
      steps={steps}
      secondary={secondary}
      primary={primary}
      className={isCancelled ? "opacity-70" : ""}
    />
  );
}

