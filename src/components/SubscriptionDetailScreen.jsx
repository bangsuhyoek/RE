import { useState } from "react";
import { Send, Settings2, X, Camera, Trash2 } from "lucide-react";
import {
  Button,
  CategoryBadge,
  CATEGORY_PHILOSOPHY,
  DDayBadge,
  ServiceMark,
  ToggleSwitch,
  PaymentIcon,
  PaymentMethodBadge,
  PAYMENT_PRESETS,
  PaymentMethodTriggerField,
} from "./ui";
import { formatBillingDate, formatWon } from "../lib/dates";

function DetailField({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <span className="text-[13px] font-medium text-[#6B7684]">{label}</span>
      <strong className="min-w-0 truncate text-right text-[14px] font-bold text-[#191F28]">{value}</strong>
    </div>
  );
}

export function SubscriptionDetailScreen({ subscription, subscriptions = [], onUpdate, onStartCancel, onBack, onDelete, promotion, onTriggerNotification, highlightCancel }) {
  const [editing, setEditing] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [draft, setDraft] = useState(() => ({
    plan: subscription?.plan || "기본 플랜",
    amount: subscription?.amount || 0,
    dueDay: subscription?.dueDay || 1,
    paymentMethod: subscription?.paymentMethod === "등록 안 됨" ? "" : (subscription?.paymentMethod || ""),
    memo: subscription?.memo || "",
  }));

  if (!subscription) {
    return (
      <main className="px-5 pb-36 pt-12 text-center">
        <h1 className="text-[18px] font-bold">구독 정보를 찾을 수 없습니다.</h1>
        <p className="mt-2 text-[13px] text-[#71717A]">삭제되었거나 잘못된 경로입니다.</p>
        <Button className="mt-6 mx-auto" onClick={onBack}>목록으로 돌아가기</Button>
      </main>
    );
  }

  const save = () => {
    const amount = Number(draft.amount);
    const dueDay = Math.max(1, Math.min(31, Number(draft.dueDay)));
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(dueDay)) return;
    if (!draft.paymentMethod?.trim()) {
      alert("결제 수단을 선택해 주세요.");
      return;
    }
    onUpdate(subscription.subscriptionId, { ...draft, amount, dueDay });
    setEditing(false);
  };

  const monogram = subscription.monogram || subscription.name?.slice(0, 1) || "S";

  return (
    <main className="px-5 pb-36 pt-6">
      <section className="flex items-center gap-4">
        <ServiceMark
          monogram={monogram}
          image={subscription.image || subscription.attachments?.[0]}
          className="h-14 w-14 rounded-2xl text-[17px] shadow-2xs"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[22px] font-extrabold tracking-tight text-[#191F28]">{subscription.name}</h1>
            <DDayBadge subscription={subscription} />
          </div>
          <p className="mt-1 text-[13px] font-medium text-[#6B7684]">다음 결제일 {formatBillingDate(subscription)}</p>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-[#E5E8EB] bg-white px-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <DetailField label="요금제" value={subscription.plan} />
        <div className="h-px bg-[#F2F4F6]" />
        <DetailField label="결제 금액" value={formatWon(subscription.amount)} />
        <div className="h-px bg-[#F2F4F6]" />
        <DetailField label="결제 주기" value={subscription.billingCycle || "매월"} />
        <div className="h-px bg-[#F2F4F6]" />
        <DetailField label="결제 수단" value={<PaymentMethodBadge method={subscription.paymentMethod || "직접 관리"} size={16} />} />
        {subscription.category && (
          <>
            <div className="h-px bg-[#F2F4F6]" />
            <div>
              <DetailField label="카테고리" value={<CategoryBadge category={subscription.category} showPhilosophy />} />
              {CATEGORY_PHILOSOPHY[subscription.category] && (
                <p className="pb-3 text-[11px] text-fg-muted leading-relaxed">
                  {CATEGORY_PHILOSOPHY[subscription.category].desc}
                </p>
              )}
            </div>
          </>
        )}
        {subscription.memo && (
          <>
            <div className="h-px bg-[#F2F4F6]" />
            <DetailField label="메모" value={subscription.memo} />
          </>
        )}
      </section>

      {subscription.attachments && subscription.attachments.length > 0 && (
        <section className="mt-5 rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-[#191F28]">첨부 사진 ({subscription.attachments.length})</h2>
            <span className="text-[12px] font-medium text-[#8B95A1]">영수증 / 결제 화면</span>
          </div>
          <div className="mt-3 flex gap-2.5 overflow-x-auto py-1">
            {subscription.attachments.map((photo, index) => (
              <div
                key={index}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[#E5E8EB] bg-[#F2F4F6] cursor-pointer active:scale-95 transition-transform"
                onClick={() => setPreviewPhoto(photo)}
              >
                <img src={photo} alt="" className="h-full w-full object-cover" />
                {index === 0 && (
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 py-0.5 text-center text-[10px] font-medium text-white backdrop-blur-xs">
                    대표 사진
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {editing && (
        <section className="field-enter mt-4 rounded-2xl border border-[#191F28] bg-[#F9FAFB] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-[#191F28]">구독 정보 수정</h2>
            <Settings2 size={17} className="text-[#6B7684]" />
          </div>
          <div className="space-y-3">
            <label className="block text-[12px] font-semibold text-[#6B7684]">
              요금제
              <input className="mt-1.5 w-full rounded-xl border border-[#E5E8EB] bg-white px-3.5 py-2.5 text-[14px] text-[#191F28] outline-none transition-colors focus:border-[#191F28]" value={draft.plan} onChange={(event) => setDraft((value) => ({ ...value, plan: event.target.value }))} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[12px] font-semibold text-[#6B7684]">
                월 금액
                <input className="mt-1.5 w-full rounded-xl border border-[#E5E8EB] bg-white px-3.5 py-2.5 text-[14px] text-[#191F28] outline-none transition-colors focus:border-[#191F28]" type="number" min="0" value={draft.amount} onChange={(event) => setDraft((value) => ({ ...value, amount: event.target.value }))} />
              </label>
              <label className="block text-[12px] font-semibold text-[#6B7684]">
                결제일
                <input className="mt-1.5 w-full rounded-xl border border-[#E5E8EB] bg-white px-3.5 py-2.5 text-[14px] text-[#191F28] outline-none transition-colors focus:border-[#191F28]" type="number" min="1" max="31" value={draft.dueDay} onChange={(event) => setDraft((value) => ({ ...value, dueDay: event.target.value }))} />
              </label>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7684] mb-1.5">
                결제 수단 <span className="text-[#FF4D4D] font-bold ml-0.5">*</span>
              </label>
              <PaymentMethodTriggerField
                value={draft.paymentMethod}
                onChange={(val) => setDraft((v) => ({ ...v, paymentMethod: val }))}
                error={!draft.paymentMethod?.trim()}
                subscriptions={subscriptions}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7684]">
                메모
                <textarea
                  className="mt-1.5 w-full resize-none rounded-xl border border-[#E5E8EB] bg-white p-3 text-[14px] text-[#191F28] outline-none transition-colors focus:border-[#191F28]"
                  rows={2}
                  value={draft.memo}
                  onChange={(event) => setDraft((value) => ({ ...value, memo: event.target.value }))}
                  placeholder="메모를 입력해 주세요"
                />
              </label>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <Button variant="secondary" size="default" onClick={() => setEditing(false)}>취소</Button>
            <Button size="default" onClick={save}>저장</Button>
          </div>
        </section>
      )}

      <section className="mt-5 rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <h2 className="text-[15px] font-bold text-[#191F28]">사전 알림 설정</h2>
        <p className="mt-1 text-[12px] leading-5 text-[#6B7684]">원치 않는 자동 결제 전에 알려드려요.</p>
        <div className="mt-4 divide-y divide-[#F2F4F6]">
          <div className="flex items-center justify-between py-3">
            <span>
              <strong className="block text-[14px] font-bold text-[#191F28]">결제 3일 전</strong>
              <span className="text-[12px] font-medium text-[#8B95A1]">D-3 알림</span>
            </span>
            <ToggleSwitch checked={Boolean(subscription.alertD3)} onChange={(checked) => onUpdate(subscription.subscriptionId, { alertD3: checked })} label="결제 3일 전 알림" />
          </div>
          <div className="flex items-center justify-between py-3">
            <span>
              <strong className="block text-[14px] font-bold text-[#191F28]">결제 하루 전</strong>
              <span className="text-[12px] font-medium text-[#8B95A1]">D-1 알림</span>
            </span>
            <ToggleSwitch checked={Boolean(subscription.alertD1)} onChange={(checked) => onUpdate(subscription.subscriptionId, { alertD1: checked })} label="결제 하루 전 알림" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-[#F2F4F6] flex items-center justify-between">
          <span className="text-[12px] font-medium text-[#8B95A1]">알림 동작 미리보기</span>
          <Button
            size="compact"
            variant="secondary"
            prefixIcon={<Send size={13} />}
            onClick={() => onTriggerNotification?.(subscription)}
          >
            이 구독 알림 테스트
          </Button>
        </div>
      </section>

      {promotion && (
        <section className="mt-5 rounded-2xl border border-[#FFE8CC] bg-[#FFF9F2] p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#FF6F0F]">절약 기회</p>
          <h2 className="mt-1 text-[16px] font-bold text-[#191F28]">{promotion.title}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[#6B7684]">이 구독을 해지한 뒤 혜택을 받을 수 있어요.</p>
        </section>
      )}

      <div className="mt-8 space-y-3">
        <Button size="large" fullWidth className={highlightCancel ? "cancel-highlight" : ""} onClick={() => onStartCancel(subscription.subscriptionId, promotion)}>웹사이트에서 다이렉트 해지하기</Button>
        <Button size="large" fullWidth variant="secondary" onClick={() => setEditing((value) => !value)}>{editing ? "수정 닫기" : "구독 정보 수정"}</Button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("이 구독을 목록에서 삭제하시겠습니까?\n(단순 삭제 시 절약 통계에 누적되지 않습니다)")) {
              onDelete?.(subscription.subscriptionId || subscription.id);
            }
          }}
          className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold text-[#8B95A1] hover:text-[#FF4D4D] transition-colors"
        >
          <Trash2 size={15} />
          구독 삭제
        </button>
      </div>

      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-h-[85vh] max-w-full overflow-hidden rounded-2xl bg-black" onClick={(e) => e.stopPropagation()}>
            <img src={previewPhoto} alt="첨부 사진 원본" className="max-h-[80vh] w-auto object-contain rounded-xl" />
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
