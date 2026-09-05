import { useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Button } from "./ui";
import { RELogo, WaterBackground } from "./REBrand";

const fieldBase = "re-field w-full rounded-2xl px-4 py-3.5 text-[15px] outline-none";

export function AuthLogin({ onGuest, onSocial, onRegister, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailLogin = (event) => {
    event.preventDefault();
    if (!email || !password) return;
    onSocial("이메일", email.split("@")[0] || "");
  };

  return (
    <main className="re-auth relative min-h-screen overflow-hidden px-6 pb-8 pt-8">
      <WaterBackground variant="signup" />
      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack} className="re-icon-control" aria-label="이전 화면"><ArrowLeft size={20} /></button>
          <RELogo markClassName="h-[36px] w-auto" />
          <span className="w-10" />
        </div>

        <div className="mt-8 text-center">
          <p className="re-eyebrow">WELCOME BACK</p>
          <h1 className="re-serif-title mt-2 text-[28px] font-bold leading-[1.35] text-[#1B2A8C]">구독 관리의<br />가장 쉬운 시작</h1>
          <p className="mt-3 text-[13px] leading-6 text-[#9099CA]">내 구독을 한곳에서 확인하고<br />필요한 순간에만 관리해요.</p>
        </div>

        <div className="mt-7 space-y-3">
          <Button className="w-full" onClick={() => onSocial("Apple", "")}>Apple로 계속하기</Button>
          <Button variant="secondary" className="w-full" onClick={() => onSocial("Google", "")}><span className="grid h-5 w-5 place-items-center rounded-full border border-black text-[10px] font-bold">G</span> Google로 계속하기</Button>
        </div>

        <div className="my-5 flex items-center gap-3 text-[11px] text-[#AAB3D4]"><span className="h-px flex-1 bg-[#DDE3F2]" />또는 이메일로 로그인<span className="h-px flex-1 bg-[#DDE3F2]" /></div>

        <form className="space-y-3" onSubmit={handleEmailLogin}>
          <label className="block">
            <span className="sr-only">이메일</span>
            <span className="relative block"><Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7E8AC0]" size={18} /><input className={`${fieldBase} pl-11`} type="email" autoComplete="email" placeholder="이메일" value={email} onChange={(event) => setEmail(event.target.value)} /></span>
          </label>
          <label className="block">
            <span className="sr-only">비밀번호</span>
            <span className="relative block"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7E8AC0]" size={18} /><input className={`${fieldBase} pl-11 pr-11`} type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="비밀번호" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#7E8AC0]" aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>
          </label>
          <Button className="w-full" type="submit" disabled={!email || !password}>이메일로 로그인</Button>
        </form>

        <div className="mt-auto pt-7 text-center text-[13px] text-[#9099CA]">
          <button type="button" onClick={onRegister} className="font-bold text-black underline underline-offset-4">회원가입</button>
          <span className="mx-3 text-[#DDE3F2]">|</span>
          <button type="button" onClick={onGuest} className="font-medium underline underline-offset-4">둘러보기</button>
        </div>
      </div>
    </main>
  );
}

function ValidationHint({ valid, error, success }) {
  if (!error && !success) return null;
  const isSuccess = valid && success;
  return <p className={`mt-2 flex items-center gap-1.5 text-[12px] ${isSuccess ? "text-[#4D8B7E]" : "text-[#E43C78]"}`}>{isSuccess ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}{isSuccess ? success : error}</p>;
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
    const passwordFormat = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,16}$/.test(password);
    const matching = Boolean(password) && password === passwordConfirm;
    const nicknameFormat = /^[가-힣a-zA-Z]{3,10}$/.test(nickname);
    return {
      id: idFormat,
      idError: accountId && !idFormat ? "아이디는 5~20자의 영문 소문자, 숫자, _ 또는 -를 사용해주세요." : "",
      password: passwordFormat,
      passwordError: password && !passwordFormat ? "영문 대·소문자, 숫자, 특수문자를 포함해 8~16자로 입력해주세요." : "",
      matching,
      confirmError: passwordConfirm && !matching ? "비밀번호가 일치하지 않아요." : "",
      nickname: nicknameFormat,
      nicknameError: nickname && !nicknameFormat ? "닉네임은 한글 또는 영문 3~10자로 입력해주세요." : "",
    };
  }, [accountId, nickname, password, passwordConfirm]);

  const canSubmit = validation.id && validation.password && validation.matching && validation.nickname;

  return (
    <main className="re-auth relative min-h-screen overflow-hidden px-6 pb-10 pt-8">
      <WaterBackground variant="signup" />
      <div className="relative z-10">
        <div className="flex items-center justify-between"><button type="button" onClick={onBack} className="re-icon-control" aria-label="로그인으로 돌아가기"><ArrowLeft size={20} /></button><RELogo markClassName="h-[36px] w-auto" /><span className="w-10" /></div>
        <div className="mt-7 text-center"><p className="re-eyebrow">CREATE ACCOUNT</p><h1 className="re-serif-title mt-2 text-[27px] font-bold leading-[1.35] text-[#1B2A8C]">좋은 변화를<br />함께 시작해요.</h1><p className="mt-3 text-[13px] leading-6 text-[#9099CA]">한 단계씩 확인하며 계정을 만들어요.</p></div>

        <form className="mt-7 space-y-4" onSubmit={(event) => { event.preventDefault(); if (canSubmit) onComplete({ accountId, nickname }); }}>
          <label className="block"><span className="re-label">아이디</span><span className="relative block"><UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7E8AC0]" size={18} /><input className={`${fieldBase} pl-11`} autoComplete="username" placeholder="영문 소문자, 숫자, _- 5~20자" value={accountId} onChange={(event) => setAccountId(event.target.value)} /></span><ValidationHint valid={validation.id} error={validation.idError} success={accountId && validation.id ? "사용 가능한 형식이에요. 실제 중복 확인은 계정 연동 시 처리해요." : ""} /></label>

          {validation.id && <label className="field-enter block"><span className="re-label">비밀번호</span><span className="relative block"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7E8AC0]" size={18} /><input className={`${fieldBase} pl-11 pr-11`} type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="영문 대·소문자, 숫자, 특수문자" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#7E8AC0]" aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span><ValidationHint valid={validation.password} error={validation.passwordError} success={password && validation.password ? "사용 가능한 비밀번호예요." : ""} /></label>}

          {validation.password && <label className="field-enter block"><span className="re-label">비밀번호 확인</span><span className="relative block"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7E8AC0]" size={18} /><input className={`${fieldBase} pl-11 pr-11`} type={showConfirm ? "text" : "password"} autoComplete="new-password" placeholder="비밀번호를 한 번 더 입력해주세요" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} /><button type="button" onClick={() => setShowConfirm((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#7E8AC0]" aria-label={showConfirm ? "비밀번호 숨기기" : "비밀번호 보기"}>{showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}</button></span><ValidationHint valid={validation.matching} error={validation.confirmError} success={passwordConfirm && validation.matching ? "동일한 비밀번호예요." : ""} /></label>}

          {validation.matching && <label className="field-enter block"><span className="re-label">닉네임</span><input className={fieldBase} placeholder="한글 또는 영문 3~10자" value={nickname} onChange={(event) => setNickname(event.target.value)} /><ValidationHint valid={validation.nickname} error={validation.nicknameError} success={nickname && validation.nickname ? "사용 가능한 닉네임이에요." : ""} /></label>}

          {canSubmit && <Button type="submit" className="field-enter mt-2 w-full">가입 완료</Button>}
        </form>
      </div>
    </main>
  );
}
