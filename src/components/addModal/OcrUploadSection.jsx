import React from "react";
import { LoaderCircle, Sparkles, UploadCloud } from "lucide-react";
import { ToggleSwitch } from "../ui";

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
      <div className="pb-7 pt-7 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#EAF2ED] text-[#153D2E]">
          <UploadCloud size={25} />
        </div>

        <h3 className="mt-4 text-[18px] font-bold tracking-[-0.02em] text-[#111315]">
          결제 내역을 불러오면
          <br />
          직접 입력하지 않아도 돼요.
        </h3>

        <p className="mt-2 text-[13px] leading-5 text-[#6B7684]">
          영수증이나 결제 화면을 분석해서
          <br />
          구독 정보를 먼저 채워드려요.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFileChange}
      />

      <button
        type="button"
        disabled={scanning}
        onClick={onOpenFilePicker}
        className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[#153D2E] px-4 text-[15px] font-bold text-white transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {scanning ? (
          <>
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
            결제 정보 확인 중
          </>
        ) : (
          <>
            <UploadCloud size={18} />
            영수증 · 결제 화면 불러오기
          </>
        )}
      </button>

      <p className="mt-2 text-center text-[11px] text-[#8B95A1]">
        JPG · PNG · WEBP / 최대 8MB
      </p>

      {onOpenDiscovery && (
        <button
          type="button"
          onClick={onOpenDiscovery}
          className="mt-3 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-[#153D2E]/25 bg-[#EAF2ED] px-4 text-[14px] font-bold text-[#153D2E] transition-all active:scale-[0.99]"
        >
          <Sparkles size={17} />
          숨은 구독 한 번에 찾기 (설치앱·명세서·결제허브)
        </button>
      )}

      <div className="mt-7 border-t border-[#E7EAE8] pt-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-semibold text-[#252A28]">
              직접 입력이 필요해요
            </p>

            <p className="mt-0.5 text-[12px] leading-4 text-[#6B7684]">
              자동으로 불러오기 어려운 경우에만 사용해요.
            </p>
          </div>

          <ToggleSwitch
            checked={manualEntryOpen}
            onChange={onToggleManualEntry}
            label="직접 입력"
          />
        </div>

        {manualEntryOpen && children}
      </div>
    </div>
  );
});
