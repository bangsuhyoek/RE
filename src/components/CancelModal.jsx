import { useEffect, useState } from "react";
import { Check, ExternalLink, ShieldCheck } from "lucide-react";
import { BottomSheet, Button, ServiceMark } from "./ui";
import { formatWon } from "../lib/dates";
import { RiveCharacter } from "./RiveCharacter";

const baseSteps = [
  "서비스 계정으로 로그인하기",
  "멤버십 또는 구독 관리 메뉴 열기",
  "해지 신청 후 완료 화면 확인하기",
];

export function CancelModal({ subscription, promotion, onClose, onComplete, onToast }) {
  const [checked, setChecked] = useState([false, false, false]);
  const [celebrating, setCelebrating] = useState(false);
  const allChecked = checked.every(Boolean);

  useEffect(() => {
    if (!celebrating) return undefined;
    const timer = window.setTimeout(onClose, 1800);
    return () => window.clearTimeout(timer);
  }, [celebrating, onClose]);

  const goToCancel = () => {
    if (!subscription.cancelUrl) return;
    window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer");
    onToast(`${subscription.name} 해지 페이지를 새 탭에서 열었어요.`);
    setChecked((current) => [true, current[1], current[2]]);
  };

  const toggleStep = (index) => {
    if (index > 0 && !checked[index - 1]) return;
    setChecked((current) => current.map((value, itemIndex) => {
      if (itemIndex === index) return !value;
      if (itemIndex > index) return false;
      return value;
    }));
  };

  const complete = () => {
    if (!allChecked) return;
    onComplete(subscription.subscriptionId, subscription.amount);
    setCelebrating(true);
  };

  if (celebrating) {
    return (
      <BottomSheet onClose={onClose} label="해지 완료">
        <div className="re-page-turn-soft flex flex-col items-center px-2 pb-5 pt-2 text-center">
          <RiveCharacter state="done" className="h-[190px] w-[220px]" />
          <h2 className="mt-1 text-[22px] font-bold tracking-[-0.02em] text-[#1B2A8C]">해지를 완료했어요</h2>
          <p className="mt-3 text-[13px] leading-5 text-[#71717A]">{subscription.name}은 구독 목록에서 바로 정리했어요.</p>
          <p className="mt-2 text-[12px] font-semibold text-black">이번 결제 기준 {formatWon(subscription.amount)}을 관리 목록에서 제외했어요.</p>
          {promotion && <p className="mt-4 rounded-xl bg-[#F4F4F5] px-3 py-2 text-[12px] text-[#71717A]">다음으로 {promotion.title} 혜택을 확인할 수 있어요.</p>}
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet onClose={onClose} label="구독 해지 가이드">
      <div className="re-page-turn-soft">
        <div className="flex items-start gap-3">
          <ServiceMark monogram={subscription.monogram} className="h-11 w-11 rounded-xl text-[13px]" />
          <div className="min-w-0 flex-1"><p className="re-eyebrow">DIRECT CANCEL</p><h2 className="mt-1 truncate text-[20px] font-semibold tracking-[-0.02em] text-[#1B2A8C]">{subscription.name} 해지하기</h2><p className="mt-1 text-[12px] text-[#71717A]">공식 해지 페이지와 단계별 안내를 준비했어요.</p></div>
          <RiveCharacter state="guide" className="h-[82px] w-[84px] shrink-0" />
        </div>

        {promotion && <div className="mt-5 rounded-xl border border-black bg-[#FAFAFA] px-3 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#71717A]">환승 혜택</p><p className="mt-1 text-[13px] font-semibold">{promotion.title}</p><p className="mt-1 text-[12px] text-[#71717A]">해지 후 혜택 페이지로 이어갈 수 있어요.</p></div>}

        <Button className="mt-5 w-full" disabled={!subscription.cancelUrl} onClick={goToCancel}><ExternalLink size={17} />{subscription.cancelUrl ? "해지 페이지로 바로 이동" : "해지 링크를 찾지 못했어요"}</Button>
        {!subscription.cancelUrl && <p className="mt-2 text-center text-[12px] text-[#EF4444]">이 서비스의 공식 해지 URL이 등록되어 있지 않습니다.</p>}

        <section className="mt-6">
          <div className="flex items-center justify-between"><h3 className="text-[15px] font-semibold">해지 가이드</h3><span className="text-[12px] text-[#71717A]">하나씩 확인해요</span></div>
          <ol className="mt-3 space-y-2">
            {baseSteps.map((step, index) => {
              const visible = index === 0 || checked[index - 1];
              if (!visible) return null;
              return (
                <li key={step} className="field-enter">
                  <button type="button" onClick={() => toggleStep(index)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${checked[index] ? "border-black bg-[#FAFAFA]" : "border-[#E4E4E7] bg-white hover:border-[#A1A1AA]"}`}>
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${checked[index] ? "bg-black text-white" : "bg-[#F4F4F5] text-[#71717A]"}`}>{checked[index] ? <Check size={14} strokeWidth={3} /> : index + 1}</span>
                    <span className={`text-[13px] ${checked[index] ? "font-semibold" : "text-[#71717A]"}`}>{step}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="mt-6 rounded-xl bg-[#F4F4F5] px-3 py-3"><div className="flex gap-2"><ShieldCheck className="shrink-0" size={17} /><p className="text-[12px] leading-5 text-[#71717A]">RE.는 해지를 대행하지 않아요. 공식 서비스에서 완료 여부를 직접 확인해 주세요. 완료 확인 시 구독은 목록에서 즉시 제거돼요.</p></div></div>
        {allChecked ? (
          <Button variant="secondary" className="field-enter mt-4 w-full" onClick={complete}>해지 완료했습니다</Button>
        ) : (
          <p className="mt-4 text-center text-[12px] text-[#71717A]">위 단계를 순서대로 확인하면 완료 버튼이 나타나요.</p>
        )}
      </div>
    </BottomSheet>
  );
}
