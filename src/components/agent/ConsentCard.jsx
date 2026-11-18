import { KeyValueRows } from "./agentParts";
import { CardButton } from "./ConfirmCard";

/**
 * AI 데이터 전송 동의. 대화 위에 겹치는 시트(토스 약관 시트 방식).
 * 보내는 정보와 보내지 않는 정보를 줄 항목으로 나눠 보여 준다.
 */
export function ConsentSheet({ onAccept, onDecline }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end" role="presentation">
      <div className="absolute inset-0 rounded-t-[20px] bg-black/40" aria-hidden="true" />
      <div
        className="relative rounded-t-[20px] bg-white px-5 pb-4 pt-2"
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-consent-title"
        data-testid="chat-consent-card"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-gray-200" aria-hidden="true" />
        <h3 id="agent-consent-title" className="mt-5 break-keep text-[20px] font-bold leading-[28px] tracking-[-0.03em] text-ink">
          AI로 답하려면<br />구독 정보를 보내야 해요
        </h3>
        <p className="mt-1.5 break-keep text-[15px] leading-[22px] text-ink-muted">
          더 정확하게 답하려고 Google Gemini를 써요. 동의하지 않아도 간단 모드로 답해 드려요.
        </p>
        <KeyValueRows
          className="mt-4 border-t border-gray-100 pt-1.5"
          rows={[
            { label: "보내는 정보", value: "구독 이름, 금액, 결제일, 결제수단 이름, 사용 체크 답변, 알림 설정" },
            { label: "보내지 않는 정보", value: "카드번호, 비밀번호" },
            { label: "끄는 곳", value: "이 화면 위쪽 ‘AI 데이터 전송 끄기’" },
          ]}
        />
        <CardButton tone="primary" className="mt-5 w-full" onClick={onAccept}>동의하고 보내기</CardButton>
        <button type="button" onClick={onDecline} className="mt-1 min-h-[44px] w-full text-center text-[14px] font-medium text-ink-muted">
          간단 모드로 답하기
        </button>
      </div>
    </div>
  );
}

/** 예전 이름. */
export const ConsentCard = ConsentSheet;

