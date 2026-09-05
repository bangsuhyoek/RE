import { useEffect } from "react";
import { ArrowRight, BellRing, CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "./ui";
import { RECharacter, RELogo, WaterBackground } from "./REBrand";

export function LandingScreen({ onStart, onLogin }) {
  return (
    <main className="re-entry re-landing relative min-h-screen overflow-hidden px-6 pb-8 pt-8">
      <img src="/re-assets/hero.jpg" alt="" className="re-entry-hero" />
      <div className="re-entry-overlay" />
      <section className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col">
        <RELogo markClassName="h-[42px] w-auto" />
        <div className="mt-14 max-w-[330px]">
          <p className="re-eyebrow">YOUR SUBSCRIPTIONS, IN ONE PLACE</p>
          <h1 className="re-serif-title mt-3 text-[34px] font-bold leading-[1.24] tracking-[-0.04em] text-[#1B2A8C]">
            잊고 있던 구독까지,<br />RE.가 먼저 챙길게요.
          </h1>
          <p className="mt-5 text-[14px] leading-6 text-[#6C78AD]">
            흩어진 구독은 한곳에서 정리하고,<br />결제 전 확인과 해지 과정까지 이어서 관리해요.
          </p>
        </div>

        <div className="mt-auto rounded-[26px] border border-white/90 bg-white/80 p-5 shadow-[0_18px_50px_rgba(50,72,155,.12)] backdrop-blur-xl">
          <div className="grid grid-cols-3 gap-2 text-center">
            <EntryFeature icon={<CreditCard size={16} />} label="구독 정리" />
            <EntryFeature icon={<BellRing size={16} />} label="결제 전 확인" />
            <EntryFeature icon={<ShieldCheck size={16} />} label="해지 안내" />
          </div>
          <Button className="mt-5 w-full" onClick={onStart}>RE. 시작하기 <ArrowRight size={17} /></Button>
          <button type="button" onClick={onLogin} className="mx-auto mt-3 block text-[12px] font-bold text-[#6371A9] underline underline-offset-4">이미 계정이 있어요</button>
        </div>
      </section>
    </main>
  );
}

function EntryFeature({ icon, label }) {
  return <div className="rounded-2xl bg-[#F5F7FC]/90 px-2 py-3 text-[#475FAC]"><span className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-white">{icon}</span><span className="mt-2 block text-[10px] font-bold">{label}</span></div>;
}

export function SplashScreen({ onDone }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 900);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <main className="re-splash relative min-h-screen overflow-hidden px-6">
      <WaterBackground />
      <section className="relative z-10 flex min-h-screen flex-col items-center pt-[126px] text-center">
        <RELogo stacked className="re-splash-logo" />
        <h1 className="mt-7 text-[16px] font-bold tracking-[0.04em] text-[#1B2A8C]">지금도, 더 좋은 너를 향해.</h1>
        <p className="re-eyebrow mt-auto mb-[70px]">RETHINK. &nbsp; RELEASE. &nbsp; REYOU.</p>
      </section>
    </main>
  );
}

export function IntroScreen({ onContinue, onBack }) {
  return (
    <main className="re-entry relative min-h-screen overflow-hidden px-6 pb-8 pt-9">
      <WaterBackground />
      <section className="relative z-10 flex min-h-[calc(100vh-4.25rem)] flex-col">
        <div className="flex items-center justify-between"><RELogo /><button type="button" onClick={onBack} className="text-[12px] font-bold text-[#7E8AC0]">처음으로</button></div>
        <div className="mt-10 text-center">
          <p className="re-eyebrow">RE. CARE</p>
          <h1 className="re-serif-title mt-3 text-[30px] font-bold leading-[1.32] text-[#1B2A8C]">구독도, 나답게.<br />필요한 순간에만 함께.</h1>
          <p className="mt-4 text-[14px] leading-6 text-[#7E8AC0]">결제 전에 묻고, 선택은 사용자에게 남겨두며,<br />RE.는 그 선택을 기억해요.</p>
        </div>
        <div className="relative mx-auto mt-5 h-[330px] w-full max-w-[330px]">
          <RECharacter state="stand" className="absolute inset-x-0 bottom-0 mx-auto h-[320px] w-auto object-contain" />
          <span className="absolute left-2 top-8 rounded-full bg-white/85 px-3 py-2 text-[11px] font-bold text-[#475FAC] shadow-sm">결제 전 확인</span>
          <span className="absolute right-0 top-28 rounded-full bg-white/85 px-3 py-2 text-[11px] font-bold text-[#6E7AA8] shadow-sm">해지 이어하기</span>
          <span className="absolute left-5 bottom-10 inline-flex items-center gap-1 rounded-full bg-white/85 px-3 py-2 text-[11px] font-bold text-[#4D8B7E] shadow-sm"><CheckCircle2 size={13} /> 선택 기억</span>
        </div>
        <Button className="mt-auto w-full" onClick={onContinue}>로그인하고 시작하기 <ArrowRight size={17} /></Button>
      </section>
    </main>
  );
}
