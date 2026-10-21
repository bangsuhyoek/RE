import { ShieldCheck } from "lucide-react";
import { Button } from "../ui.jsx";

export function ConsentCard({ onAccept, onDecline }) {
  return (
    <div className="rounded-2xl border border-[#E5E8EB] bg-[#F9FAFB] p-4 text-[13px] leading-relaxed text-[#333D4B]" data-testid="chat-consent-card">
      <div className="flex items-center gap-2 text-[14px] font-extrabold text-[#191F28]">
        <ShieldCheck size={18} className="text-[#3182F6]" />
        <span>AI 대화 기능 안내</span>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-[#4E5968]">
        더 똑똑한 답변을 위해 구독 이름·금액·결제일·결제수단 이름이 Google Gemini로 전송돼요. 카드번호는 보내지 않아요.
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          size="compact"
          variant="secondary"
          className="flex-1 text-[12px]"
          onClick={onDecline}
        >
          간단 모드로 쓰기
        </Button>
        <Button
          size="compact"
          className="flex-1 text-[12px]"
          onClick={onAccept}
        >
          동의하고 계속
        </Button>
      </div>
    </div>
  );
}
