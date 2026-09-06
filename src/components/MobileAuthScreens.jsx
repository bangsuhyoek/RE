import { useMemo, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { RELogo, WaterBackground } from "./REBrand";

const idPattern = /^[a-z0-9_-]{5,20}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,16}$/;
const nicknamePattern = /^[가-힣a-zA-Z]{3,10}$/;

const SocialMark = ({ type }) => (
  <span className={`re-mobile-social-mark re-mobile-social-mark--${type.toLowerCase()}`} aria-hidden="true">
    {type === "Google" ? "G" : "N"}
  </span>
);

function InertSocialButton({ type, suffix = "로그인" }) {
  return (
    <button type="button" className="re-mobile-social-button is-inert" aria-disabled="true" title="현재 프로젝트에 실제 소셜 인증이 연결되어 있지 않아 동작을 추가하지 않았습니다.">
      <SocialMark type={type} />
      <strong>{type}로 {suffix}</strong>
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
    <main className="re-mobile-auth re-mobile-login">
      <WaterBackground variant="signup" />
      <section className="re-mobile-auth__hero re-mobile-auth__hero--login">
        <RELogo size="lg" />
        <div>
          <h1>다시 만나서<br />반가워요. <span aria-hidden="true">🌸</span></h1>
          <p>오늘도,<br />더 좋은 나를 만들어가요.</p>
          <blockquote>“작은 변화가,<br />더 여유로운 내일을 만들어요.”<br />— RE.</blockquote>
        </div>
        <img src="/re-assets/char_stand.jpg" alt="" aria-hidden="true" />
      </section>

      <form className="re-mobile-auth-card" onSubmit={submit}>
        <label className="re-mobile-auth-field">
          <span className="sr-only">아이디 또는 이메일</span>
          <UserRound size={22} />
          <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" placeholder="아이디 또는 이메일" />
        </label>

        <label className="re-mobile-auth-field">
          <span className="sr-only">비밀번호</span>
          <LockKeyhole size={22} />
          <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="비밀번호" />
          <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}>
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </label>

        <div className="re-mobile-auth-options">
          <label><input type="checkbox" checked={keepSignedIn} onChange={(event) => setKeepSignedIn(event.target.checked)} /> 로그인 상태 유지</label>
          <button type="button" className="is-inert" aria-disabled="true">비밀번호 찾기 ›</button>
        </div>

        <button type="submit" className="re-mobile-primary-button" disabled={!email.trim() || !password}>로그인 <span>→</span></button>

        <div className="re-mobile-divider"><span />또는 다른 방법으로 로그인<span /></div>
        <InertSocialButton type="Google" />
        <InertSocialButton type="Naver" />

        <button type="button" className="re-mobile-guest-button is-inert" aria-disabled="true">🍃 <strong>둘러보기</strong> <span>›</span></button>
        <p className="re-mobile-inert-note">둘러보기 기능은 현재 구현되어 있지 않아 화면만 유지합니다.</p>

        <p className="re-mobile-auth-switch">계정이 없으신가요? <button type="button" onClick={onRegister}>회원가입</button></p>
      </form>
      <p className="re-mobile-auth-footer">지금도, 더 좋은 너를 향해.<br /><strong>RE.</strong></p>
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
    <main className="re-mobile-auth re-mobile-register">
      <WaterBackground variant="signup" />
      <header className="re-mobile-register__brand"><RELogo size="md" /></header>
      <section className="re-mobile-register__hero">
        <div>
          <h1>회원가입 <span aria-hidden="true">🌸</span></h1>
          <p>RE.와 함께, 더 가벼운 오늘을 시작해요.</p>
        </div>
        <img src="/re-assets/char_stand.jpg" alt="" aria-hidden="true" />
      </section>

      <form className="re-mobile-register-card" onSubmit={(event) => { event.preventDefault(); if (canSubmit) onComplete({ accountId, nickname }); }}>
        <label>
          <strong>아이디</strong>
          <span className="re-mobile-auth-field"><UserRound size={21} /><input value={accountId} onChange={(event) => setAccountId(event.target.value)} autoComplete="username" placeholder="아이디를 입력하세요." /></span>
          <ValidationMessage valid={!accountId || validation.id} text={!accountId || validation.id ? "영문 소문자·숫자·_- 조합 5~20자" : "현재 입력 형식이 가입 조건과 맞지 않아요."} />
        </label>

        <label>
          <strong>비밀번호</strong>
          <span className="re-mobile-auth-field"><LockKeyhole size={21} /><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="비밀번호를 입력하세요." /><button type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></span>
          <ValidationMessage valid={!password || validation.password} text={!password || validation.password ? "영문 대·소문자, 숫자, 특수문자 조합 8~16자" : "현재 입력 형식이 가입 조건과 맞지 않아요."} />
        </label>

        <label>
          <strong>비밀번호 확인</strong>
          <span className="re-mobile-auth-field"><LockKeyhole size={21} /><input type={showConfirm ? "text" : "password"} value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} autoComplete="new-password" placeholder="비밀번호를 다시 입력하세요." /><button type="button" onClick={() => setShowConfirm((current) => !current)}>{showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}</button></span>
          <ValidationMessage valid={!passwordConfirm || validation.matching} text={!passwordConfirm || validation.matching ? "비밀번호가 일치해야 합니다." : "비밀번호가 일치하지 않아요."} />
        </label>

        <label>
          <strong>닉네임</strong>
          <span className="re-mobile-auth-field"><Mail size={21} /><input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="닉네임을 입력하세요." /></span>
          <ValidationMessage valid={!nickname || validation.nickname} text={!nickname || validation.nickname ? "한글 또는 영문 3~10자" : "현재 입력 형식이 가입 조건과 맞지 않아요."} />
        </label>

        <button type="submit" className="re-mobile-primary-button" disabled={!canSubmit}>가입하기</button>
        <p className="re-mobile-terms">가입하면 RE.의 <span>이용약관</span>과 <span>개인정보처리방침</span>에 동의한 것으로 간주됩니다.</p>
        <div className="re-mobile-divider"><span />또는 간편하게 가입하기<span /></div>
        <div className="re-mobile-social-grid"><InertSocialButton type="Google" suffix="가입하기" /><InertSocialButton type="Naver" suffix="가입하기" /></div>
        <p className="re-mobile-auth-switch">이미 계정이 있으신가요? <button type="button" onClick={onBack}>로그인 ›</button></p>
      </form>
    </main>
  );
}
