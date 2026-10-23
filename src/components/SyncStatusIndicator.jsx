import { LoaderCircle, RefreshCw, AlertCircle } from "lucide-react";

/**
 * 서버 동기화 상태 및 재시도 대기열 표시기
 * - idle + pendingRetryCount === 0: 미표시 (화면 방해 없음)
 * - syncing: 동기화 진행 중 인디케이터
 * - error / pending: "동기화 대기 중 n건" 및 재시도 버튼
 */
export function SyncStatusIndicator({
  syncState = "idle",
  pendingRetryCount = 0,
  onRetry,
  className = "",
}) {
  if (syncState === "idle" && pendingRetryCount === 0) {
    return null;
  }

  const isSyncing = syncState === "syncing";

  return (
    <aside
      className={`w-full max-w-full sm:max-w-[440px] mx-auto px-4 pt-2 pb-1 transition-all ${className}`}
      role="status"
      aria-live="polite"
      aria-label="데이터 동기화 상태"
      data-testid="sync-status-indicator"
    >
      <div
        className={`flex items-center justify-between gap-2.5 rounded-xl border px-3.5 py-2 text-[12px] shadow-2xs ${
          isSyncing
            ? "border-[#E5E8EB] bg-[#F9FAFB] text-[#4E5968]"
            : "border-amber-200 bg-amber-50/90 text-amber-900"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {isSyncing ? (
            <LoaderCircle size={15} className="animate-spin text-[#153D2E] shrink-0" />
          ) : (
            <AlertCircle size={15} className="text-amber-600 shrink-0" />
          )}
          <span className="truncate font-medium">
            {isSyncing
              ? "서버와 동기화하는 중..."
              : `동기화 대기 중 ${pendingRetryCount}건`}
          </span>
        </div>

        {!isSyncing && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-200 active:scale-95 transition-transform cursor-pointer"
            aria-label="동기화 재시도"
          >
            <RefreshCw size={11} />
            <span>재시도</span>
          </button>
        )}
      </div>
    </aside>
  );
}
