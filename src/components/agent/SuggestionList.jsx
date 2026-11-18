import { CalendarDays, ArrowUpLeft } from "lucide-react";
import { ServiceLogo } from "../ui";

/**
 * 처음 열었을 때. "지금 챙길 일"(실제 구독·해지 확인 기록에서 뽑은 행)과 맥락에 맞는 질문 예시.
 * tasks: [{ key, serviceId, name, monogram, title, subtitle, urgentText, prompt, icon }]
 */
export function SuggestionList({ tasks = [], prompts = [], hasSubscriptions = true, onSelect }) {
  return (
    <div className="space-y-6 pt-2">
      <div>
        <h2 className="text-[22px] font-bold leading-[30px] tracking-[-0.03em] text-ink">무엇을 맡길까요?</h2>
        <p className="mt-1.5 break-keep text-[15px] leading-[22px] text-ink-tertiary">
          해지·환불·결제 일정을 대신 확인해요.<br />실행하기 전엔 꼭 물어볼게요.
        </p>
      </div>

      {tasks.length > 0 && (
        <section aria-labelledby="agent-tasks-title">
          <h3 id="agent-tasks-title" className="mb-1 text-[13px] font-semibold text-ink-muted">지금 챙길 일</h3>
          {tasks.map((task) => (
            <button
              key={task.key}
              type="button"
              onClick={() => onSelect(task.prompt)}
              className="-mx-5 flex min-h-[64px] w-[calc(100%+2.5rem)] items-center gap-3.5 px-5 py-2.5 text-left active:bg-gray-50"
              data-testid="agent-task-row"
            >
              {task.icon === "calendar" ? (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-gray-100 text-ink-muted" aria-hidden="true">
                  <CalendarDays size={20} strokeWidth={1.7} />
                </span>
              ) : (
                <ServiceLogo serviceId={task.serviceId} name={task.name} monogram={task.monogram} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-medium leading-[22px] text-ink">{task.title}</span>
                <span className="mt-0.5 block truncate text-[13px] leading-[18px] text-ink-tertiary">
                  {task.subtitle}
                  {task.urgentText && <span className="font-semibold text-danger">{" · " + task.urgentText}</span>}
                </span>
              </span>
            </button>
          ))}
        </section>
      )}

      {!hasSubscriptions && (
        <p className="break-keep text-[15px] leading-[22px] text-ink-muted">구독을 추가하면 결제일과 해지를 대신 챙겨 드려요.</p>
      )}

      {prompts.length > 0 && (
        <section aria-labelledby="agent-prompts-title">
          <h3 id="agent-prompts-title" className="mb-1 text-[13px] font-semibold text-ink-muted">이렇게 물어볼 수 있어요</h3>
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSelect(prompt)}
              className="-mx-5 flex min-h-[46px] w-[calc(100%+2.5rem)] items-center justify-between gap-3 px-5 text-left text-[15px] text-ink-secondary active:bg-gray-50"
            >
              <span className="truncate">{prompt}</span>
              <ArrowUpLeft size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />
            </button>
          ))}
        </section>
      )}
    </div>
  );
}


