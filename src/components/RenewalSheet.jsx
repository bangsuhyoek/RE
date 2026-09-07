import { BottomSheet, Button, ServiceMark } from "./ui";

export function RenewalSheet({ subscription, onKeep, onCancel, onClose }) {
  if (!subscription) return null;

  return (
    <BottomSheet onClose={onClose} label="결제일 경과 구독 확인">
      <div className="flex items-start gap-3">
        <ServiceMark monogram={subscription.monogram} className="h-11 w-11 rounded-xl text-[13px]" />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#71717A]">Renewal check</p>
          <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">이번 달에도 계속 이용하셨나요?</h2>
        </div>
      </div>
      <p className="mt-4 text-[14px] leading-6 text-[#71717A]">
        <strong className="font-semibold text-black">{subscription.name}</strong>은 지난 결제일이 지났어요. 계속 이용했다면 다음 달에도 알림을 보내드릴게요.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onCancel}>해지했음</Button>
        <Button onClick={onKeep}>계속 유지</Button>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mx-auto mt-4 block text-[12px] text-[#71717A] underline underline-offset-4"
      >
        나중에 확인하기
      </button>
    </BottomSheet>
  );
}
