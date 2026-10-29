import React from "react";
import { ChevronRight, LoaderCircle, ScanText, ImageUp } from "lucide-react";
import { ToggleSwitch } from "../ui";

// C2: 불러오기 방법을 평평한 목록 행으로 둔다. 아이콘은 회색 면 위 선 아이콘.
function EntryIcon({ children }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[25%] bg-gray-100 text-ink-muted" aria-hidden="true">
      {children}
    </span>
  );
}

export const OcrUploadSection = React.memo(function OcrUploadSection({
  fileInputRef,
  scanning,
  onFileChange,
  onOpenFilePicker,
  onOpenDiscovery,
  manualEntryOpen,
  onToggleManualEntry,
  children,
}) {
  return (
    <div className="pb-2">
      <p className="pt-1 text-[15px] leading-[22px] text-ink-tertiary">
        영수증이나 결제 화면을 올리면 구독 정보를 먼저 채워 드려요.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="mt-3 divide-y divide-gray-100">
        <button
          type="button"
          disabled={scanning}
          onClick={onOpenFilePicker}
          aria-busy={scanning}
          className="-mx-2 flex min-h-[68px] w-[calc(100%+1rem)] items-center gap-3.5 rounded-xl px-2 py-3 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <EntryIcon>
            {scanning ? <LoaderCircle size={20} className="animate-spin" /> : <ImageUp size={20} strokeWidth={1.8} />}
          </EntryIcon>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-medium leading-[22px] text-ink">
              {scanning ? "결제 정보 확인 중" : "영수증 · 결제 화면 불러오기"}
            </span>
            <span className="mt-0.5 block text-[13px] leading-[18px] text-ink-tertiary">JPG · PNG · WEBP, 최대 8MB</span>
          </span>
          {!scanning && <ChevronRight size={18} strokeWidth={1.8} className="shrink-0 text-ink-subtle" aria-hidden="true" />}
        </button>

        {onOpenDiscovery && (
          <button
            type="button"
            onClick={onOpenDiscovery}
            className="-mx-2 flex min-h-[68px] w-[calc(100%+1rem)] items-center gap-3.5 rounded-xl px-2 py-3 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            <EntryIcon>
              <ScanText size={20} strokeWidth={1.8} />
            </EntryIcon>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-medium leading-[22px] text-ink">숨은 구독 한 번에 찾기</span>
              <span className="mt-0.5 block text-[13px] leading-[18px] text-ink-tertiary">설치 앱 · 카드 명세서 · 결제 허브에서 찾아요</span>
            </span>
            <ChevronRight size={18} strokeWidth={1.8} className="shrink-0 text-ink-subtle" aria-hidden="true" />
          </button>
        )}

        <div className="flex min-h-[68px] items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="text-[16px] font-medium leading-[22px] text-ink">직접 입력</p>
            <p className="mt-0.5 text-[13px] leading-[18px] text-ink-tertiary">불러오기 어려울 때 직접 적어요.</p>
          </div>

          <ToggleSwitch
            checked={manualEntryOpen}
            onChange={onToggleManualEntry}
            label="직접 입력"
          />
        </div>
      </div>

      {manualEntryOpen && children}
    </div>
  );
});
