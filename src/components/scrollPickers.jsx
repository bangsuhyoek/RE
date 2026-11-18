import { useState, useRef, useEffect } from "react";
import { BottomSheet, Button } from "./ui";

/**
 * 프리미엄 iOS/쿠퍼티노 스타일 스크롤 휠 드럼롤 컬럼
 */
export function ScrollWheelColumn({ items, value, onChange }) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ��ũ�� �� �巳�� �ʱ� ����Ʈ �� ���� ��ġ ����ȭ ����
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
                  ? "text-[19px] font-semibold text-ink"
                  : "text-[16px] font-normal text-ink-subtle hover:text-ink-tertiary"
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
export function NotificationTimeScrollPickerModal({
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
        <div className="mb-4">
          <h3 className="text-[18px] font-bold tracking-[-0.025em] text-ink">
            알림 받을 시간
          </h3>
          <p className="text-[14px] text-ink-tertiary mt-1">
            결제 며칠 전, 몇 시에 알려드릴지 골라 주세요.
          </p>
        </div>

        {/* 네이티브 휠 드럼롤 (박스 없는 개방형 + 원통형 실린더 그라디언트 페이드) */}
        <div className="relative max-w-xs mx-auto my-2">
          {/* 중앙 통합 플로팅 선택 바 (단일 소프트 필) */}
          <div className="absolute inset-x-2 top-[80px] h-[44px] rounded-xl bg-gray-100 pointer-events-none -z-10" />

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
          <Button variant="primary" size="large" fullWidth onClick={handleConfirm}>
            D-{dday} {ampm} {Number(hour)}시로 설정
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
