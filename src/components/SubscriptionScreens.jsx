import { useMemo, useState } from "react";
import { ExternalLink, MoreHorizontal, Plus, RefreshCw } from "lucide-react";
import { Button, ServiceMark, SubscriptionCard, ToggleSwitch } from "./ui";
import { daysUntilCharge, formatBillingDate, formatWon } from "../lib/dates";

const statusLabel = (subscription) => {
  if (subscription.status === "cancel_in_progress") return ["해지 진행 중", "bg-[#FCEBE5] text-[#9B5E49]"];
  if (subscription.status === "cancel_pending") return ["해지 확인", "bg-[#E3E6F7] text-[#3746A5]"];
  if (subscription.status === "trial" || subscription.isTrial) return ["무료 체험", "bg-[#E7F7F6] text-[#3E7B78]"];
  return ["정기 결제", "bg-[#CEE3E4] text-[#3E7B78]"];
};

export function SubscriptionListScreen({ subscriptions, onOpen, onAdd, onStartCancel, onMute, onRefresh }) {
  return (
    <main className="px-6 pb-28 pt-6">
      <div className="flex items-end justify-between">
        <div><p className="re-eyebrow">MY SUBSCRIPTIONS</p><h1 className="mt-1 text-[24px] font-extrabold text-[#1B2A8C]">구독 목록</h1></div>
        <button type="button" onClick={onRefresh} className="re-icon-button" aria-label="구독 목록 다시 확인"><RefreshCw size={18} /></button>
      </div>
      {subscriptions.length ? (
        <div className="mt-6 space-y-3">
          {subscriptions.map((subscription) => (
            <SubscriptionCard
              key={subscription.subscriptionId}
              subscription={subscription}
              onOpen={() => onOpen(subscription.subscriptionId)}
              onCancel={() => onStartCancel(subscription.subscriptionId)}
              onMute={() => onMute(subscription.subscriptionId)}
              swipable={subscription.status !== "cancel_pending"}
              detail
            />
          ))}
        </div>
      ) : (
        <div className="re-dashboard-card mt-12 rounded-[22px] p-6 text-center">
          <p className="text-[14px] text-[#7E8AC0]">등록된 구독이 없어요.</p>
          <Button className="mt-5 w-full" onClick={onAdd}><Plus size={17} /> 구독 추가하기</Button>
        </div>
      )}
    </main>
  );
}

export function CalendarScreen({ subscriptions, onOpen }) {
  const grouped = useMemo(
    () => [...subscriptions].filter((subscription) => subscription.status !== "cancel_pending").sort((a, b) => daysUntilCharge(a) - daysUntilCharge(b)),
    [subscriptions]
  );
  return (
    <main className="px-6 pb-28 pt-6">
      <p className="re-eyebrow">CALENDAR</p>
      <h1 className="mt-1 text-[24px] font-extrabold text-[#1B2A8C]">결제 캘린더</h1>
      <p className="mt-2 text-[13px] text-[#9099CA]">가까운 결제부터 차분하게 확인해요.</p>
      <div className="mt-6 space-y-3">
        {grouped.length ? grouped.map((subscription) => <SubscriptionCard key={subscription.subscriptionId} subscription={subscription} onOpen={() => onOpen(subscription.subscriptionId)} />) : <p className="py-12 text-center text-[13px] text-[#9099CA]">예정된 결제가 없어요.</p>}
      </div>
    </main>
  );
}

export function SubscriptionDetailScreen({ subscription, onUpdate, onStartCancel, onBack, promotion, highlightCancel }) {
  const [alerts, setAlerts] = useState(Boolean(subscription?.alertD3 || subscription?.alertD1));
  if (!subscription) {
    return <main className="px-6 py-16 text-center"><p className="text-[#9099CA]">구독 정보를 찾을 수 없어요.</p><Button className="mt-5" onClick={onBack}>목록으로 돌아가기</Button></main>;
  }

  const [label, labelClass] = statusLabel(subscription);
  const changeAlerts = (checked) => {
    setAlerts(checked);
    onUpdate(subscription.subscriptionId, { alertD3: checked, alertD1: checked });
  };

  return (
    <main className="px-6 pb-28 pt-6">
      <div className="flex items-start justify-between">
        <ServiceMark monogram={subscription.monogram || subscription.name?.[0]} className="h-[74px] w-[74px] rounded-[20px] text-[20px]" />
        <MoreHorizontal className="text-[#7E8AC0]" />
      </div>
      <h1 className="mt-4 text-[28px] font-extrabold text-[#1B2A8C]">{subscription.name}</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-[#E3E6F7] px-3 py-1 text-[11px] font-bold text-[#3746A5]">{subscription.category || "기타"}</span>
        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${labelClass}`}>{label}</span>
      </div>

      <div className="mt-5 flex items-end gap-2">
        <strong className="text-[27px] text-[#3746A5]">{formatWon(subscription.amount)}</strong>
        <span className="pb-1 text-[14px] text-[#9099CA]">/ {subscription.billingCycle || "매월"}</span>
      </div>

      <section className="mt-7 divide-y divide-[#E4EAF6] border-y border-[#E4EAF6]">
        {[
          ["다음 결제일", subscription.status === "cancel_pending" ? "해지 완료 여부 확인 중" : formatBillingDate(subscription)],
          ["결제 수단", subscription.paymentMethod || "미등록"],
          ["시작일", subscription.startedAt || subscription.createdAt?.slice(0, 10) || "미등록"],
        ].map(([key, value]) => (
          <div key={key} className="py-4"><span className="block text-[12px] text-[#9099CA]">{key}</span><strong className="mt-1 block text-[14px] text-[#3746A5]">{value}</strong></div>
        ))}
      </section>

      <section className="mt-6 space-y-2">
        <button type="button" disabled={!subscription.cancelUrl} onClick={() => subscription.cancelUrl && window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer")} className="re-list-button disabled:opacity-45">
          공식 웹사이트 열기 <ExternalLink size={15} />
        </button>
        <div className="re-list-button"><span>결제 전 알림</span><ToggleSwitch checked={alerts} onChange={changeAlerts} label="결제 전 알림" /></div>
      </section>

      {subscription.status === "cancel_in_progress" && (
        <div className="re-action-card mt-6 rounded-[18px] p-4">
          <strong className="text-[13px] text-[#3746A5]">해지를 이어서 할 수 있어요.</strong>
          <p className="mt-1 text-[11px] leading-5 text-[#7E8AC0]">마지막으로 진행한 상태를 유지하고 있어요.</p>
        </div>
      )}

      {subscription.status === "cancel_pending" && (
        <div className="mt-6 rounded-[18px] bg-[#E3E6F7] p-4">
          <strong className="text-[13px] text-[#3746A5]">해지 완료로 확인했어요.</strong>
          <p className="mt-1 text-[11px] leading-5 text-[#7E8AC0]">바로 삭제하지 않고 상태를 남겨두고 있어요.</p>
        </div>
      )}

      {promotion && (
        <div className="mt-6 rounded-[18px] bg-[#E7F7F6] p-4"><p className="text-[11px] font-bold text-[#3E7B78]">AVAILABLE BENEFIT</p><strong className="mt-1 block text-[13px] text-[#3746A5]">{promotion.title}</strong></div>
      )}

      {subscription.status !== "cancel_pending" && (
        <Button variant="danger" className={`mt-7 w-full ${highlightCancel ? "cancel-highlight" : ""}`} onClick={() => onStartCancel(subscription.subscriptionId)}>
          {subscription.status === "cancel_in_progress" ? "해지 계속하기" : "구독 해지하기"}
        </Button>
      )}
    </main>
  );
}
