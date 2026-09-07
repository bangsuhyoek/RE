import { useEffect, useState } from "react";
import { Check, CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import { BottomSheet, Button, ServiceMark } from "./ui";
import { formatWon } from "../lib/dates";

const baseSteps = [
  "서비스 계정으로 로그인하기",
  "멤버십 또는 구독 관리 메뉴 열기",
  "해지 신청 후 완료 화면 확인하기",
];

export function CancelModal({ subscription, promotion, onClose, onComplete, onToast }) {
  const [checked, setChecked] = useState([false, false, false]);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (!celebrating) return undefined;
    const timer = window.setTimeout(onClose, 1800);
    return () => window.clearTimeout(timer);
  }, [celebrating, onClose]);

  const goToCancel = () => {
    if (!subscription.cancelUrl) return;
    window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer");
    onToast(`${subscription.name} 해지 페이지를 새 탭에서 열었어요.`);
    setChecked((current) => [true, ...current.slice(1)]);
  };

  const complete = () => {
    onComplete(subscription);
    setCelebrating(true);
  };

  if (celebrating) {
    return (
      <BottomSheet onClose={onClose} label="해지 완료">
        <div className="flex flex-col items-center px-2 pb-5 pt-3 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-black text-white"><CheckCircle2 size={31} /></span>
          <h2 className="mt-5 text-[22px] font-bold tracking-[-0.02em]">월 {formatWon(subscription.amount)}<br />절약 성공!</h2>
          <p className="mt-3 text-[13px] leading-5 text-[#71717A]">{subscription.name}을 구독 목록에서 정리했어요. 절약한 금액은 다음 달에도 이어서 확인할 수 있어요.</p>
          {promotion && <p className="mt-4 rounded-xl bg-[#F4F4F5] px-3 py-2 text-[12px] text-[#71717A]">다음으로 {promotion.title} 혜택을 확인해 보세요.</p>}
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet onClose={onClose} label="구독 해지 가이드">
      <div className="flex items-start gap-3">
        <ServiceMark monogram={subscription.monogram} className="h-11 w-11 rounded-xl text-[13px]" />
        <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#71717A]">Direct cancel</p><h2 className="mt-1 truncate text-[20px] font-semibold tracking-[-0.02em]">{subscription.name} 해지하기</h2><p className="mt-1 text-[12px] text-[#71717A]">직접 해지 페이지와 단계별 안내를 준비했어요.</p></div>
      </div>

      {promotion && <div className="mt-5 rounded-xl border border-black bg-[#FAFAFA] px-3 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#71717A]">환승 혜택</p><p className="mt-1 text-[13px] font-semibold">{promotion.title}</p><p className="mt-1 text-[12px] text-[#71717A]">해지 후 혜택 페이지로 이어갈 수 있어요.</p></div>}

      <Button className="mt-5 w-full" disabled={!subscription.cancelUrl} onClick={goToCancel}><ExternalLink size={17} />{subscription.cancelUrl ? "해지 페이지로 바로 이동" : "해지 링크를 찾지 못했어요"}</Button>
      {!subscription.cancelUrl && <p className="mt-2 text-center text-[12px] text-[#EF4444]">이 서비스의 해지 URL이 DB에 등록되어 있지 않습니다.</p>}

      <section className="mt-6">
        <div className="flex items-center justify-between"><h3 className="text-[15px] font-semibold">해지 가이드</h3><span className="text-[12px] text-[#71717A]">Step 1–3</span></div>
        <ol className="mt-3 space-y-2">
          {baseSteps.map((step, index) => <li key={step}><button type="button" onClick={() => setChecked((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value))} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${checked[index] ? "border-black bg-[#FAFAFA]" : "border-[#E4E4E7] bg-white hover:border-[#A1A1AA]"}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${checked[index] ? "bg-black text-white" : "bg-[#F4F4F5] text-[#71717A]"}`}>{checked[index] ? <Check size={14} strokeWidth={3} /> : index + 1}</span><span className={`text-[13px] ${checked[index] ? "font-semibold" : "text-[#71717A]"}`}>{step}</span></button></li>)}
        </ol>
      </section>

      <div className="mt-6 rounded-xl bg-[#F4F4F5] px-3 py-3"><div className="flex gap-2"><ShieldCheck className="shrink-0" size={17} /><p className="text-[12px] leading-5 text-[#71717A]">SubMate는 해지를 대행하지 않아요. 해지 완료 여부는 서비스 화면에서 확인한 뒤 아래 버튼을 눌러주세요.</p></div></div>
      <Button variant="secondary" className="mt-4 w-full" onClick={complete}>해지 완료했습니다</Button>
    </BottomSheet>
  );
}
