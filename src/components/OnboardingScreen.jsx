import { Check, ChevronRight } from "lucide-react";
import { Button, ServiceMark } from "./ui";
import { formatWon } from "../lib/dates";

export function OnboardingScreen({ catalog, selectedIds, onToggle, onFinish, onSkip }) {
  const selected = catalog.filter((service) => selectedIds.includes(service.id));
  const monthlyTotal = selected.reduce((total, service) => total + service.amount, 0);

  return (
    <main className="min-h-screen pb-32">
      <header className="flex items-center justify-between px-5 pb-6 pt-7">
        <span className="text-[13px] font-semibold text-[#71717A]">Step 1 of 2</span>
        <button type="button" onClick={onSkip} className="text-[13px] font-medium text-[#71717A] underline underline-offset-4 hover:text-black">건너뛰기</button>
      </header>
      <section className="px-5">
        <p className="text-[13px] font-medium text-[#71717A]">3초만에 완성해요</p>
        <h1 className="mt-2 text-[24px] font-bold leading-tight tracking-[-0.02em]">현재 이용 중인<br />구독을 선택해주세요</h1>
        <p className="mt-3 text-[14px] leading-6 text-[#71717A]">선택한 서비스의 기본 요금과 결제일을 자동으로 불러와요. 나중에 언제든 수정할 수 있어요.</p>
      </section>

      <section className="mt-8 grid grid-cols-2 gap-3 px-5" aria-label="구독 서비스 선택">
        {catalog.map((service) => {
          const selectedNow = selectedIds.includes(service.id);
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onToggle(service.id)}
              aria-pressed={selectedNow}
              className={`card-press relative min-h-36 rounded-2xl border p-4 text-left transition-colors ${selectedNow ? "border-black bg-[#FAFAFA]" : "border-[#E4E4E7] bg-white hover:border-[#A1A1AA]"}`}
            >
              {selectedNow && <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-black text-white"><Check size={13} strokeWidth={3} /></span>}
              <ServiceMark monogram={service.monogram} className="h-10 w-10 rounded-xl text-[13px]" />
              <span className="mt-4 block truncate text-[14px] font-semibold">{service.name}</span>
              <span className="mt-1 block text-[12px] text-[#71717A]">{formatWon(service.amount)} / 월</span>
            </button>
          );
        })}
      </section>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[420px] -translate-x-1/2 border-x border-t border-[#E4E4E7] bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mb-3 flex items-center justify-between text-[13px]">
          <span className="font-medium text-[#71717A]"><strong className="font-semibold text-black">{selected.length}개</strong> 선택됨</span>
          <span className="font-semibold">예상 월 {formatWon(monthlyTotal)}</span>
        </div>
        <Button className="w-full" disabled={selected.length === 0} onClick={onFinish}>
          선택한 {selected.length}개로 시작하기
          <ChevronRight size={17} />
        </Button>
      </div>
    </main>
  );
}
