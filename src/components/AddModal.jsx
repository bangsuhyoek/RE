import { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import { BottomSheet, Button } from "./ui";

const steps = [
  "어떤 구독인가요?",
  "얼마를 결제하나요?",
  "결제 주기를 알려주세요.",
  "다음 결제일은 언제인가요?",
  "마지막으로 확인할게요.",
];

export function AddModal({ catalog = [], onClose, onAdd }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    plan: "",
    amount: "",
    billingCycle: "",
    nextBillingDate: "",
    paymentMethod: "",
    isTrial: false,
  });

  const matched = useMemo(
    () => catalog.find((service) => service.name?.toLowerCase() === form.name.trim().toLowerCase()),
    [catalog, form.name]
  );

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const valid = [Boolean(form.name.trim()), Number(form.amount) > 0, Boolean(form.billingCycle), Boolean(form.nextBillingDate), true][step];
  const field = "re-field mt-3 w-full rounded-2xl px-4 py-3.5 text-[15px] outline-none";

  const submit = () => {
    const ok = onAdd({
      ...form,
      amount: Number(form.amount),
      plan: form.plan.trim() || "요금제 미등록",
      id: matched?.id,
      monogram: matched?.monogram,
      category: matched?.category,
      cancelUrl: matched?.cancelUrl,
    });
    if (ok !== false) onClose();
  };

  return (
    <BottomSheet onClose={onClose} label="구독 직접 등록">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => step ? setStep((current) => current - 1) : onClose()} className="re-icon-button" aria-label="이전 단계">
          {step ? <ArrowLeft size={18} /> : <X size={18} />}
        </button>
        <span className="text-[12px] font-bold text-[#7E8AC0]">{step + 1} / {steps.length}</span>
        <span className="w-10" />
      </div>

      <h2 className="mt-5 text-[22px] font-extrabold text-[#1B2A8C]">{steps[step]}</h2>
      <p className="mt-2 text-[12px] leading-5 text-[#9099CA]">한 번에 하나씩만 확인하면 돼요.</p>

      {step === 0 && (
        <div className="field-enter">
          <input autoFocus className={field} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="서비스명" />
          <input className={field} value={form.plan} onChange={(e) => set("plan", e.target.value)} placeholder="요금제 이름 (선택)" />
        </div>
      )}

      {step === 1 && (
        <div className="field-enter relative">
          <input autoFocus className={`${field} pr-12`} type="number" min="0" inputMode="numeric" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="결제 금액" />
          <span className="absolute right-4 top-[27px] text-[13px] text-[#9099CA]">원</span>
        </div>
      )}

      {step === 2 && (
        <div className="field-enter mt-4 grid grid-cols-2 gap-3">
          {["매월", "매년"].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => set("billingCycle", value)}
              className={`rounded-2xl border p-4 text-[14px] font-bold ${form.billingCycle === value ? "border-[#475FAC] bg-[#E3E6F7] text-[#3746A5]" : "border-[#E4EAF6] bg-white text-[#7E8AC0]"}`}
            >
              {value}
            </button>
          ))}
        </div>
      )}

      {step === 3 && (
        <input autoFocus className={`${field} field-enter`} type="date" value={form.nextBillingDate} onChange={(e) => set("nextBillingDate", e.target.value)} />
      )}

      {step === 4 && (
        <div className="field-enter mt-4 space-y-3">
          <label className="block">
            <span className="re-label">결제 수단 (선택)</span>
            <input className={field} value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)} placeholder="예: 신용카드, 네이버페이" />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-[#E4EAF6] bg-white/90 px-4 py-3.5">
            <span>
              <strong className="block text-[13px] text-[#3746A5]">무료 체험 중인가요?</strong>
              <span className="mt-1 block text-[11px] text-[#9099CA]">체험 종료 전 알림을 더 우선해서 보여드려요.</span>
            </span>
            <input type="checkbox" checked={form.isTrial} onChange={(e) => set("isTrial", e.target.checked)} className="h-5 w-5 accent-[#475FAC]" />
          </label>
        </div>
      )}

      {step < steps.length - 1 ? (
        <Button className="mt-6 w-full" disabled={!valid} onClick={() => setStep((current) => current + 1)}>
          다음 <ChevronRight size={17} />
        </Button>
      ) : (
        <Button className="mt-6 w-full" onClick={submit}>등록 완료</Button>
      )}
    </BottomSheet>
  );
}
