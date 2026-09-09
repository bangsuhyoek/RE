import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Button } from "./ui";
import { RELogo, WaterBackground } from "./REBrand";

const fieldBase = "re-field w-full rounded-2xl px-4 py-3.5 text-[15px] outline-none";

function Splash({ onDone }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 1100);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <main className="re-splash relative min-h-screen overflow-hidden px-6">
      <WaterBackground />
      <section className="relative z-10 flex min-h-screen flex-col items-center pt-[126px] text-center">
        <RELogo stacked className="re-splash-logo" />
        <h1 className="mt-7 text-[16px] font-bold tracking-[0.04em] text-[#1B2A8C]">지금도, 더 좋은 너를 향해.</h1>
        <p className="re-eyebrow mt-auto mb-[70px]">RETHINK. &nbsp; RELEASE. &nbsp; REYOU.</p>
      </section>
    </main>
  );
}

export function AuthLogin({ onGuest, onSocial, onRegister }) {
  const [phase, setPhase] = useState("splash");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (phase === "splash") return <Splash onDone={() => setPhase("intro")} />;

  if (phase === "intro") {
    return (
      <main className="re-intro relative min-h-screen overflow-hidden px-6 pb-8 pt-12">
        <WaterBackground />
        <section className="relative z-10">
          <h1 className="text-[26px] font-extrabold leading-[1.38] tracking-[-0.03em] text-[#1B2A8C]">
            구독도, 나답게.<br />언제나, 너와 함께.
          </h1>
          <p className="mt-4 text-[14px] leading-6 text-[#9099CA]">복잡한 구독 관리도<br />이제, 쉬워질 거예요.</p>
        </section>
        <img src="/re-assets/char_stand.jpg" alt="RE. 가이드 캐릭터" className="absolute left-1/2 top-[182px] z-10 h-[452px] w-auto -translate-x-1/2 object-contain mix-blend-multiply" />
        <img src="/re-assets/logo_mark.png" alt="RE." className="absolute left-1/2 top-[646px] z-10 h-[76px] w-auto -translate-x-1/2" />
        <div className="absolute inset-x-6 bottom-10 z-20">
          <Button className="w-full" onClick={() => setPhase("login")}>시작하기 <ArrowRight size={18} /></Button>
        </div>
      </main>
    );
  }

  const handleEmailLogin = (event) => {
    event.preventDefault();
    if (!email || !password) return;
    onSocial("이메일", email.split("@")[0] || "");
  };

  return (
    <main className="re-auth relative min-h-screen overflow-hidden px-6 pb-8 pt-10">
      <WaterBackground variant="signup" />
      <div className="relative z-10">
        <RELogo className="mx-auto w-fit" markClassName="h-[42px] w-auto" />
        <div className="mt-10 text-center">
          <h1 className="text-[25px] font-extrabold leading-[1.38] text-[#1B2A8C]">좋은 변화를<br />함께 시작해요.</h1>
          <p className="mt-4 text-[14px] leading-6 text-[#9099CA]">간단한 정보로<br />나에게 맞는 관리를 시작할게요.</p>
        </div>

        <div className="mt-9 space-y-3">
          <Button className="w-full" onClick={() => setPhase("email")}><Mail size={17} /> 이메일로 시작하기</Button>
          <Button variant="secondary" className="w-full" onClick={() => onSocial("Apple", "")}>Apple로 계속하기</Button>
          <Button variant="secondary" className="w-full" onClick={() => onSocial("Google", "")}>Google로 계속하기</Button>
        </div>

        {phase === "email" && (
          <form className="field-enter mt-5 space-y-3" onSubmit={handleEmailLogin}>
            <input className={fieldBase} type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="relative">
              <input className={`${fieldBase} pr-12`} type={showPassword ? "text" : "password"} placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#7E8AC0]" aria-label="비밀번호 표시 전환">
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <Button className="w-full" type="submit" disabled={!email || !password}>로그인</Button>
          </form>
        )}

        <div className="mt-7 text-center text-[13px] text-[#9099CA]">
          <button type="button" onClick={onRegister} className="font-bold text-[#3746A5] underline underline-offset-4">회원가입</button>
          <span className="mx-3 text-[#DDE3F2]">|</span>
          <button type="button" onClick={onGuest} className="font-medium underline underline-offset-4">둘러보기</button>
        </div>
      </div>
    </main>
  );
}

function Hint({ ok, children }) {
  if (!children) return null;
  return <p className={`mt-2 text-[11px] ${ok ? "text-[#4D8B7E]" : "text-[#E43C78]"}`}>{children}</p>;
}

export function AuthRegister({ onBack, onComplete }) {
  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const validation = useMemo(() => {
    const id = /^[a-z0-9_-]{5,20}$/.test(accountId);
    const pw = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,16}$/.test(password);
    const matching = Boolean(password) && password === passwordConfirm;
    const nick = /^[가-힣a-zA-Z]{2,10}$/.test(nickname);
    return { id, pw, matching, nick, canSubmit: id && pw && matching && nick };
  }, [accountId, nickname, password, passwordConfirm]);

  return (
    <main className="re-auth relative min-h-screen overflow-hidden px-6 pb-10 pt-8">
      <WaterBackground variant="signup" />
      <div className="relative z-10">
        <button type="button" onClick={onBack} className="re-icon-button" aria-label="로그인으로 돌아가기"><ArrowLeft size={20} /></button>
        <RELogo className="mx-auto -mt-5 w-fit" markClassName="h-[42px] w-auto" />
        <div className="mt-9 text-center">
          <h1 className="text-[25px] font-extrabold leading-[1.38] text-[#1B2A8C]">좋은 변화를<br />함께 시작해요.</h1>
          <p className="mt-3 text-[14px] leading-6 text-[#9099CA]">한 단계씩 확인하며 계정을 만들어요.</p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); if (validation.canSubmit) onComplete({ accountId, nickname }); }}>
          <label className="block">
            <span className="re-label">아이디</span>
            <div className="relative">
              <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7E8AC0]" size={17} />
              <input className={`${fieldBase} pl-11`} value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="영문 소문자·숫자 5~20자" />
            </div>
            <Hint ok={validation.id}>{accountId ? (validation.id ? "사용 가능한 형식이에요." : "5~20자의 영문 소문자, 숫자, _ 또는 -를 사용해주세요.") : ""}</Hint>
          </label>

          {validation.id && (
            <label className="field-enter block">
              <span className="re-label">비밀번호</span>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7E8AC0]" size={17} />
                <input type={showPassword ? "text" : "password"} className={`${fieldBase} pl-11 pr-12`} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="대·소문자, 숫자, 특수문자 포함" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#7E8AC0]" aria-label="비밀번호 표시 전환">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
              <Hint ok={validation.pw}>{password ? (validation.pw ? "사용 가능한 비밀번호예요." : "8~16자, 영문 대·소문자·숫자·특수문자를 포함해주세요.") : ""}</Hint>
            </label>
          )}

          {validation.pw && (
            <label className="field-enter block">
              <span className="re-label">비밀번호 확인</span>
              <input type="password" className={fieldBase} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="비밀번호를 한 번 더 입력해주세요" />
              <Hint ok={validation.matching}>{passwordConfirm ? (validation.matching ? "비밀번호가 같아요." : "비밀번호가 일치하지 않아요.") : ""}</Hint>
            </label>
          )}

          {validation.matching && (
            <label className="field-enter block">
              <span className="re-label">닉네임</span>
              <input className={fieldBase} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="한글 또는 영문 2~10자" />
              <Hint ok={validation.nick}>{nickname ? (validation.nick ? "좋아요." : "2~10자의 한글 또는 영문으로 입력해주세요.") : ""}</Hint>
            </label>
          )}

          {validation.canSubmit && <Button type="submit" className="field-enter w-full">가입 완료</Button>}
        </form>
      </div>
    </main>
  );
}
