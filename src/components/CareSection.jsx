import { BadgeCheck, CalendarClock, Gift, Repeat, ShieldAlert, ShieldQuestion, Users, CircleHelp, Search } from "lucide-react";

// 홈 '오늘 챙길 일': 꾸독이 챙긴 일을 보여주고 사용자는 버튼으로 결정만 한다.
// C2: 아이콘은 모두 회색 타일. 이미 결제된 해지 실패만 빨강으로 구분한다.
const NEUTRAL_TONE = "bg-gray-100 text-ink-muted";
const TYPE_STYLE = {
  cancel_ask: { icon: ShieldQuestion, tone: NEUTRAL_TONE },
  cancel_charged: { icon: ShieldAlert, tone: "bg-danger-soft text-danger" },
  cancel_watching: { icon: Search, tone: NEUTRAL_TONE },
  cancel_verified: { icon: BadgeCheck, tone: NEUTRAL_TONE },
  trial_guard: { icon: Gift, tone: NEUTRAL_TONE },
  usage_ask: { icon: CircleHelp, tone: NEUTRAL_TONE },
  usage_suggest: { icon: CircleHelp, tone: NEUTRAL_TONE },
  settlement: { icon: Users, tone: NEUTRAL_TONE },
  rotation_due: { icon: CalendarClock, tone: NEUTRAL_TONE },
  rotation_suggest: { icon: Repeat, tone: NEUTRAL_TONE },
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

// 홈의 "챙길 일" 행을 펼치면 이 목록이 바로 이어진다. 제목·카드 없이 평평한 행으로 그린다.
export function CareSection({ items = [], onAction, onOpenRotation, hasRotation = false }) {
  if (items.length === 0 && !hasRotation) return null;
  const visible = items.slice(0, 5);
  return (
    <section aria-label="챙길 일">
      {visible.length === 0 ? (
        <p className="px-5 py-3 text-[13px] text-ink-tertiary">지금 결정할 일이 없어요. 꾸독이 계속 지켜볼게요.</p>
      ) : (
        <ul>
          {visible.map((item) => {
            const style = TYPE_STYLE[item.type] || TYPE_STYLE.cancel_watching;
            const Icon = style.icon;
            const actions = (CARE_ACTIONS[item.type] || []).filter((action) => !action.when || action.when(item));
            return (
              <li key={item.key} className="flex gap-3.5 px-5 py-3">
                <span className={"grid h-10 w-10 shrink-0 place-items-center rounded-[10px] " + style.tone}>
                  <Icon size={20} strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium leading-[22px] tracking-tight text-ink">{item.title}</p>
                  {item.body && <p className="mt-0.5 text-[13px] leading-[18px] tracking-tight text-ink-tertiary">{item.body}</p>}
                  {actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {actions.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => onAction?.(item, action.id)}
                          className={
                            "min-h-11 rounded-[10px] px-3.5 text-[14px] font-semibold tracking-tight transition-colors " +
                            (action.primary ? "bg-brand text-white hover:bg-brand-hover" : "bg-gray-100 text-ink-secondary hover:bg-gray-200")
                          }
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {items.length > visible.length && (
        <p className="px-5 pt-1 text-[12px] text-ink-tertiary">처리하면 나머지 {items.length - visible.length}건이 이어서 보여요.</p>
      )}
      {hasRotation && onOpenRotation && (
        <button type="button" onClick={onOpenRotation} className="ml-[74px] min-h-11 text-[14px] font-medium text-ink-tertiary hover:text-ink-secondary">
          구독 순환 계획 보기
        </button>
      )}
    </section>
  );
}
