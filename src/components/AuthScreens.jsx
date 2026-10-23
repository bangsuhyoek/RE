import { Button } from "./ui";

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

export function AuthLogin({ onSocial, onGuest }) {
  return (
    <main className="flex min-h-screen min-h-[100dvh] flex-col px-4 sm:px-5 pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1rem))] pt-[max(2.5rem,calc(env(safe-area-inset-top,0px)+1.5rem))]">
      <div className="mb-10">
        <p className="mb-2 text-[13px] font-medium text-[#71717A]">구독을 내 편으로</p>
        <h1 className="text-3xl font-bold tracking-[-0.03em]">구독 관리의<br />가장 쉬운 시작</h1>
        <p className="mt-4 max-w-[290px] text-[15px] leading-6 text-[#71717A]">결제 전에 알리고, 해지는 빠르게. 꾸독이 매달의 고정지출을 정리해드려요.</p>
      </div>

      <div className="space-y-3">
        <Button
          variant="secondary"
          className="w-full flex items-center justify-center gap-2.5 py-3.5"
          onClick={() => onSocial("Google", "사용자")}
        >
          <GoogleIcon />
          <span>Google 아이디로 시작하기</span>
        </Button>

        <Button
          variant="ghost"
          className="w-full text-[#71717A] hover:text-black py-3"
          onClick={onGuest}
        >
          로그인 없이 둘러보기 (게스트 모드)
        </Button>
      </div>

      <div className="mt-auto pt-8 text-center text-[12px] text-[#A1A1AA]">
        <p>Google 로그인 시 안전한 PKCE 인증이 적용됩니다.</p>
      </div>
    </main>
  );
}

// 레거시 호환 및 빈 내보내기 방지
export function AuthRegister() {
  return null;
}

