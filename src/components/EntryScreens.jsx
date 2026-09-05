import { useEffect } from "react";
import { ArrowRight, BellRing, CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "./ui";
import { RELogo, WaterBackground } from "./REBrand";
import { RiveCharacter } from "./RiveCharacter";

function Feature({ icon, title, copy }) {
  return (
    <div className="re-intro-feature">
      <span className="re-intro-feature-icon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{copy}</p>
      </div>
    </div>
  );
}

export function SplashScreen({ onDone }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 900);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <main className="re-splash relative min-h-screen overflow-hidden px-6">
      <WaterBackground variant="splash" />
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center text-center">
        <RELogo stacked className="re-splash-logo" markClassName="h-[72px] w-auto" />
        <p className="re-splash-tagline">지금도, 더 좋은 너를 향해.</p>
      </section>
    </main>
  );
}

export function LandingScreen({ onContinue }) {
  return (
    <main className="re-entry relative min-h-screen overflow-hidden px-6 pb-8 pt-8">
      <img src="/re-assets/hero.jpg" alt="" aria-hidden="true" className="re-entry-hero" />
      <div className="re-entry-overlay" aria-hidden="true" />
      <section className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col">
        <RELogo markClassName="h-[42px] w-auto" />
        <div className="mt-14 max-w-[330px]">
          <p className="re-eyebrow">YOUR SUBSCRIPTIONS, IN ONE PLACE</p>
          <h1 className="re-serif-title mt-3 text-[34px] font-bold leading-[1.24] tracking-[-0.04em] text-[#1B2A8C]">
            잊고 있던 구독까지,<br />RE.가 먼저 챙길게요.
          </h1>
          <p className="mt-5 text-[14px] leading-6 text-[#6C78AD]">
            흩어진 구독은 한곳에서 정리하고,<br />필요한 순간에는 먼저 알려드릴게요.
          </p>
        </div>
        <div className="re-entry-card mt-auto">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="re-entry-chip"><CreditCard size={16} /><span>구독 정리</span></div>
            <div className="re-entry-chip"><BellRing size={16} /><span>결제 전 확인</span></div>
            <div className="re-entry-chip"><ShieldCheck size={16} /><span>해지 안내</span></div>
          </div>
          <Button className="mt-5 w-full" onClick={onContinue}>다음 <ArrowRight size={17} /></Button>
        </div>
      </section>
    </main>
  );
}

export function IntroScreen({ onContinue }) {
  return (
    <main className="re-entry relative min-h-screen overflow-hidden px-6 pb-8 pt-9">
      <WaterBackground />
      <section className="relative z-10 flex min-h-[calc(100vh-4.25rem)] flex-col">
        <RELogo />
        <div className="mt-9 text-center">
          <p className="re-eyebrow">RE. CARE</p>
          <h1 className="re-serif-title mt-3 text-[30px] font-bold leading-[1.32] text-[#1B2A8C]">구독도, 나답게.<br />필요한 순간에만 함께.</h1>
          <p className="mt-4 text-[14px] leading-6 text-[#7E8AC0]">결제 전에 확인하고, 선택은 사용자에게 남겨두며,<br />RE.는 그 선택을 기억해요.</p>
        </div>

        <div className="relative mx-auto mt-5 h-[300px] w-full max-w-[330px]">
          <RiveCharacter state="idle" className="absolute inset-x-0 bottom-0 mx-auto h-[290px] w-full" />
        </div>

        <div className="re-intro-features mt-3 space-y-2">
          <Feature icon={<BellRing size={16} />} title="결제 전에 확인" copy="다가오는 결제를 놓치지 않도록 알려드려요." />
          <Feature icon={<ShieldCheck size={16} />} title="해지는 사용자가 결정" copy="공식 해지 화면까지 안내하고, 완료 확인 후 목록에서 정리해요." />
        </div>

        <Button className="mt-auto w-full" onClick={onContinue}>로그인하고 시작하기 <ArrowRight size={17} /></Button>
      </section>
    </main>
  );
}
