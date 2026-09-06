import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { RELogo } from "./REBrand";

const FINAL_ASSET = "/re-assets/mobile-final";
let splashShownThisLoad = false;

export function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState(() => (splashShownThisLoad ? 2 : 0));

  useEffect(() => {
    if (splashShownThisLoad) {
      onDone();
      return undefined;
    }
    const brandTimer = window.setTimeout(() => setPhase(1), 880);
    const doneTimer = window.setTimeout(() => {
      splashShownThisLoad = true;
      setPhase(2);
      onDone();
    }, 2200);
    return () => {
      window.clearTimeout(brandTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onDone]);

  if (phase >= 2) return null;
  return (
    <main className="re-ref-splash" aria-label="RE. 시작 화면">
      <img
        src={phase === 0 ? `${FINAL_ASSET}/splash-final.webp` : `${FINAL_ASSET}/brand-intro-final.webp`}
        alt=""
        aria-hidden="true"
        className="re-ref-splash__image"
      />
    </main>
  );
}

/* Direct #/landing access is retained, but the native/web root now uses the exact two-stage splash above. */
export function LandingScreen({ onContinue }) {
  return (
    <main className="re-ref-static-landing">
      <img src={`${FINAL_ASSET}/brand-intro-final.webp`} alt="RE. 가볍게 떠오르는 구독 관리" />
      <button type="button" className="re-ref-static-landing__tap" onClick={onContinue} aria-label="RE. 시작하기" />
    </main>
  );
}

const introItems = [
  {
    image: "intro-feature-search.webp",
    title: "잊고 있던 구독을 찾아드려요",
    copy: "나도 모르게 결제되고 있는 숨은 구독까지 한눈에 확인해요.",
  },
  {
    image: "intro-feature-alert.webp",
    title: "결제 전에 먼저 알려드려요",
    copy: "다음 결제일을 미리 알려드려 불필요한 지출을 막을 수 있어요.",
  },
  {
    image: "intro-feature-checklist.webp",
    title: "해지 전 체크리스트로 놓치지 않게 도와드려요",
    copy: "해지 전 꼭 확인할 것들을 정리해 더 현명한 선택을 할 수 있어요.",
  },
];

export function IntroScreen({ onContinue }) {
  return (
    <main className="re-ref-entry re-ref-intro">
      <div className="re-ref-floral-frame" aria-hidden="true" />
      <header className="re-ref-entry__brand"><RELogo size="lg" /></header>

      <section className="re-ref-intro__hero">
        <div className="re-ref-intro__copy">
          <h1>작은 변화가,<br />더 여유로운 내일을<br />만들어요.</h1>
          <p>당신의 구독 생활을<br />더 가볍고, 더 좋은 방향으로.</p>
        </div>
        <div className="re-ref-character-window re-ref-character-window--intro" aria-hidden="true">
          <img src={`${FINAL_ASSET}/character-intro.webp`} alt="" />
        </div>
      </section>

      <section className="re-ref-intro__cards" aria-label="RE. 주요 기능">
        {introItems.map(({ image, title, copy }) => (
          <article className="re-ref-feature-card" key={title}>
            <span className="re-ref-feature-card__icon"><img src={`${FINAL_ASSET}/${image}`} alt="" aria-hidden="true" /></span>
            <div><strong>{title}</strong><p>{copy}</p></div>
            <ArrowRight size={18} className="re-ref-feature-card__arrow" />
          </article>
        ))}
      </section>

      <div className="re-ref-intro__actions">
        <div className="re-ref-dots" aria-hidden="true"><span className="is-active" /><span /><span /></div>
        <button type="button" className="re-ref-primary" onClick={onContinue}>시작하기 <ArrowRight size={20} /></button>
        <button type="button" className="re-ref-secondary is-inert" aria-disabled="true">나중에</button>
        <small>지금도, 더 좋은 너를 향해. RE.</small>
      </div>
    </main>
  );
}
