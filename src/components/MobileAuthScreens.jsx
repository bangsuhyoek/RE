import { useMemo, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Smile, UserRound } from "lucide-react";
import { RELogo } from "./REBrand";

const FINAL_ASSET = "/re-assets/mobile-final";
const idPattern = /^[a-z0-9_-]{5,20}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,16}$/;
const nicknamePattern = /^[가-힣a-zA-Z]{3,10}$/;

const SocialMark = ({ type }) => (
  <span className={`re-ref-social-mark re-ref-social-mark--${type.toLowerCase()}`} aria-hidden="true">
    <img src={`${FINAL_ASSET}/social/${type === "Google" ? "google" : "naver"}.webp`} alt="" />
  </span>
);

function InertSocialButton({ type, suffix = "로그인" }) {
  return (
    <button type="button" className="re-ref-social-button is-inert" aria-disabled="true" title="소셜 로그인은 준비 중이에요.">
      <SocialMark type={type} />
      <strong>{type === "Google" ? "Google" : "네이버"}로 {suffix}</strong>
      <span aria-hidden="true">›</span>
    </button>
  );
}

export function AuthLogin({ onSocial, onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  const submit = (event) => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    onSocial("이메일", email.includes("@") ? email.split("@")[0] : email);
  };

  return (
    <main className="re-ref-entry re-ref-auth re-ref-login">
      <div className="re-ref-floral-frame" aria-hidden="true" />
      <section className="re-ref-auth__hero">
        <RELogo size="lg" />
        <div className="re-ref-auth__copy">
          <h1>다시 만나서<br />반가워요. 🌸</h1>
          <p>오늘도,<br />더 좋은 나를 만들어가요.</p>
          <blockquote>“작은 변화가,<br />더 여유로운 내일을 만들어요.”<br />— RE.</blockquote>
        </div>
        <div className="re-ref-character-window re-ref-character-window--login" aria-hidden="true">
          <img src={`${FINAL_ASSET}/character-login.webp`} alt="" />
        </div>
      </section>

      <form className="re-ref-auth-card" onSubmit={submit}>
        <label className="re-ref-auth-field">
          <span className="sr-only">아이디 또는 이메일</span>
          <UserRound size={20} />
          <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" placeholder="아이디 또는 이메일" />
        </label>
        <label className="re-ref-auth-field">
          <span className="sr-only">비밀번호</span>
          <LockKeyhole size={20} />
          <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="비밀번호" />
          <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </label>
        <div className="re-ref-auth-options">
          <label><input type="checkbox" checked={keepSignedIn} onChange={(event) => setKeepSignedIn(event.target.checked)} /> 로그인 상태 유지</label>
          <button type="button" className="is-inert" aria-disabled="true">비밀번호 찾기 ›</button>
        </div>
        <button type="submit" className="re-ref-primary" disabled={!email.trim() || !password}>로그인 <span>→</span></button>
        <div className="re-ref-divider"><span />또는 다른 방법으로 로그인<span /></div>
        <InertSocialButton type="Google" />
        <InertSocialButton type="Naver" />
        <button type="button" className="re-ref-guest-button is-inert" aria-disabled="true">🍃 <strong>둘러보기</strong> <span>›</span></button>
        <p className="re-ref-inert-note">둘러보기는 준비 중이에요.</p>
        <p className="re-ref-auth-switch">계정이 없으신가요? <button type="button" onClick={onRegister}>회원가입</button></p>
      </form>
      <p className="re-ref-auth-footer">지금도, 더 좋은 너를 향해.<br /><strong>RE.</strong></p>
    </main>
  );
}

function ValidationMessage({ text, valid }) {
  if (!text) return null;
  return <small className={valid ? "is-valid" : "is-error"}>{text}</small>;
}

export function AuthRegister({ onBack, onComplete }) {
  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validation = useMemo(() => {
    const id = idPattern.test(accountId);
    const passwordOk = passwordPattern.test(password);
    const matching = Boolean(password) && password === passwordConfirm;
    const nicknameOk = nicknamePattern.test(nickname);
    return { id, password: passwordOk, matching, nickname: nicknameOk };
  }, [accountId, nickname, password, passwordConfirm]);
  const canSubmit = validation.id && validation.password && validation.matching && validation.nickname;

  return (
    <main className="re-ref-entry re-ref-auth re-ref-register">
      <div className="re-ref-floral-frame" aria-hidden="true" />
      <header className="re-ref-register__brand"><RELogo size="md" /></header>
      <section className="re-ref-register__hero">
        <div><h1>회원가입 🌸</h1><p>RE.와 함께, 더 가벼운 오늘을 시작해요.</p></div>
        <div className="re-ref-character-window re-ref-character-window--register" aria-hidden="true"><img src={`${FINAL_ASSET}/character-register.webp`} alt="" /></div>
      </section>

      <form className="re-ref-register-card" onSubmit={(event) => { event.preventDefault(); if (canSubmit) onComplete({ accountId, nickname }); }}>
        <label><strong>아이디</strong><span className="re-ref-auth-field"><UserRound size={19} /><input value={accountId} onChange={(event) => setAccountId(event.target.value)} autoComplete="username" placeholder="아이디를 입력하세요." /></span><ValidationMessage valid={!accountId || validation.id} text={!accountId || validation.id ? "영문 소문자·숫자·_- 조합 5~20자" : "현재 입력 형식이 가입 조건과 맞지 않아요."} /></label>
        <label><strong>비밀번호</strong><span className="re-ref-auth-field"><LockKeyhole size={19} /><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="비밀번호를 입력하세요." /><button type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span><ValidationMessage valid={!password || validation.password} text={!password || validation.password ? "영문 대·소문자, 숫자, 특수문자 조합 8~16자" : "현재 입력 형식이 가입 조건과 맞지 않아요."} /></label>
        <label><strong>비밀번호 확인</strong><span className="re-ref-auth-field"><LockKeyhole size={19} /><input type={showConfirm ? "text" : "password"} value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} autoComplete="new-password" placeholder="비밀번호를 다시 입력하세요." /><button type="button" onClick={() => setShowConfirm((current) => !current)}>{showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}</button></span><ValidationMessage valid={!passwordConfirm || validation.matching} text={!passwordConfirm || validation.matching ? "비밀번호가 일치해야 합니다." : "비밀번호가 일치하지 않아요."} /></label>
        <label><strong>닉네임</strong><span className="re-ref-auth-field"><Smile size={19} /><input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="닉네임을 입력하세요." /></span><ValidationMessage valid={!nickname || validation.nickname} text={!nickname || validation.nickname ? "한글 또는 영문 3~10자" : "현재 입력 형식이 가입 조건과 맞지 않아요."} /></label>
        <button type="submit" className="re-ref-primary" disabled={!canSubmit}>가입하기</button>
        <p className="re-ref-terms">가입하면 RE.의 <span>이용약관</span>과 <span>개인정보처리방침</span>에 동의한 것으로 간주됩니다.</p>
        <div className="re-ref-divider"><span />또는 간편하게 가입하기<span /></div>
        <div className="re-ref-social-grid"><InertSocialButton type="Google" suffix="가입하기" /><InertSocialButton type="Naver" suffix="가입하기" /></div>
        <p className="re-ref-auth-switch">이미 계정이 있으신가요? <button type="button" onClick={onBack}>로그인 ›</button></p>
      </form>
    </main>
  );
}
