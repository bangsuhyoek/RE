import { useRef } from "react";
import { Camera, X } from "lucide-react";

import { cx } from "./cx";

/**
 * SEED Attachment Input Component
 * Inspired by Daangn Seed Design (attachment-input / attachment-input-trigger / attachment-input-item)
 * Displays an 80x80px camera trigger button with count badge (e.g. 3/10) and horizontal thumbnail list.
 */
export function AttachmentInput({
  files = [],
  maxFiles = 10,
  onChange,
  onRemove,
  disabled = false,
  className = "",
}) {
  const fileInputRef = useRef(null);

  return (
    <div className={cx("flex items-center gap-2.5 overflow-x-auto py-1", className)}>
      <button
        type="button"
        disabled={disabled || files.length >= maxFiles}
        onClick={() => fileInputRef.current?.click()}
        className={cx(
          "relative flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white transition-colors",
          files.length >= maxFiles || disabled
            ? "cursor-not-allowed opacity-40"
            : "cursor-pointer hover:bg-gray-50 active:bg-gray-100"
        )}
        aria-label={`사진 첨부하기 (${files.length}/${maxFiles})`}
      >
        <Camera size={24} className="text-ink-tertiary" />
        <div className="text-[12px] leading-tight select-none">
          <strong className={cx("font-semibold", files.length > 0 ? "text-ink" : "text-ink-tertiary")}>
            {files.length}
          </strong>
          <span className="text-ink-tertiary">/{maxFiles}</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={onChange}
        />
      </button>

      {files.map((fileUrl, index) => (
        <div
          key={index}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
        >
          <img src={fileUrl} alt={`첨부 사진 ${index + 1}`} className="h-full w-full object-cover" />
          {index === 0 && (
            <span className="absolute bottom-0 inset-x-0 bg-black/60 py-0.5 text-center text-[10px] font-medium text-white backdrop-blur-xs select-none">
              대표 사진
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(index);
            }}
            className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-ink transition-colors hover:bg-gray-100 before:absolute before:-inset-3 before:content-['']"
            aria-label={`첨부 사진 ${index + 1} 삭제`}
          >
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * 선택형 칩. Chip 과 같은 C2 모양(선택 = 잉크 채움, 기본 = 흰 바탕 + 회색 선).
 */
export function ActionChip({
  children,
  selected = false,
  onClick,
  prefixIcon = null,
  className = "",
  disabled = false,
  size = "medium",
}) {
  const sizes = {
    small: "min-h-[28px] px-2.5 text-[12px]",
    medium: "min-h-[34px] px-3.5 text-[13px]",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-full border transition-colors select-none shrink-0 cursor-pointer",
        sizes[size] || sizes.medium,
        selected
          ? "border-ink bg-ink font-semibold text-white"
          : "border-gray-200 bg-white font-medium text-ink-secondary hover:bg-gray-50",
        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
        className
      )}
    >
      {prefixIcon && <span className="inline-flex shrink-0">{prefixIcon}</span>}
      <span>{children}</span>
    </button>
  );
}
