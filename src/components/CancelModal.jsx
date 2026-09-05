import { useMemo, useState } from "react";
import { ArrowLeft, Check, ExternalLink, X } from "lucide-react";
import { Button } from "./ui";
import { RECharacter, RELogo } from "./REBrand";

const steps = ["구독 선택", "해지 메뉴", "확인", "완료"];

function Progress({ current }) {
  return (
    <div className="mt-4 grid grid-cols-4 gap-1.5" aria-label={`해지 진행 ${current + 1}단계`}>
      {steps.map((label, index) => (
        <div key={label} className="min-w-0 text-center">
          <div className={`h-1.5 rounded-full ${index <= current ? "bg-[#8FA9DF]" : "bg-white/70"}`} />
          <span className={`mt-1.5 block truncate text-[9px] ${index === current ? "font-bold text-[#3746A5]" : "text-[#9099CA]"}`}>{index + 1} {label}</span>
        </div>
      ))}
    </div>
  );
}

export function CancelModal({ subscription, promotion, onClose, onComplete, onIncomplete, onToast }) {
  const [stage, setStage] = useState("guide");
  const cancelUrl = subscription?.cancelUrl;
  const serviceHost = useMemo(() => {
    try { return cancelUrl ? new URL(cancelUrl).hostname.replace(/^www\./, "") : "공식 서비스"; }
    catch { return "공식 서비스"; }
  }, [cancelUrl]);

  const openCancel = () => {
    if (!cancelUrl) {
      setStage("sorry");
      onToast?.("공식 해지 주소가 등록되어 있지 않아요.");
      return;
    }
    window.open(cancelUrl, "_blank", "noopener,noreferrer");
    setStage("confirm");
  };

  if (stage === "done") {
    return (
      <div className="fixed inset-0 z-50 bg-[#FAFCFF]">
        <div className="relative mx-auto min-h-screen max-w-[420px] overflow-hidden px-6 pb-8 pt-14 text-center">
          <img src="/re-assets/splash_bg.jpg" alt="" className="pointer-events-none absolute inset-x-0 bottom-0 w-full opacity-45" />
          <div className="relative z-10">
            <RELogo className="mx-auto w-fit" markClassName="h-[46px] w-auto" />
            <h1 className="mt-10 text-[26px] font-extrabold leading-[1.4] text-[#1B2A8C]">수고했어요!<br />정말 잘했어요. ☺</h1>
            <p className="mt-4 text-[14px] leading-6 text-[#9099CA]">해지 완료로 확인했어요.<br />구독은 바로 지우지 않고 확인 상태로 남겨둘게요.</p>
            <p className="re-hand mt-8 rotate-[-6deg] text-[22px]">잘 했어요!<br />또 만나요! ♡</p>
            <RECharacter state="complete" className="mx-auto mt-2 h-[250px] w-auto object-contain" />
            <Progress current={3} />
            <Button className="mt-5 w-full" onClick={() => onComplete(subscription.subscriptionId, "home")}>홈으로 돌아가기</Button>
            <Button variant="secondary" className="mt-3 w-full" onClick={() => onComplete(subscription.subscriptionId, "subscriptions")}>다른 구독도 확인하기</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#EDEFF1]">
      <div className="mx-auto min-h-screen max-w-[420px] overflow-hidden bg-[#EDEFF1]">
        <header className="flex h-[54px] items-center gap-3 px-4 text-[#5A636E]">
          <button type="button" onClick={onClose} aria-label="해지 가이드 닫기"><ArrowLeft size={18} /></button>
          <div className="mx-auto max-w-[230px] truncate rounded-lg bg-[#E2E5E8] px-6 py-1.5 text-[12px]">🔒 {serviceHost}</div>
          <button type="button" onClick={onClose} aria-label="닫기"><X size={18} /></button>
        </header>

        <section className="h-[360px] bg-[#D6D9DC] px-6 pt-10 text-[#5A636E]">
          <div className="text-[18px] font-black tracking-[0.08em] text-[#7B4D58]">{subscription.name?.toUpperCase()}</div>
          <h2 className="mt-7 text-[23px] font-extrabold text-[#41494F]">멤버십 해지</h2>
          <p className="mt-4 text-[14px] leading-6 text-[#6C757D]">공식 사이트의 해지 화면으로 이동해요.<br />실제 이용 가능 기간과 최종 해지 조건은<br />공식 페이지에서 확인해주세요.</p>
          <button type="button" onClick={openCancel} className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-[#54626F] py-3.5 text-[15px] font-bold text-[#EDEFF1]">
            해지 계속하기 <ExternalLink size={15} />
          </button>
        </section>

        <section className="re-guide-sheet relative -mt-1 min-h-[410px] rounded-t-[30px] px-6 pb-6 pt-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><RELogo markClassName="h-[26px] w-auto" /><strong className="text-[16px] text-[#1B2A8C]">가이드</strong></div>
            <button type="button" onClick={onClose} aria-label="가이드 닫기"><X size={18} className="text-[#7E8AC0]" /></button>
          </div>

          {stage === "sorry" ? (
            <div className="mt-5 rounded-[18px] bg-white/90 p-5">
              <strong className="text-[17px] text-[#1B2A8C]">지금은 바로 열어드릴 수 없어요.</strong>
              <p className="mt-2 text-[13px] leading-6 text-[#5B6DA9]">공식 해지 주소가 저장되어 있지 않아요. 잘못된 주소를 임의로 열지는 않을게요.</p>
              <RECharacter state="sorry" className="mx-auto mt-2 h-[160px] w-auto" />
              <Button variant="secondary" className="mt-3 w-full" onClick={onClose}>돌아가기</Button>
            </div>
          ) : (
            <>
              <div className="mt-5 rounded-[18px] bg-white/90 p-5">
                <strong className="text-[17px] text-[#1B2A8C]">{stage === "confirm" ? "해지를 완료하셨나요?" : "거의 다 왔어요!"}</strong>
                <p className="mt-2 text-[13px] leading-6 text-[#5B6DA9]">
                  {stage === "confirm"
                    ? "공식 페이지에서 해지를 마쳤다면 완료했다고 알려주세요. 완료 전에는 구독을 삭제하지 않아요."
                    : "위의 [해지 계속하기]를 누르면 공식 페이지가 새 탭으로 열려요. 어려우면 이 화면으로 돌아와 다시 이어갈 수 있어요."}
                </p>
                {promotion && <p className="mt-3 rounded-xl bg-[#E7F7F6] px-3 py-2 text-[11px] text-[#3E7B78]">참고 혜택: {promotion.title}</p>}
              </div>

              <p className="re-hand mt-4 rotate-[6deg] text-[20px]">화이팅!<br />조금만 더♡</p>
              <RECharacter state="guide" className="absolute bottom-4 right-5 h-[176px] w-auto object-contain" />

              <div className="absolute bottom-7 left-6 right-6 pr-[145px]">
                <Progress current={stage === "confirm" ? 2 : 1} />
                {stage === "confirm" && (
                  <div className="mt-3 flex flex-col gap-2">
                    <Button size="compact" onClick={() => setStage("done")}><Check size={14} /> 완료했어요</Button>
                    <button type="button" onClick={() => onIncomplete(subscription.subscriptionId)} className="text-[11px] font-bold text-[#7E8AC0] underline underline-offset-4">아직 못했어요 · 다음에 이어하기</button>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
