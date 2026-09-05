import { useEffect, useState } from "react";
import { ArrowRight, LockKeyhole, Plus, Search, ShieldCheck } from "lucide-react";
import { Button } from "./ui";
import { RECharacter, RELogo, WaterBackground } from "./REBrand";

export function OnboardingScreen({ onFindComplete, onManual }) {
  const [phase, setPhase] = useState("intro");

  useEffect(() => {
    if (phase !== "checking") return undefined;
    const timer = window.setTimeout(() => setPhase("web-limit"), 1500);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === "checking") {
    return (
      <main className="re-onboarding relative min-h-screen overflow-hidden px-6 pb-10 pt-9">
        <WaterBackground />
        <div className="relative z-10 flex min-h-[760px] flex-col items-center text-center">
          <RELogo />
          <div className="mt-20">
            <RECharacter state="loading" className="mx-auto h-[230px] w-auto object-contain" />
            <h1 className="mt-7 text-[25px] font-extrabold text-[#1B2A8C]">확인할 준비를 하고 있어요</h1>
            <p className="mt-3 text-[13px] leading-6 text-[#7E8AC0]">확인 전에는 어떤 구독도 자동으로 등록하지 않아요.</p>
            <p className="re-loading-copy mt-6 text-[13px] font-bold tracking-[0.08em] text-[#5B6DA9]">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "web-limit") {
    return (
      <main className="re-onboarding relative min-h-screen overflow-hidden px-6 pb-10 pt-9">
        <WaterBackground />
        <div className="relative z-10">
          <RELogo />
          <section className="mt-14 text-center">
            <RECharacter state="idle" className="mx-auto h-[210px] w-auto object-contain" />
            <h1 className="mt-6 text-[25px] font-extrabold leading-[1.4] text-[#1B2A8C]">웹 버전에서는 문자 내역을<br />직접 읽지 않아요.</h1>
            <p className="mt-4 text-[13px] leading-6 text-[#7E8AC0]">Android 앱에서 문자 접근 권한을 연결한 뒤에는<br />결제 문자에서 구독 후보를 찾을 수 있어요.</p>
          </section>
          <div className="mt-8 space-y-3">
            <Button className="w-full" onClick={onManual}><Plus size={17} /> 직접 등록할게요</Button>
            <Button variant="secondary" className="w-full" onClick={onFindComplete}>나중에 할게요</Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="re-onboarding relative min-h-screen overflow-hidden px-6 pb-10 pt-9">
      <WaterBackground />
      <div className="relative z-10">
        <RELogo />
        <section className="mt-12">
          <p className="re-eyebrow">FIRST CARE</p>
          <h1 className="mt-3 text-[29px] font-extrabold leading-[1.35] tracking-[-0.03em] text-[#1B2A8C]">지금 이용 중인 구독을<br />찾아볼까요?</h1>
          <p className="mt-4 text-[14px] leading-6 text-[#9099CA]">흩어진 구독은 한곳에서 정리하고,<br />필요한 순간에는 RE.가 먼저 알려드릴게요.</p>
        </section>

        <div className="mt-8 flex justify-center">
          <RECharacter state="loading" className="h-[210px] w-auto object-contain" />
        </div>

        <section className="re-glass-card rounded-[22px] p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#E3E6F7] text-[#3746A5]"><LockKeyhole size={18} /></span>
            <div>
              <strong className="block text-[14px] text-[#1B2A8C]">확인 전에는 등록하지 않아요</strong>
              <p className="mt-1 text-[12px] leading-5 text-[#7E8AC0]">구독으로 보이는 내역을 찾더라도 맞는지 확인한 뒤에만 관리에 추가해요.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#F4F7FD] px-3 py-2.5 text-[11px] text-[#7E8AC0]">
            <ShieldCheck size={15} /> 필요한 권한은 실제 Android 기능 연결 시에만 요청해요.
          </div>
        </section>

        <div className="mt-6 space-y-3">
          <Button className="w-full" onClick={() => setPhase("checking")}><Search size={17} /> 구독 찾아보기 <ArrowRight size={17} /></Button>
          <Button variant="secondary" className="w-full" onClick={onManual}><Plus size={17} /> 직접 등록할게요</Button>
        </div>
      </div>
    </main>
  );
}
