import { useEffect, useState } from "react";
import { ArrowRight, BellRing, ClipboardCheck, Search } from "lucide-react";
import { RELogo, WaterBackground } from "./REBrand";

let splashShownThisLoad = false;

export function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState(() => (splashShownThisLoad ? 2 : 0));

  useEffect(() => {
    if (splashShownThisLoad) {
      onDone();
      return undefined;
    }

    const bridgeTimer = window.setTimeout(() => setPhase(1), 720);
    const doneTimer = window.setTimeout(() => {
      splashShownThisLoad = true;
      setPhase(2);
      onDone();
    }, 1900);

    return () => {
      window.clearTimeout(bridgeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onDone]);

  if (phase >= 2) return null;

  return (
    <main className="re-mobile-splash" aria-label="RE. 시작 화면">
      <img
        src={phase === 0 ? "/re-assets/mobile/splash-logo.png" : "/re-assets/mobile/splash-bridge.png"}
        alt=""
        aria-hidden="true"
        className="re-mobile-splash__image"
      />
    </main>
  );
}

export function LandingScreen({ onContinue, onLogin }) {
  return (
    <main className="re-mobile-entry re-mobile-entry--landing">
      <WaterBackground />
      <section className="re-mobile-entry__center">
        <RELogo stacked size="xl" />
        <h1>가볍게 떠오르는 구독 관리</h1>
        <p>당신이 이미 확인한 구독을 기준으로, 필요한 순간만 함께해요.</p>
        <button type="button" className="re-mobile-primary-button" onClick={onContinue}>시작하기 <ArrowRight size={19} /></button>
        <button type="button" className="re-mobile-text-button" onClick={onLogin}>로그인</button>
      </section>
    </main>
  );
}

const introItems = [
  {
    icon: Search,
    title: "잊고 있던 구독을 찾아드려요",
    copy: "사용자가 등록하거나 확인한 구독을 한눈에 모아 관리해요.",
  },
  {
    icon: BellRing,
    title: "결제 전에 먼저 알려드려요",
    copy: "등록된 다음 결제일을 기준으로 D-3 · D-1 알림을 준비해요.",
  },
  {
    icon: ClipboardCheck,
    title: "해지 전 체크리스트로 놓치지 않게 도와드려요",
    copy: "이미 구현된 해지 안내 흐름을 따라 필요한 확인 항목을 정리해요.",
  },
];

export function IntroScreen({ onContinue }) {
  return (
    <main className="re-mobile-entry re-mobile-intro">
      <WaterBackground variant="onboarding" />
      <section className="re-mobile-intro__hero">
        <RELogo size="lg" />
        <div className="re-mobile-intro__hero-copy">
          <h1>작은 변화가,<br />더 여유로운 내일을<br />만들어요.</h1>
          <p>당신의 구독 생활을<br />더 가볍고, 더 좋은 방향으로.</p>
        </div>
        <img src="/re-assets/char_stand.jpg" alt="" aria-hidden="true" className="re-mobile-intro__character" />
      </section>

      <section className="re-mobile-intro__cards" aria-label="RE. 주요 기능">
        {introItems.map(({ icon: Icon, title, copy }) => (
          <article className="re-mobile-feature-card" key={title}>
            <span className="re-mobile-feature-card__icon"><Icon size={34} /></span>
            <div>
              <strong>{title}</strong>
              <p>{copy}</p>
            </div>
            <ArrowRight size={20} className="re-mobile-feature-card__arrow" />
          </article>
        ))}
      </section>

      <div className="re-mobile-intro__actions">
        <div className="re-mobile-dots" aria-hidden="true"><span className="is-active" /><span /><span /></div>
        <button type="button" className="re-mobile-primary-button" onClick={onContinue}>시작하기 <ArrowRight size={22} /></button>
        <button type="button" className="re-mobile-secondary-button is-inert" aria-disabled="true">나중에</button>
        <small>지금도, 더 좋은 너를 향해. RE.</small>
      </div>
    </main>
  );
}
