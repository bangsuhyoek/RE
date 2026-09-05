import { useEffect, useState } from "react";
import { ArrowRight, BellRing, ShieldCheck } from "lucide-react";
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

export function LandingScreen({ onContinue, onLogin }) {
  const [referenceFailed, setReferenceFailed] = useState(false);
  const source = referenceFailed ? "/re-assets/hero.jpg" : "/re-assets/web/landing-page-reference.png";

  return (
    <main className="re-reference-landing">
      <section className="re-reference-landing__canvas" aria-label="RE. 서비스 랜딩페이지">
        <img
          src={source}
          alt="RE. 구독 관리 서비스 소개와 대시보드 구성을 보여주는 랜딩페이지"
          className={`re-reference-landing__image ${referenceFailed ? "is-fallback" : ""}`}
          onError={() => setReferenceFailed(true)}
        />

        {!referenceFailed && (
          <>
            <button type="button" className="re-reference-hotspot re-reference-hotspot--login" onClick={onLogin} aria-label="로그인" />
            <button type="button" className="re-reference-hotspot re-reference-hotspot--header-start" onClick={onContinue} aria-label="시작하기" />
            <button type="button" className="re-reference-hotspot re-reference-hotspot--hero-start" onClick={onContinue} aria-label="지금 시작하기" />
          </>
        )}

        {referenceFailed && (
          <div className="re-reference-landing__fallback-copy">
            <RELogo markClassName="h-[54px] w-auto" />
            <h1>일상의 모든 선택이<br />더 가벼워질 수 있도록.</h1>
            <p>승인한 랜딩 이미지가 준비되면 원본 비율 그대로 표시돼요.</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={onContinue}>지금 시작하기 <ArrowRight size={18} /></Button>
              <Button variant="secondary" onClick={onLogin}>로그인</Button>
            </div>
          </div>
        )}
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

          <div className="mt-12 max-w-[540px] lg:mb-auto lg:mt-auto">
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
