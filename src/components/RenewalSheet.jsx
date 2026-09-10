import { BottomSheet, Button, ServiceMark } from "./ui";
import { formatWon } from "../lib/dates";

export function RenewalSheet({ subscription, onKeep, onCancel, onClose }) {
  if (!subscription) return null;

  return (
    <BottomSheet onClose={onClose} label="결제일 경과 구독 확인">
      <div className="flex items-start gap-3">
        <ServiceMark
          serviceId={subscription.id}
          name={subscription.name}
          monogram={subscription.monogram}
          image={subscription.image || subscription.attachments?.[0]}
          category={subscription.category}
          className="h-12 w-12 rounded-xl text-[14px] shrink-0 shadow-2xs"
        />
        <div className="min-w-0 flex-1">
          <span className="text-[12px] font-bold text-fg-brand">갱신 리마인더</span>
          <h2 className="text-[20px] font-semibold tracking-[-0.02em]">이번 달에도 계속 이용하셨나요?</h2>
        </div>
      </div>

      {/* 결제 정보 요약 카드 */}
      <div className="mt-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E8EB] p-3.5 flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <div className="text-[14px] font-bold text-fg-primary truncate">{subscription.name}</div>
          <div className="text-[12px] text-fg-muted truncate">{subscription.plan}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[16px] font-extrabold text-fg-primary">{formatWon(subscription.amount)}</div>
          <div className="text-[11px] text-[#FF4D4D] font-bold">결제일 경과</div>
        </div>
      </div>

      <p className="mt-3.5 text-[13px] leading-relaxed text-[#71717A]">
        <strong className="font-semibold text-black">{subscription.name}</strong>은 지난 결제일이 지났어요. 계속 이용했다면 다음 달에도 알림을 보내드릴게요.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          size="large"
          className="border border-[#E5E8EB] text-[#E03838] hover:bg-[#FFF5F5] active:bg-[#FFEBEB]"
          onClick={onCancel}
        >
          해지했어요
        </Button>
        <Button
          size="large"
          onClick={onKeep}
        >
          계속 쓸게요
        </Button>
      </div>
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] px-4 text-[13px] text-fg-subtle hover:text-fg-muted flex items-center justify-center underline underline-offset-4 cursor-pointer"
        >
          나중에 확인하기
        </button>
      </div>
    </BottomSheet>
  );
}
