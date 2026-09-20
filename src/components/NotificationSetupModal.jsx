import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui";

function permissionCopy(permission, nativeMode) {
  if (permission === "granted") {
    return {
      title: "알림 설정이 준비됐어요",
      description: nativeMode
        ? "설정을 마치면 앱이 홈 화면으로 내려가고 2~3초 뒤 꾸독 Heads-up 알림을 실제로 보여드릴게요."
        : "다음 결제 전에 브라우저 알림으로 미리 알려드릴게요.",
    };
  }

  if (permission === "denied") {
    return {
      title: nativeMode ? "기기 알림이 차단되어 있어요" : "브라우저에서 알림이 차단되어 있어요",
      description: nativeMode
        ? "휴대폰 설정에서 꾸독 알림을 허용하면 결제 예정 Heads-up 알림을 받을 수 있어요."
        : "주소창의 사이트 설정에서 알림을 허용하면 결제 예정 알림을 받을 수 있어요.",
    };
  }

  if (permission === "unsupported") {
    return {
      title: nativeMode ? "알림 권한 상태를 확인하고 있어요" : "이 브라우저는 시스템 알림을 지원하지 않아요",
      description: nativeMode
        ? "잠시 후 기기 알림 권한 상태를 다시 확인해 주세요."
        : "웹에서는 알림 설정만 저장하고, 실제 홈 화면 Heads-up 체험은 Android 앱에서 제공해요.",
    };
  }

  return {
    title: "결제 전에 꾸독이 먼저 알려드릴게요",
    description: "알림을 허용하면 다음 결제와 더 저렴한 혜택을 놓치지 않도록 도와드려요.",
  };
}

export function NotificationSetupModal({
  permission = "default",
  nativeMode = false,
  onRequestPermission,
  onContinue,
}) {
  const [requesting, setRequesting] = useState(false);
  const [showHelp, setShowHelp] = useState(permission === "denied");
  const copy = useMemo(() => permissionCopy(permission, nativeMode), [permission, nativeMode]);

  const requestPermission = async () => {
    setRequesting(true);
    try {
      const result = await onRequestPermission?.();
      if (result === "denied") setShowHelp(true);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-8 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="꾸독 알림 설정"
    >
      <section className="w-full max-w-[420px] overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="px-5 pb-5 pt-6 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#191F28] text-white">
              <BellRing size={23} />
            </span>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] px-2 py-1 text-[10px] font-extrabold text-[#1B64DA]">
                <Sparkles size={11} />
                첫 설정
              </span>
              <h2 className="mt-2 text-[20px] font-extrabold tracking-[-0.02em] text-[#191F28]">
                {copy.title}
              </h2>
              <p className="mt-1.5 text-[13px] leading-5 text-[#6B7684]">
                {copy.description}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {[
              "다음 결제일 전에 미리 알림",
              "놓치기 쉬운 구독 갱신 일정 안내",
              "더 저렴하게 이용할 수 있는 혜택 확인",
            ].map((text) => (
              <div key={text} className="flex items-center gap-2.5 rounded-2xl bg-[#F7F8FA] px-3.5 py-3">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[#3182F6] shadow-sm">
                  <CheckCircle2 size={15} />
                </span>
                <span className="text-[12.5px] font-semibold text-[#333D4B]">{text}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[#E5E8EB] bg-white px-3.5 py-3">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#6B7684]" />
            <p className="text-[11.5px] leading-5 text-[#6B7684]">
              {nativeMode
                ? "알림 권한은 결제 예정 안내에만 사용해요. 실제 Heads-up 체험은 기기 알림 권한이 허용된 경우에만 실행돼요."
                : "알림 권한은 결제 예정 안내에만 사용해요. 웹에서는 브라우저가 허용하는 범위에서만 시스템 알림을 사용할 수 있어요."}
            </p>
          </div>

          {permission === "denied" && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3">
              <button
                type="button"
                onClick={() => setShowHelp((value) => !value)}
                className="flex w-full items-center gap-2 text-left text-[12px] font-bold text-amber-900"
              >
                <AlertTriangle size={15} />
                {nativeMode ? "휴대폰 알림 다시 켜는 방법" : "브라우저 알림 다시 켜는 방법"}
              </button>

              {showHelp && (
                <ol className="mt-2 space-y-1 pl-6 text-[11px] leading-5 text-amber-900">
                  {nativeMode ? (
                    <>
                      <li>1. 휴대폰 설정 → 앱 → 꾸독으로 이동하세요.</li>
                      <li>2. 알림 메뉴에서 ‘알림 허용’을 켜세요.</li>
                      <li>3. 꾸독으로 돌아오면 권한 상태를 다시 확인할 수 있어요.</li>
                    </>
                  ) : (
                    <>
                      <li>1. 주소창 왼쪽의 사이트 정보 아이콘을 누르세요.</li>
                      <li>2. 사이트 설정에서 ‘알림’을 허용으로 변경하세요.</li>
                      <li>3. 꾸독 페이지를 새로고침하면 권한 상태가 다시 확인됩니다.</li>
                    </>
                  )}
                </ol>
              )}
            </div>
          )}

          <div className="mt-5 space-y-2">
            {permission === "default" && (
              <Button
                size="large"
                fullWidth
                disabled={requesting}
                onClick={requestPermission}
              >
                {requesting ? "권한 확인 중..." : "알림 허용하기"}
              </Button>
            )}

            {permission === "denied" && (
              <Button
                size="large"
                fullWidth
                variant="secondary"
                onClick={() => setShowHelp(true)}
              >
                {nativeMode ? "휴대폰 설정 방법 확인" : "브라우저 설정 방법 확인"}
              </Button>
            )}

            <Button
              size="large"
              fullWidth
              variant={permission === "granted" ? "primary" : "secondary"}
              onClick={onContinue}
            >
              {permission === "granted"
                ? nativeMode
                  ? "설정 완료하고 Heads-up 체험"
                  : "설정 완료하고 계속"
                : "알림 없이 계속"}
            </Button>
          </div>

          <p className="mt-3 text-center text-[10.5px] leading-4 text-[#8B95A1]">
            {nativeMode
              ? permission === "granted"
                ? "버튼을 누르면 앱이 홈 화면으로 내려가고 약 2.5초 뒤 기존 스타일의 Heads-up 알림이 표시돼요."
                : "Heads-up 체험은 알림 권한을 허용한 뒤 실행할 수 있어요."
              : "웹에서는 권한 설정만 저장하며, 홈 화면 Heads-up 체험은 Android 앱에서 제공해요."}
          </p>
        </div>
      </section>
    </div>
  );
}
