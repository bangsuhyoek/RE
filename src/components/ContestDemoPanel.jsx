import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Play,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { DEMO_PAYMENT_FIXTURES } from "../features/payment/paymentFixtures.js";
import { PaymentDecision, paymentRejectMessage } from "../features/payment/paymentDetection.js";

const FEATURED_FIXTURE_IDS = [
  "netflix-shinhan",
  "coupang-general",
  "netflix-cancel",
  "card-bill",
];

function fixtureById(id) {
  return DEMO_PAYMENT_FIXTURES.find((item) => item.id === id) || null;
}

export function ContestDemoPanel({
  active = false,
  phase = "IDLE",
  fixture = null,
  result = null,
  onRunScenario,
  onReset,
}) {
  const [open, setOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const featured = useMemo(
    () => FEATURED_FIXTURE_IDS.map(fixtureById).filter(Boolean),
    []
  );

  if (!active) return null;

  const isBusy = ["INCOMING", "ANALYZING"].includes(phase);

  return (
    <>
      {(phase === "INCOMING" || phase === "ANALYZING") && fixture && (
        <div
          className="fixed left-1/2 top-[max(12px,env(safe-area-inset-top,0px))] z-[250] w-[calc(100%-24px)] max-w-[420px] -translate-x-1/2"
          aria-live="polite"
        >
          <div className="rounded-[22px] border border-black/10 bg-[#191F28] px-4 py-3.5 text-white shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-[#FF6F0F] px-2 py-1 text-[10px] font-black tracking-[0.08em]">
                결제 알림
              </span>
              <span className="text-[11px] font-semibold text-white/55">방금</span>
            </div>
            <div className="mt-2 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-white/70">
                  {fixture.rawEvent.title}
                </div>
                <div className="mt-1 text-[15px] font-extrabold leading-5">
                  {fixture.rawEvent.body}
                </div>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-[17px]">
                ⚡
              </span>
            </div>
            {phase === "ANALYZING" && (
              <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-[12px] font-semibold text-white/75">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF8A3D]" />
                꾸독이 구독 결제인지 확인하고 있어요
              </div>
            )}
          </div>
        </div>
      )}

      <div className="fixed bottom-[calc(78px+env(safe-area-inset-bottom,0px))] left-1/2 z-[180] w-[calc(100%-24px)] max-w-[430px] -translate-x-1/2">
        <div className="overflow-hidden rounded-[22px] border border-[#E5E8EB] bg-white/95 shadow-[0_14px_40px_rgba(25,31,40,0.18)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            aria-expanded={open}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#FFF1E8] text-[15px]">⚡</span>
              <span className="min-w-0">
                <strong className="block truncate text-[13px] font-black text-[#191F28]">
                  결제 알림으로 구독 찾기
                </strong>
                <span className="block truncate text-[10.5px] font-medium text-[#8B95A1]">
                  웹에서는 알림 입력만 브라우저 환경에 맞게 재현해요
                </span>
              </span>
            </span>
            {open ? <ChevronDown size={17} className="text-[#8B95A1]" /> : <ChevronUp size={17} className="text-[#8B95A1]" />}
          </button>

          {open && (
            <div className="border-t border-[#F2F4F6] px-4 pb-4 pt-3">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onRunScenario?.("netflix-shinhan")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#191F28] px-3 py-3 text-[13px] font-extrabold text-white disabled:opacity-50"
              >
                <Play size={15} fill="currentColor" />
                최근 결제 확인하기
              </button>

              <div className="mt-3">
                <div className="mb-2 text-[11px] font-bold text-[#6B7684]">다른 결제 알림</div>
                <div className="grid grid-cols-2 gap-2">
                  {featured.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isBusy}
                      onClick={() => onRunScenario?.(item.id)}
                      className="rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-2.5 py-2.5 text-left text-[11px] font-bold leading-4 text-[#333D4B] disabled:opacity-50"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {phase === "MATCHED" && result?.decision === PaymentDecision.MATCH && (
                <div className="mt-3 rounded-xl bg-[#ECFDF3] px-3 py-2.5 text-[11.5px] leading-5 text-[#087443]">
                  <strong className="block font-extrabold">구독 결제로 확인했어요</strong>
                  {result.candidate.name} · {Number(result.candidate.amount).toLocaleString("ko-KR")}원 · {result.candidate.paymentMethod}
                </div>
              )}

              {phase === "REJECTED" && result?.decision === PaymentDecision.REJECT && (
                <div className="mt-3 rounded-xl bg-[#F8F9FA] px-3 py-2.5 text-[11.5px] leading-5 text-[#4E5968]">
                  <strong className="block font-extrabold text-[#333D4B]">구독으로 등록하지 않았어요</strong>
                  {paymentRejectMessage(result.reasonCode)}
                </div>
              )}

              <button
                type="button"
                onClick={() => setHowOpen((value) => !value)}
                className="mt-3 flex w-full items-center justify-between rounded-xl px-1 py-2 text-[11.5px] font-bold text-[#4E5968]"
              >
                <span className="flex items-center gap-1.5"><CircleHelp size={14} /> 웹에서는 어떻게 동작하나요?</span>
                {howOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {howOpen && (
                <div className="rounded-xl bg-[#F8F9FA] p-3 text-[11px] leading-[1.55] text-[#6B7684]">
                  <div className="flex items-start gap-2">
                    <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#3182F6]" />
                    <p>
                      웹 브라우저는 다른 앱의 Android 알림에 직접 접근할 수 없어 결제 알림 입력만 브라우저 환경에서 재현해요.
                      이후 서비스·금액·결제수단·요금제 판별, 오탐 차단, 사용자 검토와 등록은 꾸독의 실제 처리 로직으로 진행됩니다.
                    </p>
                  </div>
                  <div className="mt-2 border-t border-[#E5E8EB] pt-2 text-[10.5px]">
                    결제 알림 판별은 앱과 같은 규칙 기반 로직을 사용해요. AI는 영수증·결제 이미지의 텍스트를 읽는 데 사용하고, 저장 전에는 사용자가 내용을 확인합니다.
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={onReset}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E5E8EB] px-3 py-2.5 text-[11.5px] font-bold text-[#4E5968]"
              >
                <RotateCcw size={14} />
                등록 내용 초기화
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
