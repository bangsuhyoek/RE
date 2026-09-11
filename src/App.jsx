import React, { useState } from "react";
import { ReAppContainer } from "./components/re/ReTheme";

export default function App() {
  const [useReTheme, setUseReTheme] = useState(true);

  if (!useReTheme) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl border border-slate-700">
          <h2 className="text-xl font-bold mb-3">클래식 모드 준비 중</h2>
          <p className="text-slate-400 text-sm mb-6">
            현재 RE. Refresh Theme 디자인 시스템이 적용되어 있습니다.
          </p>
          <button
            type="button"
            onClick={() => setUseReTheme(true)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 font-bold text-white shadow-lg hover:opacity-90 transition-all"
          >
            RE. Refresh 테마로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <ReAppContainer
      onSwitchClassic={() => setUseReTheme(false)}
      onAddSubscription={() => {
        alert("구독 추가 기능: RE. Refresh 테마에서 새로운 구독 등록 흐름을 시작합니다.");
      }}
    />
  );
}
