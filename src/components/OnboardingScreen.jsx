import { Check, ChevronRight } from "lucide-react";
import { Button, ServiceMark } from "./ui";
import { RELogo, WaterBackground } from "./REBrand";

export function OnboardingScreen({ catalog, selectedIds, onToggle, onFinish, onSkip }) {
  const selected = catalog.filter((service) => selectedIds.includes(service.id));

  return (
    <main className="re-onboarding relative min-h-screen overflow-hidden pb-32">
      <WaterBackground />
      <div className="relative z-10 mx-auto w-full max-w-[1100px]">
        <header className="flex items-center justify-between px-5 pb-6 pt-7 sm:px-8">
          <RELogo />
          <button type="button" onClick={onSkip} className="text-[13px] font-medium text-[#71717A] underline underline-offset-4 hover:text-black">나중에 할게요</button>
        </header>

        <section className="px-5 sm:px-8">
          <p className="re-eyebrow">FIRST CARE</p>
          <h1 className="mt-2 text-[27px] font-bold leading-tight tracking-[-0.03em] text-[#1B2A8C]">현재 이용 중인<br />구독을 선택해주세요</h1>
          <p className="mt-3 max-w-[620px] text-[14px] leading-6 text-[#71717A]">서비스만 먼저 골라두면 금액·결제일·결제수단은 다음 단계에서 하나씩 직접 확인해요. 사용자 확인 전에는 임의의 구독 정보를 만들지 않아요.</p>
        </section>

        <section className="mt-8 grid grid-cols-2 gap-3 px-5 sm:grid-cols-3 sm:px-8 lg:grid-cols-4" aria-label="구독 서비스 선택">
          {catalog.map((service) => {
            const selectedNow = selectedIds.includes(service.id);
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => onToggle(service.id)}
                aria-pressed={selectedNow}
                className={`card-press relative min-h-36 rounded-2xl border p-4 text-left transition-colors ${selectedNow ? "border-black bg-[#FAFAFA]" : "border-[#E4E4E7] bg-white/90 hover:border-[#A1A1AA]"}`}
              >
                {selectedNow && <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-black text-white"><Check size={13} strokeWidth={3} /></span>}
                <ServiceMark monogram={service.monogram} className="h-10 w-10 rounded-xl text-[13px]" />
                <span className="mt-4 block truncate text-[14px] font-semibold">{service.name}</span>
                <span className="mt-1 block text-[12px] text-[#71717A]">{service.category}</span>
              </button>
            );
          })}
        </section>
      </div>

      <div className="re-onboarding-footer fixed bottom-0 left-1/2 z-30 w-full max-w-[420px] -translate-x-1/2 border-x border-t border-[#E4E4E7] bg-white/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between text-[13px]">
          <span className="font-medium text-[#71717A]"><strong className="font-semibold text-black">{selected.length}개</strong> 선택됨</span>
          <span className="text-[12px] text-[#71717A]">정보는 하나씩 확인해요</span>
        </div>
        <Button className="w-full" disabled={selected.length === 0} onClick={onFinish}>
          선택한 구독 정보 확인하기
          <ChevronRight size={17} />
        </Button>
      </div>
    </main>
  );
}
