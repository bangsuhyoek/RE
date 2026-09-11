import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  Pencil,
  Sparkles,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  BottomSheet,
  Button,
  DDayBadge,
  ServiceMark,
  ToggleSwitch,
  PaymentMethodTriggerField,
} from "./ui";
import { formatWon } from "../lib/dates";

/**
 * 프리미엄 iOS/쿠퍼티노 스타일 스크롤 휠 드럼롤 컬럼
 */
function ScrollWheelColumn({ items, value, onChange }) {
  const itemHeight = 44;
  const containerRef = useRef(null);

  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    if (index >= 0 && index < items.length) {
      if (items[index].value !== value) {
        onChange(items[index].value);
      }
    }
  };

  const handleClick = (itemVal, index) => {
    onChange(itemVal);
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: index * itemHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const index = items.findIndex((it) => it.value === value);
    if (index !== -1 && containerRef.current) {
      containerRef.current.scrollTop = index * itemHeight;
    }
  }, []);

  return (
    <div className="relative flex-1 h-[204px]">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[204px] overflow-y-auto snap-y snap-mandatory scrollbar-none py-[80px] text-center"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((it, idx) => {
          const isSelected = it.value === value;
          return (
            <div
              key={it.value}
              onClick={() => handleClick(it.value, idx)}
              className={`h-[44px] flex items-center justify-center snap-center cursor-pointer transition-all duration-150 select-none ${
                isSelected
                  ? "text-[21px] font-black text-black scale-105"
                  : "text-[16px] font-medium text-gray-300 hover:text-gray-500"
              }`}
            >
              {it.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 사전 알림 시점 및 시간 스크롤 픽커 모달
 */
function NotificationTimeScrollPickerModal({
  initialDDay = 3,
  initialAmpm = "오전",
  initialHour = "09",
  onSave,
  onClose,
}) {
  const [dday, setDday] = useState(initialDDay);
  const [ampm, setAmpm] = useState(initialAmpm);
  const [hour, setHour] = useState(initialHour);

  const ddayItems = [
    { value: 1, label: "D-1" },
    { value: 2, label: "D-2" },
    { value: 3, label: "D-3" },
    { value: 4, label: "D-4" },
    { value: 5, label: "D-5" },
    { value: 6, label: "D-6" },
    { value: 7, label: "D-7" },
  ];

  const ampmItems = [
    { value: "오전", label: "오전" },
    { value: "오후", label: "오후" },
  ];

  const hourItems = Array.from({ length: 12 }, (_, i) => {
    const val = String(i + 1).padStart(2, "0");
    return { value: val, label: `${i + 1}시` };
  });

  const handleConfirm = () => {
    onSave({
      dday,
      ampm,
      hour,
    });
    onClose();
  };

  return (
    <BottomSheet onClose={onClose} label="사전 알림 시간 설정">
      <div className="px-3 pt-2 pb-5 select-none">
        <div className="text-center mb-4">
          <h3 className="text-[18px] font-extrabold tracking-tight text-black">
            알림 받을 시간
          </h3>
          <p className="text-[12px] text-gray-500 mt-1">
            결제일 전 원하는 알림 시점과 시간을 휠로 맞추세요
          </p>
        </div>

        {/* 네이티브 휠 드럼롤 (박스 없는 개방형 + 원통형 실린더 그라디언트 페이드) */}
        <div className="relative max-w-xs mx-auto my-2">
          {/* 중앙 통합 플로팅 선택 바 (단일 소프트 필) */}
          <div className="absolute inset-x-2 top-[80px] h-[44px] rounded-xl bg-gray-100/90 pointer-events-none -z-10" />

          <div
            className="relative flex items-center z-0"
            style={{
              maskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
            }}
          >
            <ScrollWheelColumn
              items={ddayItems}
              value={dday}
              onChange={setDday}
            />
            <ScrollWheelColumn
              items={ampmItems}
              value={ampm}
              onChange={setAmpm}
            />
            <ScrollWheelColumn
              items={hourItems}
              value={hour}
              onChange={setHour}
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full rounded-2xl bg-[#111827] text-white font-bold py-4 text-[16px] shadow-sm hover:bg-black active:scale-[0.98] transition-all cursor-pointer text-center"
          >
            D-{dday} {ampm} {Number(hour)}시로 설정
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

export function SubscriptionDetailScreen({
  subscription,
  subscriptions = [],
  onUpdate,
  onStartCancel,
  onBack,
  onDelete,
  promotion,
  highlightCancel,
}) {
  const [editing, setEditing] = useState(false);
  const [celebrateSheetOpen, setCelebrateSheetOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [editError, setEditError] = useState("");
  const [draft, setDraft] = useState(() => ({
    plan: subscription?.plan || "기본 플랜",
    amount: subscription?.amount || 0,
    billingCycle: subscription?.billingCycle || "매월",
    category: subscription?.category || "엔터테인먼트",
    dueDay: subscription?.dueDay || 1,
    paymentMethod: subscription?.paymentMethod || "신한카드 ****4521",
    memo: subscription?.memo || "",
  }));

  if (!subscription) {
    return (
      <main className="px-5 pb-12 pt-12 text-center">
        <h1 className="text-[18px] font-bold text-black">구독 정보를 찾을 수 없습니다.</h1>
        <p className="mt-2 text-[13px] text-gray-500">삭제되었거나 잘못된 경로입니다.</p>
        <Button className="mt-6 mx-auto" onClick={onBack}>목록으로 돌아가기</Button>
      </main>
    );
  }

  const save = () => {
    setEditError("");
    const amount = Number(draft.amount);
    const dueDay = Math.max(1, Math.min(31, Number(draft.dueDay)));
    if (!Number.isFinite(amount) || amount <= 0) {
      setEditError("결제 금액을 올바르게 입력해 주세요.");
      return;
    }
    if (!Number.isFinite(dueDay) || dueDay < 1 || dueDay > 31) {
      setEditError("결제일을 1~31일 사이로 입력해 주세요.");
      return;
    }
    onUpdate(subscription.subscriptionId, { ...draft, amount, dueDay });
    setEditing(false);
  };

  const monogram = subscription.monogram || subscription.name?.slice(0, 1) || "S";
  const monthlyAmount = subscription.billingCycle === "매년" ? Math.round(subscription.amount / 12) : subscription.amount;
  const annualAmount = subscription.billingCycle === "매년" ? subscription.amount : subscription.amount * 12;

  // 알림 시간 설정 파라미터 (스크롤 피커와 연동)
  const alertEnabled = subscription.alertEnabled !== undefined ? Boolean(subscription.alertEnabled) : Boolean(subscription.alertD3 || subscription.alertD1 || true);
  const alertDDay = subscription.alertDDay !== undefined ? subscription.alertDDay : (subscription.alertD1 ? 1 : 3);
  const alertAmpm = subscription.alertAmpm || "오전";
  const alertHour = subscription.alertHour || "09";

  const handleSaveAlertTime = ({ dday, ampm, hour }) => {
    onUpdate(subscription.subscriptionId, {
      alertEnabled: true,
      alertDDay: dday,
      alertAmpm: ampm,
      alertHour: hour,
      alertD3: dday === 3,
      alertD1: dday === 1,
    });
  };

  return (
    <main className="px-5 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-3 select-none">
      {/* 1. 상단 뒤로가기 버튼 */}
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-[15px] font-medium text-gray-600 hover:text-black py-2 cursor-pointer transition-colors"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
          <span>뒤로</span>
        </button>

        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="text-[13px] font-semibold text-gray-400 hover:text-black flex items-center gap-1 py-2 transition-colors cursor-pointer"
        >
          <Pencil size={13} />
          <span>{editing ? "수정 닫기" : "수정"}</span>
        </button>
      </div>

      {/* 2. 서비스 헤더 (공식 브랜드 로고 + 서비스명 + D-Day 뱃지 + 플랜/카테고리) */}
      <div className="flex items-center gap-4 mt-2 mb-5">
        <ServiceMark
          serviceId={subscription.id}
          name={subscription.name}
          monogram={monogram}
          image={subscription.image || subscription.attachments?.[0]}
          category={subscription.category}
          className="h-14 w-14 rounded-full"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-bold text-black tracking-tight truncate leading-tight">
              {subscription.name}
            </h1>
            <DDayBadge subscription={subscription} />
          </div>
          <p className="text-[13px] text-gray-400 font-normal mt-1 truncate">
            {subscription.plan || "Standard 4K"} · {subscription.category || "엔터테인먼트"}
          </p>
        </div>
      </div>

      <div className="h-px bg-gray-100/80 mb-5" />

      {!editing ? (
        <>
          {/* 3. 결제 정보 (박스 컨테이너 없이 열린 에디토리얼 레이아웃) */}
          <section className="py-2">
            <span className="text-[12px] font-medium text-gray-400 block mb-1">
              결제 금액
            </span>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[34px] font-black tracking-tight text-black leading-none">
                  {formatWon(subscription.amount)}
                </span>
                <span className="text-[13px] text-gray-400 font-medium">
                  /{subscription.billingCycle === "매년" ? "년" : "월"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-gray-400">다음 결제</span>
                <DDayBadge subscription={subscription} />
              </div>
            </div>

            <div className="h-px bg-gray-100/80 my-5" />

            <div className="space-y-3.5 text-[14px]">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">결제 수단</span>
                <span className="font-semibold text-black">
                  {subscription.paymentMethod || "신한카드 ****4521"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">결제 주기</span>
                <span className="font-semibold text-black">
                  {subscription.billingCycle === "매년" ? "매년 자동 결제" : "매월 자동 결제"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">카테고리</span>
                <span className="font-semibold text-black">
                  {subscription.category || "엔터테인먼트"}
                </span>
              </div>
            </div>
          </section>

          <div className="h-px bg-gray-100/80 my-5" />

          {/* 4. 사전 알림 설정 (스크롤 휠 시간 픽커 연동) */}
          <section className="flex items-center justify-between py-2">
            <div
              className="cursor-pointer group flex-1 pr-4"
              onClick={() => setTimePickerOpen(true)}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold text-black group-hover:text-gray-700 transition-colors">
                  사전 결제 알림
                </span>
                <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                  D-{alertDDay} {alertAmpm} {Number(alertHour)}시
                </span>
              </div>
              <span className="text-[12px] text-gray-400 mt-0.5 flex items-center gap-1">
                <span>결제 D-{alertDDay} {alertAmpm} {Number(alertHour)}시에 푸시 발송</span>
                <span className="text-[11px] text-gray-600 font-semibold underline underline-offset-2">(시간 변경)</span>
              </span>
            </div>
            <ToggleSwitch
              checked={Boolean(alertEnabled)}
              onChange={(checked) => {
                onUpdate(subscription.subscriptionId, {
                  alertEnabled: checked,
                  alertD3: checked && alertDDay === 3,
                  alertD1: checked && alertDDay === 1,
                });
              }}
              label="사전 결제 알림 활성화"
            />
          </section>

          <div className="h-px bg-gray-100/80 my-8" />

          {/* 5. 하단 2-트랙 해지 CTA 버튼 */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => onStartCancel(subscription.subscriptionId, promotion)}
              className={`w-full rounded-2xl bg-[#111827] text-white font-bold py-4 text-[16px] text-center active:scale-[0.98] transition-all shadow-sm cursor-pointer hover:bg-black ${
                highlightCancel ? "ring-2 ring-blue-500 ring-offset-2 animate-pulse" : ""
              }`}
            >
              웹사이트에서 해지하기
            </button>
            <button
              type="button"
              onClick={() => setCelebrateSheetOpen(true)}
              className="w-full rounded-2xl bg-white border border-[#111827] text-[#111827] font-bold py-4 text-[16px] text-center active:scale-[0.98] transition-all shadow-xs cursor-pointer hover:bg-gray-50"
            >
              해지 완료로 표시 & 삭제
            </button>
          </div>
        </>
      ) : (
        /* 수정 모드 폼 */
        <section className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5 shadow-sm mb-6">
          <h2 className="text-[15px] font-bold text-black mb-4">구독 정보 수정</h2>
          <div className="space-y-3.5">
            <label className="block text-[12px] font-semibold text-gray-500">
              요금제
              <input
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[14px] text-black outline-none focus:border-black"
                value={draft.plan}
                onChange={(e) => setDraft((v) => ({ ...v, plan: e.target.value }))}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[12px] font-semibold text-gray-500">
                결제 금액
                <input
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[14px] text-black outline-none focus:border-black"
                  type="number"
                  min="0"
                  value={draft.amount}
                  onChange={(e) => setDraft((v) => ({ ...v, amount: e.target.value }))}
                />
              </label>
              <label className="block text-[12px] font-semibold text-gray-500">
                결제일 (1~31일)
                <input
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[14px] text-black outline-none focus:border-black"
                  type="number"
                  min="1"
                  max="31"
                  value={draft.dueDay}
                  onChange={(e) => setDraft((v) => ({ ...v, dueDay: e.target.value }))}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[12px] font-semibold text-gray-500">
                결제 주기
                <select
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[14px] text-black outline-none focus:border-black"
                  value={draft.billingCycle}
                  onChange={(e) => setDraft((v) => ({ ...v, billingCycle: e.target.value }))}
                >
                  <option value="매월">매월</option>
                  <option value="매년">매년</option>
                </select>
              </label>
              <label className="block text-[12px] font-semibold text-gray-500">
                카테고리
                <select
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[14px] text-black outline-none focus:border-black"
                  value={draft.category}
                  onChange={(e) => setDraft((v) => ({ ...v, category: e.target.value }))}
                >
                  {["엔터테인먼트", "OTT", "음악", "쇼핑", "생산성", "도서", "클라우드", "게임", "기타"].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">
                결제 수단
              </label>
              <PaymentMethodTriggerField
                value={draft.paymentMethod}
                onChange={(val) => setDraft((v) => ({ ...v, paymentMethod: val }))}
                error={!draft.paymentMethod?.trim()}
                subscriptions={subscriptions}
              />
            </div>
            {editError && (
              <p className="text-[12px] font-semibold text-red-500">{editError}</p>
            )}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <Button variant="secondary" size="default" onClick={() => setEditing(false)}>취소</Button>
            <Button size="default" onClick={save}>저장</Button>
          </div>
        </section>
      )}

      {/* 6. 알림 시간 스크롤 휠 모달 */}
      {timePickerOpen && (
        <NotificationTimeScrollPickerModal
          initialDDay={alertDDay}
          initialAmpm={alertAmpm}
          initialHour={alertHour}
          onSave={handleSaveAlertTime}
          onClose={() => setTimePickerOpen(false)}
        />
      )}

      {/* 7. 피크엔드 법칙: 해지 완료 축하 및 삭제 확인 모달 */}
      {celebrateSheetOpen && (
        <BottomSheet onClose={() => setCelebrateSheetOpen(false)} label="해지 완료 확인">
          <div className="flex flex-col items-center text-center px-2 pb-5 pt-2">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[#111827] text-white mb-4 shadow-md">
              <Sparkles size={28} />
            </div>
            <h3 className="text-[20px] font-extrabold text-black tracking-tight">
              {subscription.name} 해지 완료
            </h3>
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-center w-full">
              <span className="text-[12px] font-semibold text-emerald-800 block">
                절약된 고정 지출
              </span>
              <strong className="mt-1 block text-[24px] font-black text-emerald-950 tracking-tight">
                연간 {formatWon(annualAmount)}
              </strong>
              <span className="mt-0.5 block text-[12px] text-emerald-700">
                (이번 달 {formatWon(monthlyAmount)} 절약)
              </span>
            </div>
            <p className="mt-3 text-[13px] text-gray-500 leading-relaxed max-w-[280px]">
              공식 웹사이트에서 해지를 마치셨다면 목록에서 제거하여 지출 현황을 최신화하세요.
            </p>
            <div className="mt-6 w-full space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setCelebrateSheetOpen(false);
                  onDelete?.(subscription.subscriptionId || subscription.id);
                }}
                className="w-full rounded-2xl bg-[#111827] text-white font-bold py-3.5 text-[15px] text-center active:scale-[0.98] transition-all shadow-sm cursor-pointer hover:bg-black"
              >
                목록에서 삭제 완료
              </button>
              <button
                type="button"
                onClick={() => setCelebrateSheetOpen(false)}
                className="w-full rounded-2xl bg-gray-100 text-gray-700 font-semibold py-3 text-[14px] text-center active:scale-[0.98] transition-all cursor-pointer hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </main>
  );
}
