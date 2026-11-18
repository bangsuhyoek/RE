import { ArrowUp, Square } from "lucide-react";

/**
 * 고정 입력창. 둥근 회색 필드 안에 원형 보내기 버튼. 포커스는 필드 테두리 한 겹으로만 보인다.
 * 시트가 키보드 높이만큼 줄어들어(adjustResize + dvh) 항상 키보드 바로 위에 있다.
 */
export function Composer({ value, onChange, onSubmit, onStop, streaming = false, busy = false, inputRef = null }) {
  const canSend = Boolean(value.trim()) && !busy;
  return (
    <form
      className="shrink-0 bg-white px-4 pb-2 pt-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
      }}
    >
      <div className="flex h-12 items-center gap-2 rounded-full bg-gray-100 pl-[18px] pr-1.5 ring-inset transition-shadow focus-within:ring-1 focus-within:ring-gray-300">
        <input
          ref={inputRef}
          value={value}
          disabled={streaming}
          onChange={(event) => onChange(event.target.value)}
          placeholder="꾸독에게 요청하기"
          aria-label="꾸독에게 요청하기"
          enterKeyHint="send"
          className="no-focus-ring h-full min-w-0 flex-1 border-0 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-subtle disabled:text-ink-tertiary"
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="생성 중지"
            title="생성 중지"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-900 text-white"
          >
            <Square size={12} className="fill-current" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="보내기"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-900 text-white transition-colors disabled:bg-gray-300"
          >
            <ArrowUp size={18} strokeWidth={2.2} aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  );
}

