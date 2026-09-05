import { useEffect } from "react";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CreditCard,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui";
import { RELogo, WaterBackground } from "./REBrand";

function IntroFeature({ icon, title, copy }) {
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

function LandingFeature({ icon, title, copy }) {
  return (
    <article className="re-web-section-card">
      {icon}
      <strong>{title}</strong>
      <p>{copy}</p>
    </article>
  );
}

export function SplashScreen({ onDone }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 1400);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <main className="re-splash relative min-h-screen overflow-hidden px-6">
      <WaterBackground variant="splash" />
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center text-center">
        <RELogo stacked className="re-splash-logo" markClassName="h-[86px] w-auto" />
        <p className="re-splash-tagline">지금도, 더 좋은 너를 향해.</p>
      </section>
    </main>
  );
}

export function LandingScreen({ onStart, onLogin }) {
  return (
    <main className="re-web-landing">
      <img src="/re-assets/hero.jpg" alt="" aria-hidden="true" className="re-web-landing-art" />
      <div className="re-web-landing-wash" aria-hidden="true" />

      <header className="re-web-nav">
        <RELogo markClassName="h-12 w-auto" />
        <nav className="re-web-nav-links" aria-label="서비스 소개 탐색">
          <a href="#features">주요 기능</a>
          <a href="#care">RE.가 돕는 순간</a>
          <a href="#start">시작하기</a>
        </nav>
        <div className="re-web-nav-actions">
          <Button variant="secondary" size="compact" onClick={onLogin}>로그인</Button>
          <Button size="compact" className="re-web-start-mini" onClick={onStart}>지금 시작하기 <ArrowRight size={15} /></Button>
        </div>
      </header>

      <section className="re-web-hero" id="start">
        <div className="re-web-copy">
          <p className="re-eyebrow">RETHINK · RELEASE · REYOU.</p>
          <h1 className="re-serif-title mt-4 text-[clamp(38px,4.4vw,66px)] font-bold leading-[1.12] tracking-[-0.045em] text-[#1B2A8C]">
            지금도,<br />더 좋은 너를 향해.
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6F7EB9]">
            구독의 시작도, 끝도. 언제나, 너와 함께.<br />흩어진 구독을 한곳에서 정리하고 필요한 순간에는 먼저 알려드릴게요.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button className="min-w-[180px]" onClick={onStart}>시작하기 <ArrowRight size={17} /></Button>
            <Button className="min-w-[150px]" variant="secondary" onClick={onLogin}>로그인</Button>
          </div>

          <div className="re-web-feature-strip" aria-label="핵심 기능">
            <div className="re-web-feature-chip"><CreditCard size={18} /><strong>구독 정리</strong><span>한곳에서 차분하게</span></div>
            <div className="re-web-feature-chip"><BellRing size={18} /><strong>결제 전 확인</strong><span>D-3, D-1을 놓치지 않게</span></div>
            <div className="re-web-feature-chip"><ShieldCheck size={18} /><strong>해지 안내</strong><span>공식 경로까지 단계별로</span></div>
          </div>
        </div>
      </section>

      <section className="re-web-sections" id="features">
        <div className="re-web-section-panel">
          <div className="mb-7 max-w-[640px]">
            <p className="re-eyebrow">MIND YOUR ESSENTIALS · LIVE LIGHTER</p>
            <h2 className="re-serif-title mt-2 text-[30px] font-bold tracking-[-0.03em] text-[#1B2A8C]">구독 관리, 더 가볍고 아름답게.</h2>
            <p className="mt-3 text-[14px] leading-6 text-[#7482B7]">기능은 또렷하게, 화면은 조용하고 다정하게. RE.는 필요한 순간에만 관리 흐름을 이어줘요.</p>
          </div>
          <div className="re-web-section-grid" id="care">
            <LandingFeature icon={<CreditCard size={23} />} title="흩어진 구독을 한눈에" copy="검색·필터·정렬과 결제 예정 정보를 한곳에서 확인해요." />
            <LandingFeature icon={<ReceiptText size={23} />} title="이미지·문자로 간단히 추가" copy="영수증 이미지 OCR, 결제 문자 붙여넣기, 직접 입력을 모두 지원해요." />
            <LandingFeature icon={<CalendarDays size={23} />} title="중요한 결제일을 기억" copy="캘린더와 D-3·D-1 알림으로 다음 결제를 미리 확인해요." />
            <LandingFeature icon={<Sparkles size={23} />} title="필요할 때만 곁에서 안내" copy="해지 경로와 단계는 안내하고, 최종 선택은 언제나 사용자에게 남겨둬요." />
          </div>
        </div>
      </section>
    </main>
  );
}

export function IntroScreen({ onContinue }) {
  return (
    <main className="re-intro-screen">
      <img src="/re-assets/hero.jpg" alt="" aria-hidden="true" className="re-intro-art" />
      <section className="re-intro-panel">
        <div className="re-intro-card">
          <RELogo markClassName="h-[44px] w-auto" />
          <div className="mt-7">
            <p className="re-eyebrow">RE. CARE</p>
            <h1 className="re-serif-title mt-3 text-[34px] font-bold leading-[1.25] tracking-[-0.035em] text-[#1B2A8C]">구독도, 나답게.<br />언제나, 너와 함께.</h1>
            <p className="mt-4 text-[14px] leading-6 text-[#7482B7]">복잡한 구독 관리는 이제 조금 가벼워질 거예요. 결제 전에 확인하고, 선택은 사용자에게 남겨두며, RE.는 그 흐름을 기억해요.</p>
          </div>

          <div className="re-intro-features mt-6 space-y-2">
            <IntroFeature icon={<BellRing size={16} />} title="결제 전에 확인" copy="다가오는 결제를 놓치지 않도록 필요한 순간에 알려드려요." />
            <IntroFeature icon={<ShieldCheck size={16} />} title="해지는 사용자가 결정" copy="공식 해지 화면까지 안내하고, 완료 확인 후 목록에서 즉시 정리해요." />
          </div>

          <Button className="mt-7 w-full" onClick={onContinue}>로그인하고 시작하기 <ArrowRight size={17} /></Button>
        </div>
      </section>
    </main>
  );
}
