import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { Check, ChevronDown, ExternalLink, RotateCw } from "lucide-react";
import { normalizeWonText } from "../../lib/dates";

// 에이전트 시트에서 함께 쓰는 표현 조각. 상태나 서버 호출은 두지 않는다.

export const subscriptionKeyOf = (subscription) => subscription?.subscriptionId || subscription?.id || null;

export const findSubscription = (subscriptions = [], id) => {
  if (!id) return null;
  return subscriptions.find((s) => (s.subscriptionId || s.id) === id || s.id === id) || null;
};

// D-day 글자는 3일 이내(오늘 포함)만 빨강.
export const isUrgentDDay = (label) => {
  const text = String(label || "");
  const m = /D-(\d+)/.exec(text);
  return /오늘/.test(text) || (m ? Number(m[1]) <= 3 : false);
};

export const copyText = async (value, onToast, successMessage) => {
  try {
    await navigator.clipboard.writeText(value);
    onToast?.(successMessage);
  } catch {
    onToast?.("복사하지 못했어요. 길게 눌러 직접 복사해 주세요.");
  }
};

export const openExternal = (url) => {
  if (!url) return;
  if (Capacitor.isNativePlatform()) {
    Browser.open({ url }).catch(() => window.open(url, "_blank", "noopener,noreferrer"));
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

const cx = (...parts) => parts.filter(Boolean).join(" ");

/** 사용자 말: 오른쪽 회색 말풍선. */
export function UserBubble({ text }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[80%] whitespace-pre-wrap break-keep rounded-[18px] bg-gray-100 px-3.5 py-2.5 text-[16px] leading-[23px] text-ink">
        {normalizeWonText(text)}
      </p>
    </div>
  );
}

/** 꾸독 말: 말풍선 없는 16px 본문. */
export function AssistantText({ children, streaming = false, className = "" }) {
  return (
    <p className={cx("whitespace-pre-wrap break-keep text-[16px] leading-[26px] text-ink", className)}>
      {children}
      {streaming && <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-gray-400 align-[-2px]" aria-hidden="true" />}
    </p>
  );
}

/** 도구 사용 기록: 접힌 회색 한 줄. 누르면 단계 이름을 펼친다. */
export function ToolSummary({ tools = [], working = false }) {
  const [open, setOpen] = useState(false);
  const labels = tools.map((t) => (typeof t === "string" ? t : t?.label || t?.name)).filter(Boolean);
  if (labels.length === 0) return null;
  const text = working ? labels[labels.length - 1] + " 중이에요" : "구독 정보를 확인했어요";
  return (
    <div className="mb-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="-ml-1 inline-flex min-h-[32px] items-center gap-1 rounded-md px-1 text-[13px] text-ink-tertiary"
      >
        <Check size={14} strokeWidth={2} aria-hidden="true" />
        {text}
        <ChevronDown size={14} className={cx("transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <ul className="mb-1 ml-5 mt-0.5 space-y-0.5 text-[13px] leading-[19px] text-ink-tertiary">
          {labels.map((label, idx) => (
            <li key={label + idx}>{label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 출처 한 줄. */
export function SourceLine({ label, verifiedAt, url }) {
  if (!label) return null;
  return (
    <button
      type="button"
      onClick={() => openExternal(url)}
      className="mt-1.5 inline-flex min-h-[32px] items-center gap-1 text-left text-[13px] text-ink-tertiary"
    >
      <ExternalLink size={12} aria-hidden="true" />
      {label}{verifiedAt ? " · " + verifiedAt + " 확인" : ""}
    </button>
  );
}

/** 라벨(왼쪽)·값(오른쪽) 줄 묶음. Apple Pay 시트의 줄 항목 방식. */
export function KeyValueRows({ rows = [], className = "" }) {
  const visible = rows.filter((row) => row && row.value !== undefined && row.value !== null && row.value !== "");
  if (visible.length === 0) return null;
  return (
    <dl className={cx("space-y-0.5", className)}>
      {visible.map((row) => (
        <div key={row.label} className="flex items-start justify-between gap-3 py-1.5 text-[14px] leading-[20px]">
          <dt className="shrink-0 text-ink-muted">{row.label}</dt>
          <dd className="min-w-0 break-keep text-right font-medium text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 이어서 누를 질문 칩. C2 칩: 흰 바탕 + 회색 선, 36px. */
export function FollowUpChips({ items = [], onSelect, disabled = false }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const label = typeof item === "string" ? item : item.label;
        return (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={() => onSelect?.(item)}
            className="inline-flex h-9 items-center rounded-full border border-gray-200 bg-white px-3.5 text-[14px] font-medium text-ink-secondary transition-colors hover:border-gray-300 active:bg-gray-50 disabled:opacity-50"
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** 회색 보조 문장. tone="danger" 는 실패 문장에만. */
export function Note({ children, tone = "muted", className = "" }) {
  return (
    <p className={cx("break-keep text-[13px] leading-[19px]", tone === "danger" ? "text-danger" : "text-ink-tertiary", className)}>
      {children}
    </p>
  );
}

/** 대화 안 오류 줄 + 다시 시도. */
export function ErrorRow({ message, onRetry, disabled = false, bare = false }) {
  return (
    <div className={bare ? "" : "mt-3 border-t border-gray-100 pt-3"} data-testid="agent-error-row">
      <p className="break-keep text-[15px] leading-[23px] text-ink-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={disabled}
          className="mt-2.5 inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 text-[14px] font-semibold text-ink-secondary disabled:opacity-50"
        >
          <RotateCw size={15} aria-hidden="true" />
          다시 시도
        </button>
      )}
    </div>
  );
}

/** 작은 테두리 버튼(행 오른쪽 "해지" 등). */
export function RowButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 shrink-0 items-center rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] font-semibold text-ink-secondary hover:border-gray-300"
    >
      {children}
    </button>
  );
}

