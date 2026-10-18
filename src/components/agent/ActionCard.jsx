import { useState } from "react";
import { Check, X, ArrowRight, Bell, Calendar, CreditCard, DollarSign, PlusCircle, Trash2, Info } from "lucide-react";
import { formatWon } from "../../lib/dates.js";
import { Button } from "../ui.jsx";

export function ActionCard({
  action,
  subscriptions = [],
  onConfirm,
  onCancel,
}) {
  const [loading, setLoading] = useState(false);

  const { id, type, payload, summary, status, before } = action;
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
    }
  };

  const handleCancelClick = () => {
    if (isDone || isCancelled || loading) return;
    onCancel?.(action);
  };

  const renderDiff = () => {
    switch (type) {
      case "add_subscription": {
        return (
          <div className="space-y-1.5 text-[12px] text-[#4E5968]">
            <div className="flex items-center justify-between">
              <span className="text-[#8B95A1]">서비스</span>
              <span className="font-semibold text-[#191F28]">{payload.name}</span>
            </div>
            {payload.plan && (
              <div className="flex items-center justify-between">
                <span className="text-[#8B95A1]">요금제</span>
                <span className="font-semibold text-[#191F28]">{payload.plan}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[#8B95A1]">금액</span>
              <span className="font-bold text-[#191F28]">{formatWon(payload.amount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8B95A1]">결제 주기</span>
              <span className="font-medium text-[#191F28]">{payload.billingCycle || "매월"}</span>
            </div>
            {(payload.nextChargeDate || payload.billingDay) && (
              <div className="flex items-center justify-between">
                <span className="text-[#8B95A1]">결제일</span>
                <span className="font-medium text-[#191F28]">
                  {payload.nextChargeDate || ("매월 " + payload.billingDay + "일")}
                </span>
              </div>
            )}
            {payload.paymentMethod && (
              <div className="flex items-center justify-between">
                <span className="text-[#8B95A1]">결제 수단</span>
                <span className="font-medium text-[#191F28]">{payload.paymentMethod}</span>
              </div>
            )}
          </div>
        );
      }

      case "update_subscription": {
        const changes = payload.changes || {};
        const displayName = beforeSnapshot?.name || targetSub?.name || "선택한 구독";
        return (
          <div className="space-y-2 text-[12px] text-[#4E5968]">
            <div className="flex items-center justify-between border-b border-[#F2F4F6] pb-1.5">
              <span className="text-[#8B95A1]">대상 구독</span>
              <span className="font-bold text-[#191F28]">{displayName}</span>
            </div>

            {changes.amount !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-[#8B95A1]">금액</span>
                <span className="inline-flex items-center gap-1.5 font-bold">
                  <span className="text-[#8B95A1] line-through">
                    {formatWon(beforeSnapshot?.amount ?? beforeSnapshot?.grossAmount ?? targetSub?.amount ?? targetSub?.grossAmount)}
                  </span>
                  <ArrowRight size={12} className="text-[#8B95A1]" />
                  <span className="text-[#3182F6]">{formatWon(changes.amount)}</span>
                </span>
              </div>
            )}

            {changes.plan !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-[#8B95A1]">요금제</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[#8B95A1]">{beforeSnapshot?.plan || targetSub?.plan || "기본"}</span>
                  <ArrowRight size={12} className="text-[#8B95A1]" />
                  <span className="font-semibold text-[#191F28]">{changes.plan}</span>
                </span>
              </div>
            )}

            {changes.billingCycle !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-[#8B95A1]">결제 주기</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[#8B95A1]">{beforeSnapshot?.billingCycle || targetSub?.billingCycle || "매월"}</span>
                  <ArrowRight size={12} className="text-[#8B95A1]" />
                  <span className="font-semibold text-[#191F28]">{changes.billingCycle}</span>
                </span>
              </div>
            )}

            {(changes.nextChargeDate !== undefined || changes.billingDay !== undefined) && (
              <div className="flex items-center justify-between">
                <span className="text-[#8B95A1]">결제일</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[#8B95A1]">
                    {beforeSnapshot?.nextChargeDate ||
                      beforeSnapshot?.nextBillingDate ||
                      (beforeSnapshot?.billingDay ? ("매월 " + beforeSnapshot.billingDay + "일") : null) ||
                      (beforeSnapshot?.dueDay ? ("매월 " + beforeSnapshot.dueDay + "일") : null) ||
                      targetSub?.nextBillingDate ||
                      (targetSub?.dueDay ? ("매월 " + targetSub.dueDay + "일") : "-")}
                  </span>
                  <ArrowRight size={12} className="text-[#8B95A1]" />
                  <span className="font-semibold text-[#191F28]">
                    {changes.nextChargeDate || ("매월 " + changes.billingDay + "일")}
                  </span>
                </span>
              </div>
            )}

            {changes.paymentMethod !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-[#8B95A1]">결제 수단</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[#8B95A1]">{beforeSnapshot?.paymentMethod || targetSub?.paymentMethod || "미등록"}</span>
                  <ArrowRight size={12} className="text-[#8B95A1]" />
                  <span className="font-semibold text-[#191F28]">{changes.paymentMethod}</span>
                </span>
              </div>
            )}
          </div>
        );
      }

      case "set_alerts": {
        const targetName = payload.subscriptionId === "all"
          ? "전체 구독"
          : (beforeSnapshot?.name || targetSub?.name || "선택한 구독");
        return (
          <div className="space-y-1.5 text-[12px] text-[#4E5968]">
            <div className="flex items-center justify-between">
              <span className="text-[#8B95A1]">알림 대상</span>
              <span className="font-bold text-[#191F28]">{targetName}</span>
            </div>
            {payload.alertD3 !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-[#8B95A1]">3일 전 알림</span>
                <span className={"font-semibold " + (payload.alertD3 ? "text-[#3182F6]" : "text-[#8B95A1]")}>
                  {payload.alertD3 ? "켜기 (D-3)" : "끄기"}
                </span>
              </div>
            )}
            {payload.alertD1 !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-[#8B95A1]">1일 전 알림</span>
                <span className={"font-semibold " + (payload.alertD1 ? "text-[#3182F6]" : "text-[#8B95A1]")}>
                  {payload.alertD1 ? "켜기 (D-1)" : "끄기"}
                </span>
              </div>
            )}
          </div>
        );
      }

      case "open_cancel": {
        const displayName = beforeSnapshot?.name || targetSub?.name || payload.subscriptionId;
        return (
          <div className="space-y-1.5 text-[12px] text-[#4E5968]">
            <div className="flex items-center justify-between">
              <span className="text-[#8B95A1]">해지 대상</span>
              <span className="font-bold text-[#191F28]">{displayName}</span>
            </div>
            <p className="text-[12px] text-[#6B7684]">
              확인을 누르면 해지 안내 및 공식 사이트 이동 화면이 열려요.
            </p>
          </div>
        );
      }

      default:
        return <pre className="text-[11px] text-[#8B95A1]">{JSON.stringify(payload, null, 2)}</pre>;
    }
  };

  const getTitle = () => {
    if (summary) return summary;
    switch (type) {
      case "add_subscription": return (payload.name || "구독") + " 추가";
      case "update_subscription": return (beforeSnapshot?.name || targetSub?.name || "구독") + " 정보 수정";
      case "set_alerts": return "알림 설정 변경";
      case "open_cancel": return (beforeSnapshot?.name || targetSub?.name || "구독") + " 해지";
      default: return "요청된 작업";
    }
  };

  return (
    <div className="mt-3 rounded-2xl border-2 border-[#191F28] bg-white p-4 shadow-xs" data-testid="agent-action-card">
      <div className="flex items-center justify-between border-b border-[#F2F4F6] pb-2.5">
        <div className="flex items-center gap-1.5">
          {type === "add_subscription" && <PlusCircle size={15} className="text-[#3182F6]" />}
          {type === "update_subscription" && <CreditCard size={15} className="text-[#3182F6]" />}
          {type === "set_alerts" && <Bell size={15} className="text-[#3182F6]" />}
          {type === "open_cancel" && <Trash2 size={15} className="text-[#F04452]" />}
          <span className="text-[13px] font-extrabold text-[#191F28]">{getTitle()}</span>
        </div>
        {isDone && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F3FF] px-2.5 py-0.5 text-[11px] font-bold text-[#3182F6]">
            <Check size={12} /> 반영했어요
          </span>
        )}
        {isCancelled && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F2F4F6] px-2.5 py-0.5 text-[11px] font-semibold text-[#8B95A1]">
            <X size={12} /> 취소함
          </span>
        )}
      </div>

      <div className="my-3 rounded-xl bg-[#F9FAFB] p-3">
        {isTargetMissing && (
          <p className="mb-2 rounded-lg bg-[#FEECE8] px-2.5 py-1 text-[11px] font-semibold text-[#F04452]">
            해당 구독을 찾을 수 없어요.
          </p>
        )}
        {isNoopUpdate && !isDone && !isCancelled && (
          <p className="mb-2 flex items-center gap-1 rounded-lg bg-[#E8F3FF] px-2.5 py-1 text-[11px] font-semibold text-[#3182F6]">
            <Info size={12} /> 이미 같은 값이에요.
          </p>
        )}
        {renderDiff()}
      </div>

      {!isDone && !isCancelled && (
        <div className="flex gap-2">
          {isNoopUpdate ? (
            <Button
              size="compact"
              variant="secondary"
              className="flex-1"
              disabled={loading}
              onClick={handleCancelClick}
            >
              닫기
            </Button>
          ) : (
            <>
              <Button
                size="compact"
                variant="secondary"
                className="flex-1"
                disabled={loading || isTargetMissing}
                onClick={handleCancelClick}
              >
                취소
              </Button>
              <Button
                size="compact"
                className="flex-[2]"
                disabled={loading || isTargetMissing}
                onClick={handleConfirmClick}
              >
                {loading ? "처리 중..." : "확인"}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
