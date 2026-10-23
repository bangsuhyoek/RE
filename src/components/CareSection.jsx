import { BadgeCheck, CalendarClock, Gift, Repeat, ShieldAlert, ShieldQuestion, Users, CircleHelp, Search } from "lucide-react";

// 홈 '오늘 챙길 일': 꾸독이 챙긴 일을 보여주고 사용자는 버튼으로 결정만 한다.
const TYPE_STYLE = {
  cancel_ask: { icon: ShieldQuestion, tone: "bg-[#FFF4E5] text-[#B25E00]" },
  cancel_charged: { icon: ShieldAlert, tone: "bg-[#FDEBEC] text-[#C2272D]" },
  cancel_watching: { icon: Search, tone: "bg-[#F2F4F6] text-[#4E5968]" },
  cancel_verified: { icon: BadgeCheck, tone: "bg-[#E8F7EE] text-[#1A7F45]" },
  trial_guard: { icon: Gift, tone: "bg-[#FFF4E5] text-[#B25E00]" },
  usage_ask: { icon: CircleHelp, tone: "bg-[#EEF4FF] text-[#1B64DA]" },
  usage_suggest: { icon: CircleHelp, tone: "bg-[#EEF4FF] text-[#1B64DA]" },
  settlement: { icon: Users, tone: "bg-[#F3EEFF] text-[#6B3FD4]" },
  rotation_due: { icon: CalendarClock, tone: "bg-[#EEF4FF] text-[#1B64DA]" },
  rotation_suggest: { icon: Repeat, tone: "bg-[#E8F7EE] text-[#1A7F45]" },
};

export const CARE_ACTIONS = {
  cancel_ask: [
    { id: "cancel_no_charge", label: "결제 없었어요", primary: true },
    { id: "cancel_charged", label: "결제됐어요" },
    { id: "cancel_later", label: "아직 몰라요" },
  ],
  cancel_charged: [{ id: "open_refund", label: "환불 요청 보기", primary: true }],
  cancel_watching: [],
  cancel_verified: [{ id: "dismiss", label: "확인" }],
  trial_guard: [
    { id: "start_cancel", label: "지금 해지하기", primary: true },
    { id: "trial_keep", label: "계속 쓸게요" },
  ],
  usage_ask: [
    { id: "usage_used", label: "잘 썼어요" },
    { id: "usage_unused", label: "거의 안 썼어요", primary: true },
  ],
  usage_suggest: [
    { id: "start_cancel", label: "해지하기", primary: true },
    { id: "open_detail", label: "요금제 바꾸기", when: (item) => Boolean(item.cheaper) },
    { id: "dismiss", label: "그냥 둘게요" },
  ],
  settlement: [
    { id: "share_settlement", label: "정산 요청 보내기", primary: true },
    { id: "dismiss", label: "이미 받았어요" },
  ],
  rotation_due: [
    { id: "rotation_act", label: "바로 하기", primary: true },
    { id: "dismiss", label: "했어요" },
  ],
  rotation_suggest: [
    { id: "open_rotation", label: "계획 보기", primary: true },
    { id: "dismiss", label: "괜찮아요" },
  ],
};

export function CareSection({ items = [], onAction, onOpenRotation, hasRotation = false }) {
  if (items.length === 0 && !hasRotation) return null;
  const visible = items.slice(0, 5);
  return (
    <section className="mt-5" aria-label="오늘 챙길 일">
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-[16px] font-bold tracking-tight text-[#191F28]">오늘 챙길 일</h2>
        {hasRotation && (
          <button type="button" onClick={onOpenRotation} className="text-[12px] font-semibold text-[#6B7684] hover:text-[#191F28]">
            구독 순환 계획
          </button>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="rounded-2xl bg-[#F9FAFB] px-4 py-3 text-[13px] text-[#6B7684]">지금 결정할 일이 없어요. 꾸독이 계속 지켜볼게요.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => {
            const style = TYPE_STYLE[item.type] || TYPE_STYLE.cancel_watching;
            const Icon = style.icon;
            const actions = (CARE_ACTIONS[item.type] || []).filter((action) => !action.when || action.when(item));
            return (
              <li key={item.key} className="rounded-2xl border border-[#E5E8EB] bg-white p-3.5">
                <div className="flex items-start gap-3">
                  <span className={"grid h-9 w-9 shrink-0 place-items-center rounded-full " + style.tone}>
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold leading-snug text-[#191F28]">{item.title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#6B7684]">{item.body}</p>
                  </div>
                </div>
                {actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 pl-12">
                    {actions.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => onAction?.(item, action.id)}
                        className={
                          "rounded-xl px-3 py-1.5 text-[12.5px] font-bold transition-transform active:scale-95 " +
                          (action.primary ? "bg-[#191F28] text-white" : "bg-[#F2F4F6] text-[#333D4B]")
                        }
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {items.length > visible.length && (
        <p className="mt-2 text-center text-[12px] text-[#8B95A1]">처리하면 나머지 {items.length - visible.length}건이 이어서 보여요.</p>
      )}
    </section>
  );
}

