import { useEffect, useState } from "react";
import { ArrowRight, BellRing, ShieldCheck } from "lucide-react";
import { Button } from "./ui";
import { RELogo, WaterBackground } from "./REBrand";
import { RiveCharacter } from "./RiveCharacter";

let refreshShownThisLoad = false;

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

function RefreshBrand() {
  return (
    <main className="re-splash re-web-splash re-refresh-screen relative min-h-screen overflow-hidden">
      <WaterBackground variant="splash" />
      <div className="re-dream-orb re-dream-orb-a" aria-hidden="true" />
      <div className="re-dream-orb re-dream-orb-b" aria-hidden="true" />
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <RELogo stacked size="xl" className="re-splash-logo re-refresh-logo" />
        <p className="re-splash-tagline mt-8">지금도, 더 좋은 너를 향해.</p>
        <p className="mt-2 text-[11px] font-semibold tracking-[0.28em] text-[#8090C2] md:text-[12px]">
          RETHINK · RELEASE · REYOU
        </p>
      </section>
    </main>
  );
}

export function SplashScreen({ onDone }) {
  const instant = refreshShownThisLoad;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshShownThisLoad = true;
      onDone();
    }, instant ? 0 : 1350);
    return () => window.clearTimeout(timer);
  }, [instant, onDone]);

  if (instant) return null;
  return <RefreshBrand />;
}

export function LandingScreen({ onContinue, onLogin }) {
  const [referenceFailed, setReferenceFailed] = useState(false);
  const [showRefresh, setShowRefresh] = useState(() => !refreshShownThisLoad);
  const source = referenceFailed ? "/re-assets/hero.jpg" : "/re-assets/web/landing-page-reference.png";

  useEffect(() => {
    if (!showRefresh) return undefined;
    const timer = window.setTimeout(() => {
      refreshShownThisLoad = true;
      setShowRefresh(false);
    }, 1350);
    return () => window.clearTimeout(timer);
  }, [showRefresh]);

  if (showRefresh) return <RefreshBrand />;

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
            <RELogo size="lg" />
            <h1>일상의 모든 선택이<br />더 가벼워질 수 있도록.</h1>
            <p>승인한 랜딩페이지 원본을 불러오지 못했어요.</p>
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
    <main className="re-entry re-web-intro re-final-intro relative min-h-screen overflow-hidden">
      <WaterBackground />
      <div className="re-dream-orb re-dream-orb-c" aria-hidden="true" />

      <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1280px] grid-cols-1 items-center gap-7 px-5 py-8 lg:grid-cols-[1fr_.78fr] lg:px-10">
        <div className="re-intro-copy rounded-[30px] border border-white/80 bg-white/72 px-6 py-7 shadow-[0_22px_60px_rgba(66,84,154,.12)] backdrop-blur-xl sm:px-9 lg:px-12 lg:py-10">
          <RELogo size="md" />

          <div className="mt-10 max-w-[560px]">
            <p className="re-eyebrow">RE. CARE</p>
            <h1 className="re-serif-title mt-4 text-[36px] font-bold leading-[1.24] tracking-[-0.04em] text-[#1B2A8C] sm:text-[44px] lg:text-[50px]">
              구독도, 나답게.<br />필요한 순간에만 함께.
            </h1>
            <p className="mt-5 text-[15px] leading-7 text-[#7080B6] sm:text-[16px]">
              결제 전에 확인하고, 선택은 사용자에게 남겨두며, RE.는 그 선택을 기억해요.
            </p>

            <div className="re-intro-features mt-7 space-y-3">
              <Feature icon={<BellRing size={17} />} title="결제 전에 확인" copy="다가오는 결제를 놓치지 않도록 필요한 순간에만 알려드려요." />
              <Feature icon={<ShieldCheck size={17} />} title="해지는 사용자가 결정" copy="공식 해지 화면까지 안내하고, 완료 확인 후 목록에서 바로 정리해요." />
            </div>

            <Button className="mt-8 min-h-[54px] w-full max-w-[420px]" onClick={onContinue}>
              로그인하고 시작하기 <ArrowRight size={18} />
            </Button>
          </div>
        </div>

        <div className="re-intro-sd-panel">
          <div className="re-intro-sd-panel__copy">
            <span>언제나, 너와 함께.</span>
            <strong>RE.가 필요한 순간을 같이 챙길게요.</strong>
          </div>
          <RiveCharacter state="idle" className="re-intro-sd-character" />
        </div>
      </section>
    </main>
  );
}
