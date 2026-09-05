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
    const timer = window.setTimeout(onDone, 1350);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <main className="re-splash re-web-splash relative min-h-screen overflow-hidden">
      <WaterBackground variant="splash" />
      <div className="re-dream-orb re-dream-orb-a" aria-hidden="true" />
      <div className="re-dream-orb re-dream-orb-b" aria-hidden="true" />
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <RELogo stacked className="re-splash-logo" markClassName="h-[84px] w-auto md:h-[104px]" />
        <p className="re-splash-tagline mt-7">지금도, 더 좋은 너를 향해.</p>
        <p className="mt-2 text-[11px] font-semibold tracking-[0.28em] text-[#8090C2] md:text-[12px]">RETHINK · RELEASE · REYOU</p>
      </section>
    </main>
  );
}

export function LandingScreen({ onContinue }) {
  return (
    <main className="re-entry re-web-landing relative min-h-screen overflow-hidden">
      <div className="re-landing-art" aria-hidden="true">
        <img src="/re-assets/hero.jpg" alt="" className="re-landing-art-image" />
        <div className="re-landing-art-wash" />
      </div>

      <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1500px] grid-cols-1 lg:grid-cols-[minmax(0,1.18fr)_minmax(420px,.82fr)]">
        <div className="re-landing-visual-spacer hidden lg:block" aria-hidden="true" />

        <div className="re-landing-copy flex min-h-screen flex-col px-6 pb-8 pt-7 sm:px-10 lg:px-12 lg:pb-12 lg:pt-10 xl:px-16">
          <div className="flex items-center justify-between">
            <RELogo markClassName="h-[40px] w-auto md:h-[48px]" />
            <span className="rounded-full border border-white/80 bg-white/60 px-3 py-1.5 text-[10px] font-bold tracking-[0.16em] text-[#6677AD] shadow-sm backdrop-blur-md">RE. WEB</span>
          </div>

          <div className="mt-14 max-w-[560px] lg:mt-auto lg:mb-auto">
            <p className="re-eyebrow">YOUR SUBSCRIPTIONS, IN ONE PLACE</p>
            <h1 className="re-serif-title mt-4 text-[38px] font-bold leading-[1.2] tracking-[-0.045em] text-[#1B2A8C] sm:text-[46px] lg:text-[54px] xl:text-[62px]">
              잊고 있던 구독까지,<br />RE.가 먼저 챙길게요.
            </h1>
            <p className="mt-6 max-w-[500px] text-[15px] leading-7 text-[#6C78AD] sm:text-[16px] lg:text-[17px]">
              흩어진 구독은 한곳에서 정리하고, 필요한 순간에는 먼저 알려드릴게요.
              선택은 언제나 사용자에게 남겨두고, RE.는 그 선택을 기억합니다.
            </p>

            <div className="mt-8 grid max-w-[520px] grid-cols-3 gap-2.5 text-center sm:gap-3">
              <div className="re-entry-chip"><CreditCard size={18} /><span>구독 정리</span></div>
              <div className="re-entry-chip"><BellRing size={18} /><span>결제 전 확인</span></div>
              <div className="re-entry-chip"><ShieldCheck size={18} /><span>해지 안내</span></div>
            </div>

            <Button className="mt-8 min-h-[52px] w-full max-w-[420px] sm:min-h-[56px]" onClick={onContinue}>
              서비스 소개 보기 <ArrowRight size={18} />
            </Button>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-white/70 pt-4 text-[10px] font-semibold tracking-[0.18em] text-[#8E9BC7] lg:mt-0">
            <span>RETHINK · RELEASE · REYOU</span>
            <span>2026</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export function IntroScreen({ onContinue }) {
  return (
    <main className="re-entry re-web-intro relative min-h-screen overflow-hidden">
      <WaterBackground />
      <div className="re-dream-orb re-dream-orb-c" aria-hidden="true" />

      <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1380px] grid-cols-1 items-stretch lg:grid-cols-[.94fr_1.06fr]">
        <div className="re-intro-copy flex flex-col px-6 pb-8 pt-8 sm:px-10 lg:px-12 lg:pb-12 lg:pt-10 xl:px-16">
          <RELogo markClassName="h-[38px] w-auto md:h-[44px]" />

          <div className="mt-12 max-w-[540px] lg:mt-auto lg:mb-auto">
            <p className="re-eyebrow">RE. CARE</p>
            <h1 className="re-serif-title mt-4 text-[36px] font-bold leading-[1.25] tracking-[-0.04em] text-[#1B2A8C] sm:text-[44px] lg:text-[50px]">
              구독도, 나답게.<br />필요한 순간에만 함께.
            </h1>
            <p className="mt-5 text-[15px] leading-7 text-[#7E8AC0] sm:text-[16px]">
              결제 전에 확인하고, 선택은 사용자에게 남겨두며, RE.는 그 선택을 기억해요.
            </p>

            <div className="re-intro-features mt-7 space-y-3">
              <Feature icon={<BellRing size={17} />} title="결제 전에 확인" copy="다가오는 결제를 놓치지 않도록 필요한 순간에만 알려드려요." />
              <Feature icon={<ShieldCheck size={17} />} title="해지는 사용자가 결정" copy="공식 해지 화면까지 안내하고, 완료 확인 후 목록에서 바로 정리해요." />
            </div>

            <Button className="mt-8 min-h-[52px] w-full max-w-[420px] sm:min-h-[56px]" onClick={onContinue}>
              로그인하고 시작하기 <ArrowRight size={18} />
            </Button>
          </div>
        </div>

        <div className="re-intro-visual relative min-h-[420px] overflow-hidden lg:min-h-screen">
          <img src="/re-assets/hero.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(250,252,255,.92)_0%,rgba(250,252,255,.36)_34%,rgba(250,252,255,.08)_100%)] lg:block" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#FBFCFF] via-[#FBFCFF]/55 to-transparent" aria-hidden="true" />
          <div className="absolute bottom-6 left-1/2 h-[250px] w-[260px] -translate-x-1/2 lg:bottom-10 lg:h-[320px] lg:w-[340px]">
            <RiveCharacter state="idle" className="h-full w-full drop-shadow-[0_18px_28px_rgba(62,67,132,.15)]" />
          </div>
        </div>
      </section>
    </main>
  );
}
