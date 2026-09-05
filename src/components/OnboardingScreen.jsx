import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, Plus, Search, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "./ui";
import { RECharacter, RELogo, WaterBackground } from "./REBrand";

export function OnboardingScreen({ onFindComplete, onManual }) {
  const [phase, setPhase] = useState("intro");

  useEffect(() => {
    if (phase !== "checking") return undefined;
    const timer = window.setTimeout(() => setPhase("unavailable"), 1400);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === "permission") {
    return (
      <main className="re-onboarding relative min-h-screen overflow-hidden px-6 pb-10 pt-8">
        <WaterBackground />
        <div className="relative z-10">
          <div className="flex items-center justify-between"><button type="button" onClick={() => setPhase("intro")} className="re-icon-button" aria-label="이전 단계"><ArrowLeft size={20} /></button><RELogo /><span className="w-10" /></div>
          <section className="mt-10 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-white/85 text-[#475FAC] shadow-sm"><Smartphone size={25} /></span>
            <p className="re-eyebrow mt-5">ANDROID PERMISSION</p>
            <h1 className="mt-2 text-[27px] font-extrabold leading-[1.36] text-[#1B2A8C]">문자에서 결제 내역을<br />확인하려면 권한이 필요해요.</h1>
            <p className="mt-4 text-[13px] leading-6 text-[#7E8AC0]">실제 Android 앱에서만 문자 읽기 권한을 요청해요.<br />웹에서는 문자 내역을 읽지 않아요.</p>
          </section>
          <section className="re-glass-card mt-8 rounded-[22px] p-5">
            <div className="space-y-4">
              <PermissionRow icon={<Search size={17} />} title="결제 문자 후보 찾기" copy="구독으로 보이는 결제 문자를 찾는 데 사용해요." />
              <PermissionRow icon={<CheckCircle2 size={17} />} title="사용자 확인 후 등록" copy="찾았다는 이유만으로 자동 등록하지 않아요." />
              <PermissionRow icon={<ShieldCheck size={17} />} title="필요한 범위만 사용" copy="실제 권한 연결 전에는 접근했다고 표시하지 않아요." />
            </div>
          </section>
          <div className="mt-7 space-y-3"><Button className="w-full" onClick={() => setPhase("checking")}>웹에서 가능한 상태 확인 <ArrowRight size={17} /></Button><Button variant="secondary" className="w-full" onClick={onManual}><Plus size={17} /> 직접 등록할게요</Button></div>
        </div>
      </main>
    );
  }

  if (phase === "checking") {
    return (
      <main className="re-onboarding relative min-h-screen overflow-hidden px-6 pb-10 pt-9"><WaterBackground /><div className="relative z-10 flex min-h-[760px] flex-col items-center text-center"><RELogo /><div className="mt-20"><RECharacter state="loading" className="mx-auto h-[230px] w-auto object-contain" /><h1 className="mt-7 text-[25px] font-extrabold text-[#1B2A8C]">확인할 준비를 하고 있어요</h1><p className="mt-3 text-[13px] leading-6 text-[#7E8AC0]">확인 전에는 어떤 구독도 자동으로 등록하지 않아요.</p><p className="re-loading-copy mt-6 text-[13px] font-bold tracking-[0.08em] text-[#5B6DA9]">Loading...</p></div></div></main>
    );
  }

  if (phase === "unavailable") {
    return (
      <main className="re-onboarding relative min-h-screen overflow-hidden px-6 pb-10 pt-8">
        <WaterBackground />
        <div className="relative z-10">
          <RELogo />
          <section className="mt-10 text-center"><RECharacter state="sorry" className="mx-auto h-[205px] w-auto object-contain" /><p className="re-eyebrow mt-4">WEB LIMIT</p><h1 className="mt-2 text-[25px] font-extrabold leading-[1.4] text-[#1B2A8C]">웹 버전에서는 문자 내역을<br />직접 읽을 수 없어요.</h1><p className="mt-4 text-[13px] leading-6 text-[#7E8AC0]">Android 앱에서 권한 기능이 연결되면<br />결제 문자 → 후보 확인 → 등록 순서로 이어질 예정이에요.</p></section>
          <section className="re-glass-card mt-7 rounded-[20px] p-4"><p className="text-[11px] font-bold text-[#5B6DA9]">앞으로 연결될 UX</p><p className="mt-2 text-[12px] leading-5 text-[#7E8AC0]">권한 허용 → 탐색 중 → 후보 1개씩 확인 → 등록 완료 / 발견 없음 / 오류 상태</p></section>
          <div className="mt-7 space-y-3"><Button className="w-full" onClick={onManual}><Plus size={17} /> 직접 등록할게요</Button><Button variant="secondary" className="w-full" onClick={onFindComplete}>나중에 할게요</Button></div>
        </div>
      </main>
    );
  }

  return (
    <main className="re-onboarding relative min-h-screen overflow-hidden px-6 pb-10 pt-9">
      <WaterBackground />
      <div className="relative z-10">
        <RELogo />
        <section className="mt-12"><p className="re-eyebrow">FIRST CARE</p><h1 className="mt-3 text-[29px] font-extrabold leading-[1.35] tracking-[-0.03em] text-[#1B2A8C]">지금 이용 중인 구독을<br />찾아볼까요?</h1><p className="mt-4 text-[14px] leading-6 text-[#9099CA]">흩어진 구독은 한곳에서 정리하고,<br />필요한 순간에는 RE.가 먼저 알려드릴게요.</p></section>
        <div className="mt-8 flex justify-center"><RECharacter state="loading" className="h-[210px] w-auto object-contain" /></div>
        <section className="re-glass-card rounded-[22px] p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#E3E6F7] text-[#3746A5]"><LockKeyhole size={18} /></span><div><strong className="block text-[14px] text-[#1B2A8C]">확인 전에는 등록하지 않아요</strong><p className="mt-1 text-[12px] leading-5 text-[#7E8AC0]">구독으로 보이는 내역을 찾더라도 맞는지 확인한 뒤에만 관리에 추가해요.</p></div></div><div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#F4F7FD] px-3 py-2.5 text-[11px] text-[#7E8AC0]"><ShieldCheck size={15} /> 필요한 권한은 실제 Android 기능 연결 시에만 요청해요.</div></section>
        <div className="mt-6 space-y-3"><Button className="w-full" onClick={() => setPhase("permission")}><Search size={17} /> 구독 찾아보기 <ArrowRight size={17} /></Button><Button variant="secondary" className="w-full" onClick={onManual}><Plus size={17} /> 직접 등록할게요</Button></div>
      </div>
    </main>
  );
}

function PermissionRow({ icon, title, copy }) {
  return <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F3F5FB] text-[#475FAC]">{icon}</span><div><strong className="block text-[13px] text-[#3746A5]">{title}</strong><p className="mt-1 text-[11px] leading-5 text-[#7E8AC0]">{copy}</p></div></div>;
}
