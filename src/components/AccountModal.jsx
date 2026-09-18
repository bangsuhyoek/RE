import { useEffect, useState } from "react";
import { LogOut, Check, X, AlertCircle, ChevronRight, ImagePlus, RotateCcw } from "lucide-react";
import { BottomSheet, Button } from "./ui";
import {
  DEFAULT_CHARACTER_SRC,
  applyPendingCharacter,
  discardPendingCharacter,
  getCharacterAsset,
  pickCharacterPng,
  resetCharacterAsset,
} from "../lib/characterAsset";

function GoogleIcon({ className = "h-4 w-4 shrink-0" }) {
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

export function AccountModal({
  profile,
  onClose,
  onUpdateNickname,
  onLogout,
  onTestPaymentDetection,
  onRequestPaymentCapture,
}) {
  const currentNickname = profile?.nickname || "사용자";
  const [nicknameInput, setNicknameInput] = useState(currentNickname);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [characterOpen, setCharacterOpen] = useState(false);
  const [characterAsset, setCharacterAsset] = useState({
    mode: "DEFAULT",
    hasCustom: false,
    src: DEFAULT_CHARACTER_SRC,
  });
  const [pendingCharacter, setPendingCharacter] = useState(null);
  const [characterError, setCharacterError] = useState("");
  const [characterBusy, setCharacterBusy] = useState(false);

  const isGoogle = profile?.provider === "Google";

  useEffect(() => {
    let active = true;
    getCharacterAsset().then((asset) => {
      if (active) setCharacterAsset(asset);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleNicknameChange = (e) => {
    setNicknameInput(e.target.value);
    setError("");
    setSuccess(false);
  };

  const handleSaveNickname = (e) => {
    e.preventDefault();
    const trimmed = nicknameInput.trim();
    if (!/^[가-힣a-zA-Z0-9\s]{2,12}$/.test(trimmed)) {
      setError("닉네임은 한/영 2~12자로 입력해 주세요.");
      return;
    }
    if (trimmed === currentNickname) {
      setError("현재 닉네임과 동일합니다.");
      return;
    }
    onUpdateNickname(trimmed);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
    }, 2000);
  };

  const isValidNickname = /^[가-힣a-zA-Z0-9\s]{2,12}$/.test(nicknameInput.trim());
  const canSave = isValidNickname && nicknameInput.trim() !== currentNickname;

  const handlePickCharacter = async () => {
    setCharacterBusy(true);
    setCharacterError("");
    const result = await pickCharacterPng();
    setCharacterBusy(false);
    if (result?.status === "READY") {
      setPendingCharacter(result);
      return;
    }
    if (result?.status && result.status !== "CANCELLED") {
      setCharacterError(result.message || "이미지를 불러오지 못했어요. 다시 시도해주세요.");
    }
  };

  const handleApplyCharacter = async () => {
    setCharacterBusy(true);
    setCharacterError("");
    const result = await applyPendingCharacter();
    setCharacterBusy(false);
    if (result?.status === "APPLIED") {
      setCharacterAsset(result);
      setPendingCharacter(null);
      setCharacterOpen(false);
      return;
    }
    setCharacterError(result?.message || "이미지를 적용하지 못했어요. 다시 시도해주세요.");
  };

  const handleResetCharacter = async () => {
    setCharacterBusy(true);
    setCharacterError("");
    const result = await resetCharacterAsset();
    setCharacterBusy(false);
    if (result?.status === "RESET") {
      setCharacterAsset(result);
      setPendingCharacter(null);
      setCharacterOpen(false);
      return;
    }
    setCharacterError(result?.message || "기본 캐릭터로 되돌리지 못했어요.");
  };

  const closeCharacterPanel = async () => {
    if (pendingCharacter) await discardPendingCharacter();
    setPendingCharacter(null);
    setCharacterError("");
    setCharacterOpen(false);
  };

  const handleAccountClose = () => {
    if (pendingCharacter) discardPendingCharacter();
    setPendingCharacter(null);
    onClose();
  };

  const previewFallback = (event) => {
    if (event.currentTarget.getAttribute("data-fallback") === "1") return;
    event.currentTarget.setAttribute("data-fallback", "1");
    event.currentTarget.src = DEFAULT_CHARACTER_SRC;
  };

  return (
    <BottomSheet onClose={handleAccountClose} label="계정 설정">
      <div className="flex items-center justify-between pb-3 border-b border-[#F2F4F6]">
        <h2 className="text-[18px] font-bold tracking-tight text-[#191F28]">내 계정 관리</h2>
        <button
          type="button"
          onClick={handleAccountClose}
          className="grid h-8 w-8 place-items-center rounded-full text-[#8B95A1] hover:bg-[#F2F4F6] hover:text-[#191F28] transition-colors"
          aria-label="닫기"
        >
          <X size={18} />
        </button>
      </div>

      {/* 사용자 프로필 요약 카드 */}
      <div className="mt-4 flex items-center gap-3.5 rounded-2xl bg-[#F9FAFB] p-4 border border-[#E5E8EB]">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#191F28] text-[18px] font-bold text-white shadow-xs">
          {currentNickname.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <strong className="text-[16px] font-bold text-[#191F28] truncate">{currentNickname}</strong>
            <span className="rounded-md bg-[#EEF2F6] px-1.5 py-0.5 text-[10px] font-semibold text-[#4E5968]">
              {isGoogle ? "Google" : "꾸독"}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-[#8B95A1] flex items-center gap-1 truncate">
            {isGoogle ? (
              <>
                <GoogleIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{profile?.email || "Google 계정 연동됨"}</span>
              </>
            ) : (
              <span>꾸독 정식 회원</span>
            )}
          </p>
        </div>
      </div>

      {/* 캐릭터 설정: 기존 설정 행과 같은 밀도로 유지 */}
      <button
        type="button"
        onClick={() => {
          setCharacterError("");
          setPendingCharacter(null);
          setCharacterOpen(true);
        }}
        className="mt-3 flex min-h-[56px] w-full items-center justify-between rounded-2xl border border-[#E5E8EB] bg-white px-3.5 py-2.5 text-left shadow-2xs transition-colors hover:bg-[#F9FAFB] active:bg-[#F2F4F6]"
      >
        <span className="text-[13px] font-bold text-[#191F28]">캐릭터</span>
        <span className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-[#F2F4F6] p-1">
            <img
              src={characterAsset.src || DEFAULT_CHARACTER_SRC}
              onError={previewFallback}
              alt="현재 캐릭터"
              className="h-full w-full object-contain"
            />
          </span>
          <span className="text-[12px] font-semibold text-[#6B7684]">변경</span>
          <ChevronRight size={14} className="text-[#B0B8C1]" />
        </span>
      </button>

      {characterOpen && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/20 px-4 pb-[max(18px,env(safe-area-inset-bottom,0px))] sm:items-center sm:pb-0">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="캐릭터 이미지 변경"
            className="w-full max-w-[340px] rounded-[22px] border border-[#E5E8EB] bg-white p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <strong className="text-[15px] font-bold text-[#191F28]">캐릭터 변경</strong>
              <button
                type="button"
                onClick={closeCharacterPanel}
                className="grid h-8 w-8 place-items-center rounded-full text-[#8B95A1] hover:bg-[#F2F4F6]"
                aria-label="캐릭터 변경 닫기"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-center gap-3">
              <div className="text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-[#F2F4F6] p-1.5">
                  <img
                    src={characterAsset.src || DEFAULT_CHARACTER_SRC}
                    onError={previewFallback}
                    alt="현재 캐릭터 미리보기"
                    className="h-full w-full object-contain"
                  />
                </span>
                <span className="mt-1 block text-[10px] font-medium text-[#8B95A1]">현재</span>
              </div>

              {pendingCharacter && (
                <>
                  <ChevronRight size={15} className="text-[#B0B8C1]" />
                  <div className="text-center">
                    <span className="mx-auto grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-[#F2F4F6] p-1.5 ring-1 ring-[#3182F6]/20">
                      <img
                        src={pendingCharacter.previewSrc}
                        onError={previewFallback}
                        alt="새 캐릭터 미리보기"
                        className="h-full w-full object-contain"
                      />
                    </span>
                    <span className="mt-1 block text-[10px] font-medium text-[#3182F6]">새 이미지</span>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handlePickCharacter}
              disabled={characterBusy}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3 py-2.5 text-[12px] font-bold text-[#333D4B] transition-colors hover:bg-[#F2F4F6] disabled:opacity-50"
            >
              <ImagePlus size={15} />
              PNG 이미지 선택
            </button>

            <p className="mt-2 text-center text-[10.5px] leading-4 text-[#8B95A1]">
              투명 배경 PNG를 권장해요.
            </p>

            {characterError && (
              <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 px-2.5 py-2 text-[11px] leading-4 text-[#E11D48]">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                {characterError}
              </p>
            )}

            {pendingCharacter ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={closeCharacterPanel}
                  disabled={characterBusy}
                  className="rounded-xl border border-[#E5E8EB] px-3 py-2.5 text-[12px] font-bold text-[#4E5968] disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleApplyCharacter}
                  disabled={characterBusy}
                  className="rounded-xl bg-[#191F28] px-3 py-2.5 text-[12px] font-bold text-white disabled:opacity-50"
                >
                  적용
                </button>
              </div>
            ) : (
              characterAsset.hasCustom && (
                <button
                  type="button"
                  onClick={handleResetCharacter}
                  disabled={characterBusy}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-[#6B7684] hover:text-[#191F28] disabled:opacity-50"
                >
                  <RotateCcw size={13} />
                  기본 캐릭터로 되돌리기
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* 닉네임 변경 블록 */}
      <div className="mt-5 rounded-2xl border border-[#E5E8EB] p-4 bg-white shadow-2xs">
        <label className="block">
          <span className="block text-[13px] font-bold text-[#191F28]">닉네임 변경</span>
          <span className="mt-0.5 block text-[11px] text-[#8B95A1]">
            홈 화면 및 알림에 표시되는 호칭이에요 (한/영 2~12자)
          </span>
          <div className="mt-2.5 flex items-center gap-2">
            <input
              type="text"
              value={nicknameInput}
              onChange={handleNicknameChange}
              placeholder="새 닉네임 입력"
              maxLength={12}
              className="flex-1 rounded-xl border border-[#E5E8EB] bg-white px-3.5 py-2.5 text-[14px] text-[#191F28] outline-none transition-colors focus:border-black placeholder:text-[#A1A1AA]"
            />
            <button
              type="button"
              onClick={handleSaveNickname}
              disabled={!canSave}
              className={`rounded-xl px-3.5 py-2.5 text-[13px] font-bold transition-all ${
                canSave
                  ? "bg-[#191F28] text-white hover:bg-black active:scale-95"
                  : "bg-[#F2F4F6] text-[#A1A1AA] cursor-not-allowed"
              }`}
            >
              변경
            </button>
          </div>
        </label>

        {error && (
          <p className="mt-2 flex items-center gap-1 text-[12px] text-[#EF4444]">
            <AlertCircle size={13} />
            {error}
          </p>
        )}
        {success && (
          <p className="mt-2 flex items-center gap-1 text-[12px] text-[#10B981]">
            <Check size={13} />
            닉네임이 성공적으로 변경되었습니다.
          </p>
        )}
      </div>

      {/* 스마트 자동화 설정: 실시간 결제 자동 감지 (Beta) */}
      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs">
              ⚡
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <strong className="block text-[13px] font-bold text-emerald-950">실시간 결제 자동 감지</strong>
                <span className="rounded bg-emerald-200/80 px-1 py-0.2 text-[9px] font-bold text-emerald-800">Beta</span>
              </div>
              <span className="block text-[11px] text-emerald-700/80 truncate">
                카드사 결제 문자/앱 알림 시 자동 등록 팝업
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onTestPaymentDetection && (
              <Button
                size="compact"
                variant="secondary"
                className="!py-1.5 !px-2.5 !text-[11px] !bg-white !border-emerald-200 !text-emerald-900 cursor-pointer"
                onClick={onTestPaymentDetection}
              >
                체험
              </Button>
            )}
            {onRequestPaymentCapture && (
              <Button
                size="compact"
                className="!py-1.5 !px-2.5 !text-[11px] !bg-emerald-600 !text-white hover:!bg-emerald-700 cursor-pointer"
                onClick={onRequestPaymentCapture}
              >
                설정
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 로그아웃 블록 */}
      <div className="mt-6 pt-2">
        <Button
          variant="secondary"
          className="w-full flex items-center justify-center gap-2 text-[#E11D48] hover:bg-red-50 hover:border-red-200 border-[#E5E8EB] py-3 text-[14px]"
          onClick={() => {
            handleAccountClose();
            onLogout();
          }}
        >
          <LogOut size={16} />
          <span>로그아웃</span>
        </Button>
      </div>
    </BottomSheet>
  );
}
