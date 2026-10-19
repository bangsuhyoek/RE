import { useState } from "react";
import { LogOut, Check, X, AlertCircle, FileText, Download, Trash2, AlertTriangle } from "lucide-react";
import { BottomSheet, Button } from "./ui";
import { readEvidenceCases } from "../lib/storage";
import { deleteAllEvidence, grantEvidenceConsent, readEvidenceConsent, revokeEvidenceConsent } from "../lib/evidenceStore";
import { grantDifficultyConsent, readDifficultyConsent, revokeDifficultyConsent } from "../lib/cancelDifficulty";
import { supabase } from "../lib/supabase";
import { requestAccountDeletion, clearDeviceData } from "../lib/accountClient";
import { exportUserData } from "../lib/dataExport";

/** 결제 경고 증빙의 계정 보관 동의와 삭제 */
function EvidenceSettings({ userId, onToast }) {
  const [consented, setConsented] = useState(() => Boolean(readEvidenceConsent(userId)));
  const [count, setCount] = useState(() => Object.keys(readEvidenceCases()).length);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggle = async () => {
    setBusy(true);
    if (consented) {
      const ok = await revokeEvidenceConsent(userId);
      if (ok) setConsented(false);
      onToast?.(ok ? "계정 보관을 끄고 서버의 증빙을 지웠어요. 이 기기 기록은 남아 있어요." : "서버 증빙을 지우지 못했어요. 다시 시도해 주세요.");
    } else {
      await grantEvidenceConsent(userId);
      setConsented(true);
      onToast?.("증빙을 계정에 보관해요. 만든 날부터 1년 뒤 자동으로 지워져요.");
    }
    setBusy(false);
  };

  const removeAll = async () => {
    setBusy(true);
    const ok = await deleteAllEvidence(userId);
    setBusy(false);
    setConfirmDelete(false);
    if (ok) setCount(0);
    onToast?.(ok ? "증빙 기록을 모두 지웠어요." : "서버 증빙을 지우지 못했어요. 다시 시도해 주세요.");
  };

  return (
    <div className="mt-5 rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-2xs" data-testid="account-evidence-settings">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <strong className="flex items-center gap-1.5 text-[13px] font-bold text-[#191F28]"><FileText size={14} /> 결제 증빙 기록</strong>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-[#8B95A1]">
            요금 인상·유료 전환·해지 후 결제 증빙 {count}건 · {userId ? (consented ? "계정에 보관 중(1년 뒤 자동 삭제)" : "이 기기에만 저장") : "이 기기에만 저장"}
          </span>
        </div>
        {userId && (
          <button
            type="button"
            role="switch"
            aria-checked={consented}
            aria-label="증빙 계정 보관"
            disabled={busy}
            onClick={toggle}
            className={"relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 " + (consented ? "bg-[#3182F6]" : "bg-[#D1D6DB]")}
          >
            <span className={"absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform " + (consented ? "translate-x-[22px]" : "translate-x-0.5")} />
          </button>
        )}
      </div>
      {count > 0 && (
        confirmDelete ? (
          <div className="mt-3 flex gap-2">
            <Button size="compact" variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)} disabled={busy}>취소</Button>
            <Button size="compact" className="flex-1 !bg-[#F04452]" onClick={removeAll} disabled={busy}>모두 지우기</Button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="mt-2 text-[11px] font-semibold text-[#F04452]">증빙 모두 지우기</button>
        )
      )}
    </div>
  );
}


/** 해지 난이도 및 다크패턴 익명 공유 동의 설정 */
function DifficultySettings({ userId, onToast }) {
  const [consented, setConsented] = useState(() => Boolean(readDifficultyConsent(userId)));
  const [busy, setBusy] = useState(false);

  const toggle = () => {
    setBusy(true);
    if (consented) {
      revokeDifficultyConsent(userId);
      setConsented(false);
      onToast?.("해지 난이도 익명 공유를 껐어요.");
    } else {
      grantDifficultyConsent(userId);
      setConsented(true);
      onToast?.("해지 경험을 익명으로 공유해요. 개인 식별 정보는 전혀 남기지 않아요.");
    }
    setBusy(false);
  };

  if (!userId) return null;

  return (
    <div className="mt-3 flex items-center justify-between rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-2xs" data-testid="account-difficulty-settings">
      <div className="min-w-0 pr-3">
        <strong className="block text-[13px] font-bold text-[#191F28]">해지 난이도 익명 공유</strong>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-[#8B95A1]">
          해지 시 겪은 절차와 다크패턴 경험을 식별자 없이 통계로만 익명 공유해요.
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={consented}
        aria-label="해지 난이도 익명 공유"
        disabled={busy}
        onClick={toggle}
        className={"relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 " + (consented ? "bg-[#3182F6]" : "bg-[#D1D6DB]")}
      >
        <span className={"absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform " + (consented ? "translate-x-[22px]" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

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
  userId = null,
  onToast,
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

  const isGoogle = profile?.provider === "Google";

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

  return (
    <BottomSheet onClose={onClose} label="계정 설정">
      <div className="flex items-center justify-between pb-3 border-b border-[#F2F4F6]">
        <h2 className="text-[18px] font-bold tracking-tight text-[#191F28]">내 계정 관리</h2>
        <button
          type="button"
          onClick={onClose}
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

      <EvidenceSettings userId={userId} onToast={onToast} />

      <DifficultySettings userId={userId} onToast={onToast} />

      {/* 데이터 내보내기 (JSON 백업) */}
      <DataExportSection userId={userId} profile={profile} onToast={onToast} />

      {/* 회원 탈퇴 (데이터 영구 파기 및 로컬 정리) */}
      <AccountDeletionSection
        userId={userId}
        onToast={onToast}
        onClose={onClose}
        onLogout={onLogout}
      />

      {/* 로그아웃 블록 */}
      <div className="mt-6 pt-2">
        <Button
          variant="secondary"
          className="w-full flex items-center justify-center gap-2 text-[#E11D48] hover:bg-red-50 hover:border-red-200 border-[#E5E8EB] py-3 text-[14px]"
          onClick={() => {
            onClose?.();
            onLogout?.();
          }}
        >
          <LogOut size={16} />
          <span>로그아웃</span>
        </Button>
      </div>
    </BottomSheet>
  );
}

/** 데이터 내보내기 구역 (JSON 내보내기, 게스트/회원 모두 지원) */
function DataExportSection({ userId, profile, onToast }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportUserData({ userId, profile });
      if (res?.ok) {
        onToast?.("데이터를 JSON 파일로 내보냈어요.");
      } else {
        onToast?.("데이터 내보내기에 실패했어요. 다시 시도해 주세요.");
      }
    } catch {
      onToast?.("데이터 내보내기에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-2xs" data-testid="account-export-section">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 pr-2">
          <strong className="flex items-center gap-1.5 text-[13px] font-bold text-[#191F28]">
            <Download size={14} /> 데이터 내보내기
          </strong>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-[#8B95A1]">
            구독 목록, 해지 기록, 증빙 요약 및 동의 내역을 JSON 파일로 백업해요.
          </span>
        </div>
        <Button
          size="compact"
          variant="secondary"
          disabled={exporting}
          onClick={handleExport}
          className="shrink-0 text-[12px] font-semibold"
          data-testid="account-export-button"
        >
          {exporting ? "생성 중..." : "내보내기"}
        </Button>
      </div>
    </div>
  );
}

/** 회원 탈퇴 구역 (지워지는 항목 설명, '탈퇴' 확인 입력, 진행/실패 표시, 로컬 정리 후 로그아웃) */
function AccountDeletionSection({ userId, onToast, onClose, onLogout }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isConfirmed = confirmInput.trim() === "탈퇴";

  const handleDelete = async () => {
    if (!isConfirmed || deleting) return;
    setDeleting(true);
    setErrorMsg("");

    try {
      if (userId) {
        // 로그인 회원인 경우 서버 계정 및 원격 데이터 삭제
        const sessionRes = await supabase?.auth?.getSession?.();
        const token = sessionRes?.data?.session?.access_token;
        if (!token) {
          throw new Error("인증 세션이 만료되었습니다. 다시 로그인 후 시도해 주세요.");
        }
        await requestAccountDeletion({ token, confirmation: "탈퇴" });
      }

      // 기기 로컬 데이터 영구 삭제
      clearDeviceData();

      onToast?.("회원 탈퇴 및 모든 데이터 삭제가 완료되었어요.");
      onClose?.();
      onLogout?.();
    } catch (err) {
      console.error("탈퇴 처리 실패:", err?.code || "FAILED");
      setErrorMsg(err.message || "탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      setDeleting(false);
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-red-100 bg-red-50/40 p-4 shadow-2xs" data-testid="account-deletion-section">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <strong className="flex items-center gap-1.5 text-[13px] font-bold text-[#F04452]">
            <Trash2 size={14} /> {userId ? "회원 탈퇴" : "로컬 데이터 초기화 및 탈퇴"}
          </strong>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-[#8B95A1]">
            계정과 연동된 모든 구독·증빙·승인 데이터가 즉시 영구 삭제됩니다.
          </span>
        </div>
        {!showConfirm && (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold text-[#F04452] hover:bg-red-100/60 transition-colors"
          >
            탈퇴하기
          </button>
        )}
      </div>

      {showConfirm && (
        <div className="mt-3 border-t border-red-100 pt-3">
          <div className="rounded-xl bg-white p-3 border border-red-100 text-[11px] text-[#4E5968] leading-relaxed">
            <p className="font-bold text-[#F04452] flex items-center gap-1 mb-1">
              <AlertTriangle size={13} /> 삭제되는 항목 안내
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-[#6B7684]">
              <li>등록된 모든 활성 및 과거 구독 목록</li>
              <li>결제 증빙 및 영수증 자동 인식 내역</li>
              <li>AI 에이전트 승인 요청 및 자동 허용(위임) 기록</li>
              <li>기기에 보관된 캐시 및 환경 설정</li>
            </ul>
            <p className="mt-2 text-[10px] text-[#8B95A1]">
              * 탈퇴 후에는 모든 데이터가 영구 파기되며 절대 복구할 수 없습니다.
            </p>
          </div>

          <div className="mt-3">
            <label className="block text-[11px] font-medium text-[#4E5968] mb-1">
              계속하려면 <strong className="text-[#F04452]">'탈퇴'</strong>를 입력해 주세요.
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="탈퇴"
              disabled={deleting}
              className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#F04452] placeholder:text-[#A1A1AA]"
              data-testid="account-delete-input"
            />
          </div>

          {errorMsg && (
            <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-[#F04452]">
              <AlertCircle size={13} />
              {errorMsg}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <Button
              size="compact"
              variant="secondary"
              disabled={deleting}
              onClick={() => {
                setShowConfirm(false);
                setConfirmInput("");
                setErrorMsg("");
              }}
              className="flex-1 text-[12px]"
            >
              취소
            </Button>
            <Button
              size="compact"
              disabled={!isConfirmed || deleting}
              onClick={handleDelete}
              className="flex-1 !bg-[#F04452] text-white text-[12px] disabled:opacity-40"
              data-testid="account-delete-button"
            >
              {deleting ? "탈퇴 처리 중..." : "영구 탈퇴"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
