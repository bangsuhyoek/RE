import { Check } from "lucide-react";
import { ServiceLogo } from "../ui";
import { KeyValueRows, Note } from "./agentParts";

const cx = (...parts) => parts.filter(Boolean).join(" ");

const BUTTON_TONE = {
  primary: "bg-gray-900 text-white hover:bg-gray-800 active:bg-black",
  secondary: "bg-gray-100 text-ink-secondary hover:bg-gray-200",
  outline: "border border-gray-200 bg-white text-ink-secondary hover:border-gray-300",
};

/** 카드 안 버튼. 52px(기본) 또는 44px(compact). */
export function CardButton({ tone = "secondary", compact = false, className = "", children, ...rest }) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-[14px] px-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        compact ? "h-11 text-[15px]" : "h-[52px] text-[16px]",
        BUTTON_TONE[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * 진행 단계. done(회색 체크) / now(잉크 번호) / next(빈 원 번호).
 * steps: [{ label, state: "done" | "now" | "next" }]
 */
export function ProgressSteps({ steps = [] }) {
  if (!steps.length) return null;
  return (
    <ol className="mt-3.5 space-y-2.5" data-testid="agent-progress-steps">
      {steps.map((step, idx) => (
        <li key={step.label} className="flex items-center gap-2.5 text-[15px] leading-[20px]">
          <span
            className={cx(
              "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[12px] font-bold",
              step.state === "done" && "bg-gray-100 text-ink",
              step.state === "now" && "bg-gray-900 text-white",
              step.state === "next" && "border-[1.5px] border-gray-300 text-ink-tertiary",
            )}
            aria-hidden="true"
          >
            {step.state === "done" ? <Check size={13} strokeWidth={2.4} /> : idx + 1}
          </span>
          <span className={cx("break-keep", step.state === "now" ? "text-ink" : "text-ink-tertiary")}>
            {step.label}
            <span className="sr-only">{step.state === "done" ? " (완료)" : step.state === "now" ? " (지금 할 일)" : " (다음)"}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * 모든 실행 확인·결과를 같은 모양으로 그린다.
 * 로고 + 제목 + 보조 줄, 라벨/값 줄 2~3개, 안내 한 줄, 버튼(그만두기 / 진행할게요).
 */
export function ConfirmCard({
  testId,
  serviceId = null,
  name = "",
  monogram = null,
  icon = null,
  eyebrow = null,
  eyebrowTone = "muted",
  title,
  subtitle = null,
  rows = [],
  note = null,
  noteTone = "muted",
  steps = [],
  secondary = null,
  primary = null,
  children = null,
  className = "",
}) {
  const hasHead = Boolean(title);
  const showLogo = Boolean(icon || serviceId || name);
  return (
    <section
      className={cx("rounded-2xl border border-gray-200 bg-white px-[18px] pb-4 pt-[18px]", className)}
      data-testid={testId}
    >
      {eyebrow && (
        <p className={cx("mb-2 text-[13px] font-semibold", eyebrowTone === "danger" ? "text-danger" : "text-ink-tertiary")}>{eyebrow}</p>
      )}
      {hasHead && (
        <div className="flex items-center gap-3">
          {showLogo && (icon || <ServiceLogo serviceId={serviceId} name={name} monogram={monogram} />)}
          <div className="min-w-0 flex-1">
            <h3 className="break-keep text-[17px] font-bold leading-[24px] tracking-[-0.02em] text-ink">{title}</h3>
            {subtitle && <p className="mt-0.5 truncate text-[13px] leading-[18px] text-ink-tertiary">{subtitle}</p>}
          </div>
        </div>
      )}
      {rows.length > 0 && <KeyValueRows rows={rows} className={cx(hasHead && "mt-3.5 border-t border-gray-100 pt-1.5")} />}
      <ProgressSteps steps={steps} />
      {note && <Note tone={noteTone} className="mt-2">{note}</Note>}
      {children}
      {(secondary || primary) && (
        <div className="mt-3.5 flex gap-2">
          {secondary && (
            <CardButton
              tone={secondary.tone || "secondary"}
              className="flex-1"
              onClick={secondary.onClick}
              disabled={secondary.disabled}
            >
              {secondary.label}
            </CardButton>
          )}
          {primary && (
            <CardButton
              tone={primary.tone || "primary"}
              className={secondary ? "flex-[1.6]" : "flex-1"}
              onClick={primary.onClick}
              disabled={primary.disabled}
            >
              {primary.icon}
              {primary.label}
            </CardButton>
          )}
        </div>
      )}
    </section>
  );
}

