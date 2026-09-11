import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck, Zap, BellRing } from "lucide-react";

export function SplashScreen({ onFinish }) {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 1100);
    const t2 = setTimeout(() => onFinish?.(), 1450);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white select-none cursor-pointer transition-opacity duration-300 ${
        fade ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-500 text-center px-4">
        {/* Brand Logo matching benchmarked style */}
        <div className="flex items-center gap-2">
          <span className="text-[38px] font-black tracking-tight text-[#111827]">
            꾸독
          </span>
          <span className="inline-flex items-center justify-center rounded-full bg-[#3182F6] px-3.5 py-1 text-[17px] font-black text-white shadow-sm">
            ₩
          </span>
        </div>
        <p className="mt-3 text-[14px] font-semibold text-gray-400 tracking-tight">
          스마트한 구독 소비의 시작
        </p>
      </div>

      <div className="absolute bottom-10 text-[12px] text-gray-300 font-medium">
        화면을 탭하면 바로 시작합니다
      </div>
    </div>
  );
}

export function LandingScreen({ onStart, onLogin }) {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-white flex flex-col justify-between px-6 pt-safe pb-10 select-none">
      {/* Top Brand */}
      <div className="pt-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[26px] font-black tracking-tight text-[#111827]">
            꾸독
          </span>
          <span className="inline-flex items-center justify-center rounded-full bg-[#3182F6] px-2.5 py-0.5 text-[12px] font-black text-white shadow-xs">
            ₩
          </span>
        </div>
        {onLogin && (
          <button
            type="button"
            onClick={onLogin}
            className="text-[13px] font-semibold text-gray-500 hover:text-black transition-colors cursor-pointer"
          >
            로그인
          </button>
        )}
      </div>

      {/* Center Hero */}
      <div className="my-auto py-10 text-center flex flex-col items-center">
        {/* Floating Visual Pill */}
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-[12px] font-bold text-blue-600 mb-6">
          <Zap size={14} /> AI 기반 스마트 구독 관리
        </div>

        <h1 className="text-[32px] sm:text-[36px] font-black tracking-tight text-black leading-tight">
          숨어있는 구독료,<br />
          <span className="text-[#3182F6]">가장 쉽게</span> 통제하세요
        </h1>

        <p className="mt-4 text-[14px] text-gray-500 max-w-[280px] leading-relaxed">
          결제 전 D-Day 알림부터 다이렉트 해지 가이드, 나만을 위한 최적의 환승 프로모션까지
        </p>

        {/* Feature Icons Grid */}
        <div className="mt-10 grid grid-cols-3 gap-4 w-full max-w-xs text-center">
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-black shadow-2xs mb-2">
              <BellRing size={20} />
            </div>
            <span className="text-[12px] font-bold text-gray-700">사전 결제 알림</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-black shadow-2xs mb-2">
              <ShieldCheck size={20} />
            </div>
            <span className="text-[12px] font-bold text-gray-700">원터치 해지 가이드</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-black shadow-2xs mb-2">
              <Zap size={20} />
            </div>
            <span className="text-[12px] font-bold text-gray-700">스마트 절약 추천</span>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="w-full space-y-3">
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-2xl bg-[#111827] text-white font-bold py-4 text-[16px] shadow-sm hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>꾸독 시작하기</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

