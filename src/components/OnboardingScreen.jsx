import { ChevronRight, LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "./ui";

export function OnboardingScreen({ onSkip }) {
  return (
    <main className="re-page min-h-screen px-5 pb-10 pt-8">
      <header className="flex items-center justify-between">
        <span className="re-serif text-[24px] font-semibold tracking-[-0.04em] text-[#303633]">RE.</span>
        <button type="button" onClick={onSkip} className="text-[12px] font-medium text-[#7d8983]">
          나중에
        </button>
      </header>

      <section className="pt-16">
        <div className="re-orb grid h-20 w-20 place-items-center rounded-full">
          <Sparkles size={25} strokeWidth={1.5} />
        </div>
        <p className="mt-9 text-[12px] font-semibold tracking-[0.12em] text-[#8b829d]">FIRST CARE</p>
        <h1 className="re-serif mt-3 text-[31px] font-semibold leading-[1.25] tracking-[-0.04em] text-[#303633]">
          지금 이용 중인 구독을<br />찾아볼까요?
        </h1>
        <p className="mt-5 text-[14px] leading-6 text-[#7d8983]">
          흩어진 구독은 한곳에서 정리하고,<br />
          필요한 순간에는 RE.가 먼저 알려드릴게요.
        </p>
      </section>

      <section className="re-soft-card mt-10 rounded-[24px] p-5">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/75 text-[#756d88]">
            <LockKeyhole size={18} />
          </span>
          <div>
            <strong className="block text-[13px] text-[#37413d]">확인 전에는 등록하지 않아요</strong>
            <p className="mt-1 text-[12px] leading-5 text-[#7d8983]">
              구독으로 보이는 내역을 찾더라도, 맞는지 확인한 뒤에만 관리에 추가해요.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-10">
        <Button className="w-full" onClick={onSkip}>
          구독 찾아보기
          <ChevronRight size={17} />
        </Button>
        <button type="button" onClick={onSkip} className="mt-4 w-full text-[12px] font-medium text-[#7d8983]">
          직접 등록할게요
        </button>
      </div>
    </main>
  );
}