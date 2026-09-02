import { useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Button, LogoMark } from "./ui";

const fieldBase = "w-full rounded-xl border border-[#E4E4E7] bg-white px-4 py-3.5 text-[15px] outline-none transition-colors placeholder:text-[#A1A1AA] focus:border-black";

export function AuthLogin({ onGuest, onSocial, onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailLogin = (event) => {
    event.preventDefault();
    if (!email || !password) return;
    onSocial("이메일", email.split("@")[0] || "민수");
  };

  return (
    <main className="flex min-h-screen flex-col px-5 pb-8 pt-10">
      <div className="mb-12">
        <LogoMark className="mb-6 h-11 w-11 rounded-2xl text-base" />
        <p className="mb-2 text-[13px] font-medium text-[#71717A]">구독을 내 편으로</p>
        <h1 className="text-3xl font-bold tracking-[-0.03em]">구독 관리의<br />가장 쉬운 시작</h1>
        <p className="mt-4 max-w-[290px] text-[15px] leading-6 text-[#71717A]">결제 전에 알리고, 해지는 빠르게. SubMate가 매달의 고정지출을 정리해드려요.</p>
      </div>

      <div className="space-y-3">
        <Button className="w-full" onClick={() => onSocial("Apple", "민수")}>
          Apple로 계속하기
          <ArrowRight size={17} />
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => onSocial("Google", "민수")}>
          <span className="grid h-5 w-5 place-items-center rounded-full border border-black text-[10px] font-bold">G</span>
          Google로 계속하기
        </Button>
      </div>

      <div className="my-7 flex items-center gap-3 text-[11px] text-[#A1A1AA]">
        <span className="h-px flex-1 bg-[#E4E4E7]" />
        또는 이메일로 로그인
        <span className="h-px flex-1 bg-[#E4E4E7]" />
      </div>

      <form className="space-y-3" onSubmit={handleEmailLogin}>
        <label className="block">
          <span className="sr-only">이메일</span>
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#71717A]" size={18} />
            <input className={`${fieldBase} pl-11`} type="email" placeholder="이메일" value={email} onChange={(event) => setEmail(event.target.value)} />
          </span>
        </label>
        <label className="block">
          <span className="sr-only">비밀번호</span>
          <span className="relative block">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#71717A]" size={18} />
            <input className={`${fieldBase} pl-11 pr-11`} type={showPassword ? "text" : "password"} placeholder="비밀번호" value={password} onChange={(event) => setPassword(event.target.value)} />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#71717A] hover:text-black" aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>
        <Button className="w-full" type="submit" disabled={!email || !password}>이메일로 로그인</Button>
      </form>

      <div className="mt-auto pt-8 text-center text-[13px]">
        <button type="button" onClick={onRegister} className="font-semibold text-black underline underline-offset-4">회원가입</button>
        <span className="mx-3 text-[#E4E4E7]">|</span>
        <button type="button" onClick={onGuest} className="font-medium text-[#71717A] underline underline-offset-4">둘러보기</button>
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

export function AuthRegister({ onBack, onComplete }) {
  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validation = useMemo(() => {
    const idFormat = /^[a-z0-9_-]{5,20}$/.test(accountId);
    const idDuplicate = ["submate", "admin", "testuser"].includes(accountId.toLowerCase());
    const passwordFormat = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,16}$/.test(password);
    const matching = Boolean(password) && password === passwordConfirm;
    const nicknameFormat = /^[가-힣a-zA-Z]{3,10}$/.test(nickname);
    return {
      id: idFormat && !idDuplicate,
      idError: accountId && (!idFormat ? "아이디 5~20자의 영문 소문자, 숫자와 특수기호만 사용 가능합니다." : idDuplicate ? "중복된 아이디가 있습니다." : ""),
      password: passwordFormat,
      passwordError: password && !passwordFormat ? "영문 대·소문자, 숫자, 특수문자를 포함해 8~16자로 입력해 주세요." : "",
      matching,
      confirmError: passwordConfirm && !matching ? "비밀번호 확인을 위해 한번 더 입력해주십시오" : "",
      nickname: nicknameFormat,
      nicknameError: nickname && !nicknameFormat ? "닉네임은 한/영 3~10자로 입력해 주세요." : "",
    };
  }, [accountId, nickname, password, passwordConfirm]);

  const canSubmit = validation.id && validation.password && validation.matching && validation.nickname;

  return (
    <main className="min-h-screen px-5 pb-8 pt-8">
      <button type="button" onClick={onBack} className="mb-9 rounded-xl p-2 text-[#71717A] hover:bg-[#FAFAFA] hover:text-black" aria-label="로그인으로 돌아가기">←</button>
      <p className="text-[13px] font-medium text-[#71717A]">1분이면 충분해요</p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">SubMate 시작하기</h1>
      <p className="mt-3 text-[14px] leading-6 text-[#71717A]">한 단계씩 확인하며 안전하게 계정을 만들어요.</p>

      <form className="mt-9 space-y-5" onSubmit={(event) => { event.preventDefault(); if (canSubmit) onComplete({ accountId, nickname }); }}>
        <label className="block">
          <span className="mb-2 block text-[13px] font-semibold">아이디</span>
          <span className="relative block">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#71717A]" size={18} />
            <input className={`${fieldBase} pl-11`} autoComplete="username" placeholder="영문 소문자, 숫자, 특수문자(_-) 5~20자" value={accountId} onChange={(event) => setAccountId(event.target.value)} />
          </span>
          <ValidationHint valid={validation.id} error={validation.idError} success="사용 가능한 아이디입니다." />
        </label>

        {validation.id && (
          <label className="field-enter block">
            <span className="mb-2 block text-[13px] font-semibold">비밀번호</span>
            <span className="relative block">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#71717A]" size={18} />
              <input className={`${fieldBase} pl-11 pr-11`} type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="영문 대·소문자, 숫자, 특수문자" value={password} onChange={(event) => setPassword(event.target.value)} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#71717A] hover:text-black" aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </span>
            <ValidationHint valid={validation.password} error={validation.passwordError} success="사용가능한 비밀번호 입니다" />
          </label>
        )}

        {validation.password && (
          <label className="field-enter block">
            <span className="mb-2 block text-[13px] font-semibold">비밀번호 확인</span>
            <span className="relative block">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#71717A]" size={18} />
              <input className={`${fieldBase} pl-11 pr-11`} type={showConfirm ? "text" : "password"} autoComplete="new-password" placeholder="비밀번호를 한 번 더 입력해 주세요" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} />
              <button type="button" onClick={() => setShowConfirm((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#71717A] hover:text-black" aria-label={showConfirm ? "비밀번호 숨기기" : "비밀번호 보기"}>{showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </span>
            <ValidationHint valid={validation.matching} error={validation.confirmError} success="동일한 비밀번호입니다" />
          </label>
        )}

        {validation.matching && (
          <label className="field-enter block">
            <span className="mb-2 block text-[13px] font-semibold">닉네임</span>
            <input className={fieldBase} placeholder="한/영 3~10자" value={nickname} onChange={(event) => setNickname(event.target.value)} />
            <ValidationHint valid={validation.nickname} error={validation.nicknameError} success="사용 가능한 닉네임입니다" />
          </label>
        )}

        {canSubmit && <Button type="submit" className="field-enter mt-2 w-full">가입 완료</Button>}
      </form>
    </main>
  );
}
