import { useEffect, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import { BottomSheet } from "./ui";

// 안드로이드 뒤로가기 버튼이 열린 선택 시트를 먼저 닫을 수 있도록 현재 열린 시트의 닫기 함수를 기억한다.
const openSelectSheets = [];

/** 열린 선택 시트가 있으면 가장 위의 것을 닫고 true 를 돌려준다. */
export function closeOpenSelectSheet() {
  const top = openSelectSheets[openSelectSheets.length - 1];
  if (!top) return false;
  top.current?.();
  return true;
}

/** 앱 공통 바텀시트로 띄우는 단일 선택 목록. */
export function SelectSheet({ title, options, value, onSelect, onClose, columns = 0 }) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const entry = closeRef;
    openSelectSheets.push(entry);
    return () => {
      const index = openSelectSheets.indexOf(entry);
      if (index !== -1) openSelectSheets.splice(index, 1);
    };
  }, []);

  return (
    <BottomSheet onClose={onClose} label={title}>
      <h2 className="px-1 pb-2 pt-1 text-[17px] font-bold tracking-[-0.02em] text-ink">{title}</h2>
      {columns > 0 ? (
        <ul
          role="listbox"
          aria-label={title}
          className="grid gap-y-1.5 px-1 pb-2"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-label={option.label}
                  onClick={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                  className={`flex min-h-[44px] w-full items-center justify-center rounded-xl text-[15px] tabular-nums transition-colors ${
                    selected ? "bg-ink font-semibold text-white" : "font-medium text-ink active:bg-gray-100"
                  }`}
                >
                  {option.shortLabel ?? option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
      <ul role="listbox" aria-label={title} className="flex flex-col">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onSelect(option.value);
                  onClose();
                }}
                className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-[16px] tracking-tight transition-colors active:bg-gray-100 ${
                  selected ? "font-semibold text-ink" : "font-normal text-ink-secondary"
                }`}
              >
                <span className="min-w-0">{option.label}</span>
                {selected && <Check size={20} strokeWidth={2.2} className="shrink-0 text-ink" />}
              </button>
            </li>
          );
        })}
      </ul>
      )}
    </BottomSheet>
  );
}

/**
 * 선택 시트를 여는 트리거 버튼. 네이티브 select 자리에 쓴다.
 * variant="chip" 은 C2 필터 칩 모양(흰 바탕 + 회색 선 알약), 기본은 회색 면 입력칸 모양.
 */
export function SelectTrigger({ label, valueLabel, icon = null, onClick, className = "", variant = "field" }) {
  if (variant === "chip") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="listbox"
        aria-label={`${label}: ${valueLabel}`}
        className={`relative inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-white pl-3.5 pr-2.5 text-[14px] font-medium tracking-tight text-ink-secondary transition-colors hover:bg-gray-50 active:bg-gray-100 before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-[''] ${className}`}
      >
        {icon}
        <span className="whitespace-nowrap">{valueLabel}</span>
        <ChevronDown size={15} className="shrink-0 text-ink-tertiary" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="listbox"
      aria-label={`${label}: ${valueLabel}`}
      className={`flex min-h-[48px] w-full items-center gap-1.5 rounded-xl bg-gray-100 px-3.5 text-left text-[15px] font-medium tracking-tight text-ink transition-colors active:bg-gray-200 ${className}`}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{valueLabel}</span>
      <ChevronDown size={15} className="shrink-0 text-ink-tertiary" />
    </button>
  );
}
