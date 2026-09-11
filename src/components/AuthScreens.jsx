import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, LockKeyhole, RefreshCw, UserRound, Sparkles } from "lucide-react";
import { Button } from "./ui";

const fieldBase = "w-full rounded-xl border border-[#E4E4E7] bg-white px-4 py-3.5 text-[15px] outline-none transition-colors placeholder:text-[#A1A1AA] focus:border-black";

function GoogleIcon({ className = "h-5 w-5 shrink-0" }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.32 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.68 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export function AuthLogin({ onSocial, onRegister, onLogin }) {
  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleIdLogin = (event) => {
    event.preventDefault();
    if (!accountId.trim() || !password) return;
    setLoginError("");
    if (onLogin) {
      const result = onLogin({ accountId: accountId.trim(), password });
      if (result && result.error) {
        setLoginError(result.error);
      }
    } else {
      onSocial("아이디", accountId.trim());
    }
  };

  return (
    <main className="flex min-h-screen min-h-[100dvh] flex-col px-4 sm:px-5 pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1rem))] pt-[max(2.5rem,calc(env(safe-area-inset-top,0px)+1.5rem))]">
      <div className="mb-10">
        <p className="mb-2 text-[13px] font-medium text-[#71717A]">구독을 내 편으로</p>
        <h1 className="text-3xl font-bold tracking-[-0.03em]">구독 관리의<br />가장 쉬운 시작</h1>
        <p className="mt-4 max-w-[290px] text-[15px] leading-6 text-[#71717A]">결제 전에 알리고, 해지는 빠르게. 꾸독이 매달의 고정지출을 정리해드려요.</p>
      </div>

      {/* 메인 폼: 아이디 비밀번호 로그인 */}
      <form className="space-y-3" onSubmit={handleIdLogin}>
        <label className="block">
          <span className="sr-only">아이디</span>
          <span className="relative block">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#71717A]" size={18} />
            <input
              className={`${fieldBase} pl-11`}
              type="text"
              autoComplete="username"
              placeholder="아이디"
              value={accountId}
              onChange={(event) => {
                setAccountId(event.target.value);
                setLoginError("");
              }}
            />
          </span>
        </label>
        <label className="block">
          <span className="sr-only">비밀번호</span>
          <span className="relative block">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#71717A]" size={18} />
            <input
              className={`${fieldBase} pl-11 pr-11`}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="비밀번호"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setLoginError("");
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#71717A] hover:text-black"
              aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>

        {loginError && (
          <p className="flex items-center gap-1.5 text-[12px] text-[#EF4444] pt-0.5">
            <AlertCircle size={14} />
            {loginError}
          </p>
        )}

        <Button className="w-full" type="submit" disabled={!accountId.trim() || !password}>
          로그인
        </Button>
      </form>

      {/* 구분선 */}
      <div className="my-6 flex items-center gap-3 text-[11px] text-[#A1A1AA]">
        <span className="h-px flex-1 bg-[#E4E4E7]" />
        또는
        <span className="h-px flex-1 bg-[#E4E4E7]" />
      </div>

      {/* 아이디 비밀번호 로그인 아래 구글 아이디 로그인 (애플 로그인 제거) */}
      <div>
        <Button
          variant="secondary"
          className="w-full flex items-center justify-center gap-2.5"
          onClick={() => onSocial("Google", "사용자")}
        >
          <GoogleIcon />
          <span>Google 아이디로 로그인</span>
        </Button>
      </div>

      <div className="mt-auto pt-8 text-center text-[13px]">
        <button type="button" onClick={onRegister} className="font-semibold text-black underline underline-offset-4">계정이 없으신가요? 회원가입</button>
      </div>
    </main>
  );
}

function ValidationHint({ valid, error, success }) {
  if (!error && !success) return null;
  const isSuccess = valid && success;
  return (
    <p className={`mt-2 flex items-center gap-1.5 text-[12px] ${isSuccess ? "text-[#10B981]" : "text-[#EF4444]"}`}>
      {isSuccess ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
      {isSuccess ? success : error}
    </p>
  );
}

const NICKNAME_PREFIXES = ["알뜰한", "현명한", "스마트", "꼼꼼한", "절약왕", "슬기로운", "구독요정", "똑똑한", "실속파"];
const NICKNAME_NOUNS = ["구독러", "세이버", "탐험가", "메이트", "체커", "지킴이", "플래너"];

function generateRandomNickname() {
  const prefix = NICKNAME_PREFIXES[Math.floor(Math.random() * NICKNAME_PREFIXES.length)];
  const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${prefix}${noun}${num}`;
}

export function AuthRegister({ onBack, onComplete, existingUsers = [] }) {
  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState(() => generateRandomNickname());
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRegenerateNickname = () => {
    setNickname(generateRandomNickname());
  };

  const validation = useMemo(() => {
    const idFormat = /^[a-z0-9_-]{5,20}$/.test(accountId);
    const existingIds = (existingUsers || []).map((u) => u.accountId?.toLowerCase());
    const idDuplicate = ["submate", "admin", "testuser", ...existingIds].includes(accountId.toLowerCase());
    const passwordFormat = /^(?=.*[a-zA-Z])(?=.*\d).{6,20}$/.test(password);
    const matching = Boolean(password) && password === passwordConfirm;
    const nicknameFormat = /^[가-힣a-zA-Z0-9\s]{2,12}$/.test(nickname.trim());
    return {
      id: idFormat && !idDuplicate,
      idError: accountId && (!idFormat ? "아이디 5~20자의 영문 소문자, 숫자와 특수기호만 사용 가능합니다." : idDuplicate ? "중복된 아이디가 있습니다." : ""),
      password: passwordFormat,
      passwordError: password && !passwordFormat ? "영문과 숫자를 포함해 6~20자로 입력해 주세요." : "",
      matching,
      confirmError: passwordConfirm && !matching ? "비밀번호 확인을 위해 한번 더 입력해주십시오" : "",
      nickname: nicknameFormat,
      nicknameError: nickname && !nicknameFormat ? "닉네임은 한/영 2~12자로 입력해 주세요." : "",
    };
  }, [accountId, existingUsers, nickname, password, passwordConfirm]);

  const canSubmit = validation.id && validation.password && validation.matching && validation.nickname && agreeTerms;

  return (
    <main className="min-h-screen min-h-[100dvh] px-4 sm:px-5 pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1rem))] pt-[max(2rem,calc(env(safe-area-inset-top,0px)+1rem))]">
      <button type="button" onClick={onBack} className="mb-9 rounded-xl p-2 text-[#71717A] hover:bg-[#FAFAFA] hover:text-black" aria-label="로그인으로 돌아가기">←</button>
      <p className="text-[13px] font-medium text-[#71717A]">1분이면 충분해요</p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">꾸독 시작하기</h1>
      <p className="mt-3 text-[14px] leading-6 text-[#71717A]">한 화면에서 간편하게 정보를 입력하고 바로 시작하세요.</p>

      <form className="mt-9 space-y-5" onSubmit={(event) => { event.preventDefault(); if (canSubmit) onComplete({ accountId, password, nickname }); }}>
        <label className="block">
          <span className="mb-2 block text-[13px] font-semibold">아이디</span>
          <span className="relative block">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#71717A]" size={18} />
            <input className={`${fieldBase} pl-11`} autoComplete="username" placeholder="영문 소문자, 숫자 5~20자" value={accountId} onChange={(event) => setAccountId(event.target.value)} />
          </span>
          <ValidationHint valid={validation.id} error={validation.idError} success="사용 가능한 아이디입니다." />
        </label>

        <label className="block">
          <span className="mb-2 block text-[13px] font-semibold">비밀번호</span>
          <span className="relative block">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#71717A]" size={18} />
            <input className={`${fieldBase} pl-11 pr-11`} type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="영문, 숫자 포함 6~20자" value={password} onChange={(event) => setPassword(event.target.value)} />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#71717A] hover:text-black cursor-pointer" aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </span>
          <ValidationHint valid={validation.password} error={validation.passwordError} success="사용 가능한 비밀번호입니다." />
        </label>

        <label className="block">
            <span className="mb-2 block text-[13px] font-semibold">비밀번호 확인</span>
            <span className="relative block">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#71717A]" size={18} />
              <input className={`${fieldBase} pl-11 pr-11`} type={showConfirm ? "text" : "password"} autoComplete="new-password" placeholder="비밀번호를 한 번 더 입력해 주세요" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} />
              <button type="button" onClick={() => setShowConfirm((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#71717A] hover:text-black cursor-pointer" aria-label={showConfirm ? "비밀번호 숨기기" : "비밀번호 보기"}>{showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </span>
            <ValidationHint valid={validation.matching} error={validation.confirmError} success="동일한 비밀번호입니다" />
        </label>

        <label className="block">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold">닉네임</span>
            <button
              type="button"
              onClick={handleRegenerateNickname}
              className="flex items-center gap-1 text-[12px] font-semibold text-[#6B7684] hover:text-black cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>랜덤 닉네임 추천</span>
            </button>
          </div>
          <div className="relative">
            <input className={`${fieldBase} pr-10`} placeholder="한/영 2~12자" value={nickname} onChange={(event) => setNickname(event.target.value)} />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A]">
              <Sparkles size={16} />
            </span>
          </div>
          <ValidationHint valid={validation.nickname} error={validation.nicknameError} success="사용 가능한 닉네임입니다" />
        </label>

        <div className="pt-2 border-t border-[#E4E4E7] space-y-2">
          <label className="flex items-center gap-2.5 text-[13px] text-[#333D4B] cursor-pointer">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="h-4 w-4 rounded border-[#D1D6DB] text-black focus:ring-black accent-black cursor-pointer"
            />
            <span>[필수] 꾸독 서비스 이용약관 및 개인정보 처리방침 동의</span>
          </label>
        </div>

        <Button type="submit" disabled={!canSubmit} className="mt-2 w-full cursor-pointer">
          가입 완료
        </Button>
      </form>
    </main>
  );
}
