import { useEffect, useState } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { BottomSheet, Button, SectionBand } from "./ui";
import { readEvidenceCases } from "../lib/storage";
import { deleteAllEvidence, grantEvidenceConsent, readEvidenceConsent, revokeEvidenceConsent } from "../lib/evidenceStore";
import { grantDifficultyConsent, readDifficultyConsent, revokeDifficultyConsent } from "../lib/cancelDifficulty";
import { supabase } from "../lib/supabase";
import { requestAccountDeletion } from "../lib/accountClient";
import { exportUserData } from "../lib/dataExport";
import {
  getCaptureSourceSettings,
  setCaptureSourceSettings,
  readCaptureSourceSettingsLocal,
  readPaymentCaptureConsent,
  setPaymentCaptureConsent,
  revokePaymentCaptureConsent,
} from "../lib/paymentCapture";
import { PaymentCaptureDisclosureModal } from "./capture/PaymentCaptureDisclosureModal";

/** 설정 묶음 제목(Apple 설정의 그룹 머리말). */
function GroupTitle({ children }) {
  return <h3 className="pb-1 pt-5 text-[13px] font-medium text-ink-tertiary">{children}</h3>;
}

/** 시트 안에서 좌우 끝까지 닿는 회색 구획 띠. 시트 본문 좌우 여백(px-5)을 상쇄한다. */
function SheetBand() {
  return <SectionBand className="-mx-5 mt-4 w-auto" />;
}

/** ui.jsx ToggleSwitch 와 같은 모양에 disabled 만 더한 스위치. */
function RowSwitch({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50 before:absolute before:-inset-x-2 before:-inset-y-2.5 before:content-[''] ${
        checked ? "bg-brand" : "bg-gray-300"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

/** 설정 행: 제목 + 보조 줄 + 오른쪽 조작부. */
function SettingRow({ title, description, trailing = null, testId }) {
  return (
    <div className="flex min-h-[60px] items-center justify-between gap-4 py-3" data-testid={testId}>
      <div className="min-w-0 flex-1">
        <span className="block text-[16px] font-medium leading-[22px] text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-[18px] text-ink-tertiary">{description}</span>}
      </div>
      {trailing}
    </div>
  );
}

/**
 * 결제 알림 수집 출처 설정.
 * 문자·메신저·이메일 앱은 사용자가 직접 켤 때만 수집하며, 기본값은 모두 꺼짐이다.
 */
function CaptureSourceSettings({ onToast }) {
  const [settings, setSettings] = useState(() => readCaptureSourceSettingsLocal());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getCaptureSourceSettings()
      .then((next) => {
        if (active) setSettings(next);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const toggle = async (key) => {
    if (busy) return;
    setBusy(true);
    const next = { ...settings, [key]: !settings[key] };
    const result = await setCaptureSourceSettings(next);
    setBusy(false);
    if (!result?.success) {
      onToast?.("수집 출처 설정을 저장하지 못했어요. 다시 시도해 주세요.");
      return;
    }
    setSettings(next);
    onToast?.(
      next[key]
        ? "이 앱의 알림에서 결제 내역을 찾아볼게요. 알림 원문은 기기 밖으로 나가지 않아요."
        : "이 앱의 알림은 더 이상 읽지 않아요."
    );
  };

  const rows = [
    { key: "messaging", label: "문자(SMS) 앱", hint: "카드 승인 문자를 결제로 인식" },
    { key: "messenger", label: "메신저(카카오톡)", hint: "알림톡 결제 안내를 결제로 인식" },
    { key: "email", label: "이메일 앱", hint: "영수증·인보이스 메일 알림을 결제로 인식" },
  ];

  return (
    <div data-testid="account-capture-source-settings">
      <GroupTitle>알림에서 결제 찾기 (선택)</GroupTitle>
      <p className="pb-1 text-[13px] leading-relaxed text-ink-tertiary">
        카드사·은행·간편결제·앱스토어 알림은 기본으로 확인해요. 아래 앱은 켤 때만 확인하고, 알림 원문은 저장하거나 보내지 않아요.
      </p>
      <ul className="divide-y divide-gray-100">
        {rows.map((row) => (
          <li key={row.key}>
            <SettingRow
              title={row.label}
              description={row.hint}
              trailing={
                <RowSwitch
                  checked={Boolean(settings[row.key])}
                  label={`${row.label} 알림 수집`}
                  disabled={busy}
                  onChange={() => toggle(row.key)}
                />
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

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
    <div data-testid="account-evidence-settings">
      <SettingRow
        title="결제 증빙 기록"
        description={`요금 인상·유료 전환·해지 후 결제 증빙 ${count}건 · ${userId ? (consented ? "계정에 보관 중, 1년 뒤 자동 삭제" : "이 기기에만 저장") : "이 기기에만 저장"}`}
        trailing={userId ? <RowSwitch checked={consented} label="증빙 계정 보관" disabled={busy} onChange={toggle} /> : null}
      />
      {count > 0 && (
        confirmDelete ? (
          <div className="flex gap-2 pb-3">
            <Button size="default" variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)} disabled={busy}>취소</Button>
            <Button size="default" variant="danger" className="flex-1" onClick={removeAll} disabled={busy}>모두 지우기</Button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="flex min-h-[44px] w-full items-center border-t border-gray-100 text-left text-[16px] text-danger">증빙 모두 지우기</button>
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
    <SettingRow
      testId="account-difficulty-settings"
      title="해지 경험 익명 공유"
      description="해지 절차와 겪은 불편을 식별 정보 없이 통계로만 공유해요."
      trailing={<RowSwitch checked={consented} label="해지 난이도 익명 공유" disabled={busy} onChange={toggle} />}
    />
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
  onAccountDeleted,
  onTestPaymentDetection,
  onRequestPaymentCapture,
}) {
  const currentNickname = profile?.nickname || "사용자";
  const [nicknameInput, setNicknameInput] = useState(currentNickname);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showDisclosureModal, setShowDisclosureModal] = useState(false);
  const [captureConsented, setCaptureConsented] = useState(() => readPaymentCaptureConsent(null, userId));

  const handleOpenCaptureSettings = () => {
    if (readPaymentCaptureConsent(null, userId)) {
      onRequestPaymentCapture?.();
    } else {
      setShowDisclosureModal(true);
    }
  };

  const handleConfirmDisclosure = () => {
    setPaymentCaptureConsent(true, null, userId);
    setCaptureConsented(true);
    setShowDisclosureModal(false);
    onRequestPaymentCapture?.();
  };

  const handleCancelDisclosure = () => {
    setShowDisclosureModal(false);
    onToast?.("결제 자동 감지 동의가 취소되었습니다. 수동 등록은 언제든지 이용하실 수 있어요.");
  };

  const handleRevokeCaptureConsent = () => {
    revokePaymentCaptureConsent(null, userId);
    setCaptureConsented(false);
    onToast?.("결제 자동 감지 동의를 철회했습니다.");
  };

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
      <div className="flex items-center justify-between pb-1">
        <h2 className="text-[20px] font-bold tracking-[-0.03em] text-ink">내 계정</h2>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 grid h-11 w-11 place-items-center rounded-full text-ink-tertiary hover:bg-gray-100 hover:text-ink transition-colors"
          aria-label="닫기"
        >
          <X size={20} />
        </button>
      </div>

      {/* 프로필 행 */}
      <div className="flex min-h-[72px] items-center gap-3.5 py-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gray-100 text-[18px] font-semibold text-ink-muted" aria-hidden="true">
          {currentNickname.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-[17px] font-semibold text-ink">{currentNickname}</strong>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-ink-tertiary">
            {isGoogle ? (
              <>
                <GoogleIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{profile?.email || "Google 계정 연동됨"}</span>
              </>
            ) : (
              <span>게스트로 쓰는 중</span>
            )}
          </p>
        </div>
      </div>

      {/* 닉네임 변경 */}
      <GroupTitle>닉네임</GroupTitle>
      <label className="block">
        <span className="sr-only">닉네임 변경</span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={nicknameInput}
            onChange={handleNicknameChange}
            placeholder="새 닉네임 입력"
            maxLength={12}
            className="min-h-[48px] min-w-0 flex-1 rounded-xl bg-gray-100 px-3.5 text-[16px] text-ink outline-none transition-colors focus:bg-white focus:ring-1 focus:ring-inset focus:ring-gray-300 placeholder:text-ink-subtle"
          />
          <Button size="default" variant="primary" onClick={handleSaveNickname} disabled={!canSave} className="min-w-[68px] shrink-0">
            변경
          </Button>
        </div>
        <span className="mt-1.5 block text-[13px] text-ink-tertiary">홈과 알림에 보이는 이름이에요. 한글·영문 2~12자.</span>
      </label>
      {error && (
        <p role="alert" className="mt-1.5 flex items-center gap-1 text-[13px] text-danger">
          <AlertCircle size={14} />
          {error}
        </p>
      )}
      {success && (
        <p className="mt-1.5 flex items-center gap-1 text-[13px] text-ink-secondary">
          <Check size={14} />
          닉네임을 바꿨어요.
        </p>
      )}

      <SheetBand />

      {/* 결제 자동 감지 */}
      <GroupTitle>결제 자동 감지</GroupTitle>
      <SettingRow
        title="결제 알림으로 자동 등록"
        description="카드사 문자·앱 알림이 오면 등록 창을 띄워요. 시험 기능이에요."
        trailing={
          onRequestPaymentCapture ? (
            <Button size="compact" variant="secondary" onClick={handleOpenCaptureSettings} className="shrink-0">
              설정
            </Button>
          ) : null
        }
      />
      {(onTestPaymentDetection || captureConsented) && (
        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {onTestPaymentDetection && (
            <button type="button" onClick={onTestPaymentDetection} className="flex min-h-[48px] w-full items-center text-left text-[16px] text-ink">
              자동 감지 체험해 보기
            </button>
          )}
          {captureConsented && (
            <button type="button" onClick={handleRevokeCaptureConsent} className="flex min-h-[48px] w-full items-center text-left text-[16px] text-danger">
              자동 감지 동의 철회
            </button>
          )}
        </div>
      )}

      <CaptureSourceSettings onToast={onToast} />

      <SheetBand />

      {/* 데이터와 개인정보 */}
      <GroupTitle>데이터</GroupTitle>
      <div className="divide-y divide-gray-100">
        <EvidenceSettings userId={userId} onToast={onToast} />
        <DifficultySettings userId={userId} onToast={onToast} />
        {/* 데이터 내보내기 (JSON 백업) */}
        <DataExportSection userId={userId} profile={profile} onToast={onToast} />
      </div>

      <SheetBand />

      {/* 로그아웃 · 회원 탈퇴 */}
      <div className="divide-y divide-gray-100 pt-1">
        <button
          type="button"
          className="flex min-h-[52px] w-full items-center text-left text-[16px] font-medium text-danger"
          onClick={() => {
            onClose?.();
            onLogout?.();
          }}
        >
          로그아웃
        </button>
        {/* 회원 탈퇴 (데이터 영구 파기 및 로컬 정리) */}
        <AccountDeletionSection
          userId={userId}
          onClose={onClose}
          onAccountDeleted={onAccountDeleted}
        />
      </div>

      <PaymentCaptureDisclosureModal
        isOpen={showDisclosureModal}
        onConfirm={handleConfirmDisclosure}
        onCancel={handleCancelDisclosure}
      />
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
    <SettingRow
      testId="account-export-section"
      title="데이터 내보내기"
      description="구독 목록, 해지 기록, 증빙 요약, 동의 내역을 JSON 파일로 받아요."
      trailing={
        <Button
          size="compact"
          variant="secondary"
          disabled={exporting}
          onClick={handleExport}
          className="shrink-0"
          data-testid="account-export-button"
        >
          {exporting ? "만드는 중" : "내보내기"}
        </Button>
      }
    />
  );
}

/** 회원 탈퇴 구역 (지워지는 항목 설명, '탈퇴' 확인 입력, 진행/실패 표시, 로컬 정리 후 로그아웃) */
function AccountDeletionSection({ userId, onClose, onAccountDeleted }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isConfirmed = confirmInput.trim() === "탈퇴";

  const handleDelete = async () => {
    if (!isConfirmed || deleting) return;
    if (typeof onAccountDeleted !== "function") {
      setErrorMsg("탈퇴 처리를 시작할 수 없습니다. 다시 시도해 주세요.");
      return;
    }
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

      onClose?.();
      await onAccountDeleted(userId);
    } catch (err) {
      console.error("탈퇴 처리 실패:", err?.code || "FAILED");
      setErrorMsg(err.message || "탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      setDeleting(false);
    }
  };

  return (
    <div data-testid="account-deletion-section">
      {!showConfirm ? (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="flex min-h-[52px] w-full flex-col justify-center py-2 text-left"
        >
          <span className="text-[16px] font-medium text-danger">{userId ? "회원 탈퇴" : "기기 데이터 지우고 탈퇴"}</span>
          <span className="mt-0.5 text-[13px] text-ink-tertiary">구독·증빙·승인 데이터가 바로 영구 삭제돼요.</span>
        </button>
      ) : (
        <div className="py-3">
          <strong className="block text-[16px] font-semibold text-danger">{userId ? "회원 탈퇴" : "기기 데이터 지우고 탈퇴"}</strong>
          <p className="mt-2 text-[14px] text-ink-secondary">아래 항목이 모두 지워지고 되돌릴 수 없어요.</p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[14px] text-ink-tertiary">
            <li>등록된 모든 구독과 지난 구독 기록</li>
            <li>결제 증빙과 영수증 인식 내역</li>
            <li>꾸독 에이전트 승인 요청과 자동 허용 기록</li>
            <li>기기에 보관된 캐시와 설정</li>
          </ul>

          <label className="mt-4 block text-[14px] text-ink-secondary">
            계속하려면 <strong className="text-danger">'탈퇴'</strong>를 입력해 주세요.
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="탈퇴"
              disabled={deleting}
              className="mt-1.5 min-h-[48px] w-full rounded-xl bg-gray-100 px-3.5 text-[16px] text-ink outline-none focus:bg-white focus:ring-1 focus:ring-inset focus:ring-danger placeholder:text-ink-subtle"
              data-testid="account-delete-input"
            />
          </label>

          {errorMsg && (
            <p role="alert" className="mt-2 flex items-center gap-1 text-[13px] font-medium text-danger">
              <AlertCircle size={14} />
              {errorMsg}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <Button
              size="default"
              variant="secondary"
              disabled={deleting}
              onClick={() => {
                setShowConfirm(false);
                setConfirmInput("");
                setErrorMsg("");
              }}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              size="default"
              variant="danger"
              disabled={!isConfirmed || deleting}
              onClick={handleDelete}
              className="flex-1"
              data-testid="account-delete-button"
            >
              {deleting ? "탈퇴 처리 중" : "영구 탈퇴"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

