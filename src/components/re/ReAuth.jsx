import React, { useState } from "react";
import { ArrowRight, ChevronRight, Eye, EyeOff, Leaf, Lock, User } from "lucide-react";

export function ReLandingScreen({ onStart, onSkip }) {
  const [slide, setSlide] = useState(0);

  const features = [
    {
      title: "잊고 있던 구독을 찾아드려요",
      desc: "나도 모르게 결제되고 있는 숨은 구독까지 한눈에 확인해요.",
      icon: "🔍",
    },
    {
      title: "결제 전에 먼저 알려드려요",
      desc: "다음 결제일을 미리 알려드려 불필요한 지출을 막을 수 있어요.",
      icon: "🔔",
    },
    {
      title: "해지 전 체크리스트로 놓치지 않게 도와드려요",
      desc: "해지 전 꼭 확인할 것들을 정리해 더 현명한 선택을 할 수 있어요.",
      icon: "📋",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 pb-8 text-center relative z-10">
      <div className="pt-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-[28px] font-black tracking-tight text-sky-600">RE.</span>
        </div>
        <h1 className="text-[24px] font-black text-slate-800 tracking-tight leading-snug">
          작은 변화가,<br />더 여유로운 내일을 만들어요.
        </h1>
        <p className="text-[13px] font-medium text-slate-500 mt-2">
          당신의 구독 생활을 더 가볍고, 더 좋은 방향으로.
        </p>
      </div>

      <div className="my-6 space-y-4">
        <div className="rounded-3xl bg-white/90 backdrop-blur-md p-6 border border-white/90 shadow-[0_8px_30px_rgba(147,197,253,0.2)] text-left flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-2xl flex items-center justify-center shrink-0">
            {features[slide].icon}
          </div>
          <div>
            <h3 className="text-[16px] font-extrabold text-slate-800 tracking-tight">
              {features[slide].title}
            </h3>
            <p className="text-[12px] font-medium text-slate-500 mt-1 leading-relaxed">
              {features[slide].desc}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5">
          {features.map((_, i) => (
            <span
              key={i}
              onClick={() => setSlide(i)}
              className={`h-2 rounded-full cursor-pointer transition-all ${
                slide === i ? "w-6 bg-sky-500" : "w-2 bg-slate-300"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onStart}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-500 text-white font-extrabold text-[15px] shadow-[0_6px_20px_rgba(79,172,254,0.35)] flex items-center justify-center gap-2 hover:opacity-95 transition-opacity"
        >
          <span>시작하기</span>
          <ArrowRight className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full py-3.5 rounded-2xl bg-white/70 hover:bg-white text-slate-600 font-bold text-[14px] border border-white/80 transition-colors"
        >
          나중에
        </button>
        <p className="text-[11px] font-medium text-slate-400 pt-2">
          지금도, 더 좋은 너를 향해. RE.
        </p>
      </div>
    </div>
  );
}

export function ReLoginScreen({ onLogin, onRegister, onGuest }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepLogin, setKeepLogin] = useState(true);
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 pb-8 relative z-10">
      <div className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[22px] font-black tracking-tight text-sky-600">RE.</span>
        </div>
        <h1 className="text-[26px] font-black text-slate-800 tracking-tight leading-tight">
          다시 만나서<br />반가워요. 🌸
        </h1>
        <p className="text-[13px] font-medium text-slate-500 mt-1">
          오늘도, 더 좋은 나를 만들어가요.
        </p>
      </div>

      <div className="my-6 rounded-3xl bg-white/90 backdrop-blur-md p-6 border border-white/90 shadow-[0_8px_30px_rgba(147,197,253,0.18)] space-y-3.5">
        <div className="relative">
          <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="아이디 또는 이메일"
            className="w-full h-12 pl-11 pr-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        <div className="relative">
          <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-full h-12 pl-11 pr-11 rounded-2xl bg-slate-50 border border-slate-200/80 text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between text-[12px] pt-1">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 font-medium">
            <input
              type="checkbox"
              checked={keepLogin}
              onChange={(e) => setKeepLogin(e.target.checked)}
              className="rounded text-sky-500 focus:ring-sky-400"
            />
            <span>로그인 상태 유지</span>
          </label>
          <button type="button" className="text-slate-500 hover:text-sky-600 font-medium">
            비밀번호 찾기 &gt;
          </button>
        </div>

        <button
          type="button"
          onClick={() => onLogin(email || "re.user@email.com")}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-500 text-white font-extrabold text-[15px] shadow-[0_6px_20px_rgba(79,172,254,0.35)] flex items-center justify-center gap-2 hover:opacity-95 transition-opacity mt-2"
        >
          <span>로그인</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="pt-2 text-center">
          <span className="text-[11px] font-medium text-slate-400">또는 다른 방법으로 로그인</span>
        </div>

        <button
          type="button"
          onClick={() => onLogin("Google 유저")}
          className="w-full py-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-between px-4 text-[13px] font-bold text-slate-700 shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-red-500 font-black">G</span>
            <span>Google로 로그인</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={() => onLogin("네이버 유저")}
          className="w-full py-3 rounded-2xl bg-[#03C75A]/10 hover:bg-[#03C75A]/20 border border-[#03C75A]/20 flex items-center justify-between px-4 text-[13px] font-bold text-[#03C75A] shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <span className="font-black">N</span>
            <span>네이버로 로그인</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#03C75A]" />
        </button>

        <button
          type="button"
          onClick={onGuest}
          className="w-full py-3 rounded-2xl bg-sky-50/80 hover:bg-sky-100/80 border border-sky-100 flex items-center justify-between px-4 text-[13px] font-bold text-sky-700 shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <Leaf className="w-4 h-4 text-emerald-500" />
            <span>둘러보기</span>
          </div>
          <ChevronRight className="w-4 h-4 text-sky-500" />
        </button>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onRegister}
          className="text-[13px] font-bold text-sky-600 hover:underline"
        >
          처음이신가요? 회원가입 &gt;
        </button>
      </div>
    </div>
  );
}

export function ReSignUpScreen({ onBack, onComplete }) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [nickname, setNickname] = useState("");

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 pb-8 relative z-10">
      <div className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[22px] font-black tracking-tight text-sky-600">RE.</span>
          <span className="text-[11px] font-semibold text-slate-400">지금도, 더 좋은 나를 향해.</span>
        </div>
        <h1 className="text-[26px] font-black text-slate-800 tracking-tight leading-tight">
          회원가입 🌸
        </h1>
        <p className="text-[13px] font-medium text-slate-500 mt-1">
          RE.와 함께, 더 가벼운 오늘을 시작해요.
        </p>
      </div>

      <div className="my-6 rounded-3xl bg-white/90 backdrop-blur-md p-6 border border-white/90 shadow-[0_8px_30px_rgba(147,197,253,0.18)] space-y-3.5 text-left">
        <div>
          <label className="text-[12px] font-bold text-slate-700">아이디</label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="아이디를 입력하세요."
            className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[13px] mt-1"
          />
          <span className="text-[10px] text-slate-400">영문, 숫자 조합 6자 이상</span>
        </div>

        <div>
          <label className="text-[12px] font-bold text-slate-700">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요."
            className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[13px] mt-1"
          />
          <span className="text-[10px] text-slate-400">영문, 숫자, 특수문자 조합 8자 이상</span>
        </div>

        <div>
          <label className="text-[12px] font-bold text-slate-700">비밀번호 확인</label>
          <input
            type="password"
            value={pwConfirm}
            onChange={(e) => setPwConfirm(e.target.value)}
            placeholder="비밀번호를 다시 입력하세요."
            className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[13px] mt-1"
          />
          <span className="text-[10px] text-slate-400">비밀번호가 일치해야 합니다.</span>
        </div>

        <div>
          <label className="text-[12px] font-bold text-slate-700">닉네임</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력하세요."
            className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[13px] mt-1"
          />
          <span className="text-[10px] text-slate-400">2자 이상, 한글·영문·숫자 사용 가능</span>
        </div>

        <button
          type="button"
          onClick={() => onComplete(nickname || "RE. 유저")}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-500 text-white font-extrabold text-[15px] shadow-sm mt-2"
        >
          가입하기
        </button>

        <p className="text-[10px] text-slate-400 text-center leading-relaxed">
          가입하면 RE.의 <span className="underline text-sky-600">이용약관</span>과 <span className="underline text-sky-600">개인정보처리방침</span>에 동의한 것으로 간주됩니다.
        </p>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="text-[13px] font-bold text-sky-600 hover:underline"
        >
          이미 계정이 있으신가요? 로그인 &gt;
        </button>
      </div>
    </div>
  );
}
