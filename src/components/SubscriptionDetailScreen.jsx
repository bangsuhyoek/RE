import { useState, useRef, useEffect, useMemo } from "react";
import { Capacitor } from "@capacitor/core";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check,
  CalendarPlus,
} from "lucide-react";
import {
  BottomSheet,
  Button,
  DDayText,
  IconButton,
  ListRow,
  SectionBand,
  ServiceLogo,
  ToggleSwitch,
  PaymentMethodTriggerField,
} from "./ui";
import { DifficultySurvey } from "./DifficultySurvey";
import { SelectSheet, SelectTrigger } from "./SelectSheet";
import { CancelProofCapture } from "./CancelProofCapture";
import { getCachedCatalog, loadSubscriptionData } from "../data/catalogLoader";
import { getCancelPolicy } from "../data/cancelPolicies";
import { getCancelTimingAdvice } from "../lib/cancelTiming";
import { createCancelSession } from "../lib/cancelDifficulty";
import { hasMoneyRelevantWarning } from "../lib/cancelBrowser";
import { expectedChargeAfterCancel } from "../lib/cancelVerification";
import { formatWonText } from "../lib/dates";
import { toMonthlyAmount, toAnnualAmount } from "../lib/subscriptionMath";
import { resolvePaymentChannel, shouldAutoOpenServicePage } from "../lib/cancelRoutes";
import { getRailCancelPlan } from "../lib/railCancel";
import { addBillingToCalendar } from "../lib/calendarExport";
import { buildSettlementRequest } from "../lib/settlement";
import { shareText } from "../lib/shareText";

import { NotificationTimeScrollPickerModal } from "./scrollPickers";
// C2 입력칸: 회색 면, 선 없음, 포커스 때만 얇은 안쪽 선.
const EDIT_INPUT =
  "mt-1.5 min-h-[48px] w-full rounded-xl bg-gray-100 px-3.5 text-[16px] text-ink outline-none transition-colors focus:bg-white focus:ring-1 focus:ring-inset focus:ring-gray-300";


export function SubscriptionDetailScreen({
  catalog = null,
  subscription,
  subscriptions = [],
  onUpdate,
  onStartCancel,
  onToast,
  onBack,
  onDelete,
  promotion,
  highlightCancel,
  userId = null,
}) {
  const [editing, setEditing] = useState(false);
  const [celebrateSheetOpen, setCelebrateSheetOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [editError, setEditError] = useState("");
  const [cyclePickerOpen, setCyclePickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [draft, setDraft] = useState(() => ({
    plan: subscription?.plan || "기본 플랜",
    amount: subscription?.amount || 0,
    billingCycle: subscription?.billingCycle || "매월",
    category: subscription?.category || "엔터테인먼트",
    dueDay: subscription?.dueDay || 1,
    paymentMethod: subscription?.paymentMethod || "신한카드 ****4521",
    memo: subscription?.memo || "",
    nextBillingDate: subscription?.nextBillingDate || "",
  }));

  useEffect(() => {
    if (!subscription) return;
    setDraft({
      plan: subscription.plan || "기본 플랜",
      amount: subscription.amount || 0,
      billingCycle: subscription.billingCycle || "매월",
      category: subscription.category || "엔터테인먼트",
      dueDay: subscription.dueDay || 1,
      paymentMethod: subscription.paymentMethod || "신한카드 ****4521",
      memo: subscription.memo || "",
      nextBillingDate: subscription.nextBillingDate || "",
    });
    setEditing(false);
    setEditError("");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ���� ��ü �ĺ��ڰ� �ٲ� ���� draft�� �����ϰ� ������� ���� ���� ������ ������
  }, [subscription?.subscriptionId, subscription?.id]);

  // 훅은 아래 조기 return 보다 먼저, 매 렌더에서 같은 순서로 호출되어야 한다.
  const [asyncCatalog, setAsyncCatalog] = useState(() => getCachedCatalog()?.serviceCatalog || []);
  useEffect(() => {
    if (asyncCatalog.length === 0) {
      loadSubscriptionData().then((mod) => {
        if (mod?.serviceCatalog) setAsyncCatalog(mod.serviceCatalog);
      });
    }
  }, [asyncCatalog.length]);
  const activeCatalog = catalog || asyncCatalog;

  const canonicalServiceId = useMemo(() => {
    if (!subscription) return null;
    const targetName = (subscription.name || "").toLowerCase().replace(/\s+/g, "");
    const targetId = (subscription.serviceId || subscription.id || "").toLowerCase();
    const matched = activeCatalog.find((s) => {
      const sId = (s.id || "").toLowerCase();
      const sName = (s.name || "").toLowerCase().replace(/\s+/g, "");
      return sId === targetId || sName === targetName || targetId.includes(sId) || targetName.includes(sName);
    });
    return matched?.id || subscription.serviceId || subscription.id;
  }, [subscription, activeCatalog]);

  const policy = useMemo(() => (subscription ? getCancelPolicy(canonicalServiceId) : null), [subscription, canonicalServiceId]);
  const paymentChannel = useMemo(() => (subscription ? resolvePaymentChannel(subscription) : null), [subscription]);
  const timingAdvice = useMemo(
    () => (subscription ? getCancelTimingAdvice({ subscription: { ...subscription, paymentChannel }, policy }) : null),
    [subscription, paymentChannel, policy]
  );
  const railPlan = useMemo(
    () => (subscription ? getRailCancelPlan({ subscription, channel: paymentChannel }) : null),
    [subscription, paymentChannel]
  );
  const expectedNextWatchDate = useMemo(() => {
    if (!subscription) return null;
    const next = expectedChargeAfterCancel(subscription, new Date());
    return next ? (next.getMonth() + 1) + "월 " + next.getDate() + "일" : null;
  }, [subscription]);

  const detailCancelSessionRef = useRef(null);
  if (subscription && (!detailCancelSessionRef.current || detailCancelSessionRef.current.serviceId !== canonicalServiceId)) {
    detailCancelSessionRef.current = createCancelSession({ serviceId: canonicalServiceId, stepsTotal: 1 });
  }

  if (!subscription) {
    return (
      <main className="px-5 pb-12 pt-12 text-center">
        <h1 className="text-[18px] font-bold text-ink">구독 정보를 찾을 수 없어요</h1>
        <p className="mt-2 text-[14px] text-ink-tertiary">삭제됐거나 잘못된 경로예요.</p>
        <Button className="mt-6 mx-auto" onClick={onBack}>목록으로 돌아가기</Button>
      </main>
    );
  }

  const save = () => {
    setEditError("");
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setEditError("결제 금액을 올바르게 입력해 주세요.");
      return;
    }

    let dueDay;
    let nextBillingDate = null;

    if (draft.billingCycle === "매년") {
      if (!draft.nextBillingDate) {
        setEditError("갱신일을 선택해 주세요.");
        return;
      }
      const parsedDay = Number(String(draft.nextBillingDate).split("-")[2]);
      if (!Number.isFinite(parsedDay) || parsedDay < 1 || parsedDay > 31) {
        setEditError("올바른 갱신일을 입력해 주세요.");
        return;
      }
      dueDay = parsedDay;
      nextBillingDate = draft.nextBillingDate;
    } else {
      dueDay = Math.max(1, Math.min(31, Number(draft.dueDay)));
      if (!Number.isFinite(dueDay) || dueDay < 1 || dueDay > 31) {
        setEditError("결제일을 1~31일 사이로 입력해 주세요.");
        return;
      }
    }
    onUpdate(subscription.subscriptionId, { ...draft, amount, dueDay, nextBillingDate });
    setEditing(false);
  };

  const monogram = subscription.monogram || subscription.name?.slice(0, 1) || "S";
  const monthlyAmount = toMonthlyAmount(subscription);
  const annualAmount = toAnnualAmount(subscription);

  const isMoneyWarning = hasMoneyRelevantWarning(timingAdvice);

  // 알림 시간 설정 파라미터 (스크롤 피커와 연동)
  const alertEnabled = subscription.alertEnabled !== undefined ? Boolean(subscription.alertEnabled) : (subscription.alertD3 !== false || subscription.alertD1 !== false);
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
    <main className="pb-[calc(6rem+env(safe-area-inset-bottom,0px))] select-none">
      {/* 1. 상단 바: 뒤로 + 수정 */}
      <div className="flex h-[52px] items-center justify-between pl-2 pr-3">
        <IconButton onClick={onBack} aria-label="뒤로가기" size="large">
          <ChevronLeft size={24} strokeWidth={2} className="text-ink" />
        </IconButton>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="inline-flex min-h-[44px] items-center gap-1 px-2 text-[15px] font-medium text-ink-tertiary transition-colors hover:text-ink"
        >
          <Pencil size={14} />
          <span>{editing ? "수정 닫기" : "수정"}</span>
        </button>
      </div>

      {/* 2. 서비스 머리 */}
      <div className="flex items-center gap-3.5 px-5 pt-1">
        <ServiceLogo
          serviceId={subscription.serviceId || subscription.id}
          name={subscription.name}
          monogram={monogram}
          image={subscription.image || subscription.attachments?.[0]}
          className="h-12 w-12"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-bold leading-[28px] tracking-[-0.03em] text-ink">
            {subscription.name}
          </h1>
          <p className="truncate text-[14px] text-ink-tertiary">
            {subscription.plan || "Standard 4K"} · {subscription.category || "엔터테인먼트"}
          </p>
        </div>
      </div>

      {!editing ? (
        <>
          {/* 3. 결제 금액 (화면의 유일한 큰 숫자) */}
          <section className="px-5 pb-6 pt-6">
            <span className="block text-[14px] text-ink-tertiary">
              {subscription.billingCycle === "매년" ? "매년" : "매월"} 결제 금액
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-[30px] font-bold leading-[38px] tabular-nums tracking-[-0.03em] text-ink">
                {formatWonText(subscription.amount)}
              </span>
              <span className="text-[15px] text-ink-tertiary">/{subscription.billingCycle === "매년" ? "년" : "월"}</span>
            </div>
          </section>

          <SectionBand />

          {/* 4. 결제 정보: 라벨/값 행 */}
          <dl className="divide-y divide-gray-100 px-5">
            <div className="flex min-h-[52px] items-center justify-between gap-4">
              <dt className="text-[15px] text-ink-tertiary">다음 결제</dt>
              <dd><DDayText subscription={subscription} className="text-[15px]" /></dd>
            </div>
            <div className="flex min-h-[52px] items-center justify-between gap-4">
              <dt className="text-[15px] text-ink-tertiary">결제 수단</dt>
              <dd className="truncate text-[15px] font-medium text-ink">{subscription.paymentMethod || "신한카드 ****4521"}</dd>
            </div>
            <div className="flex min-h-[52px] items-center justify-between gap-4">
              <dt className="text-[15px] text-ink-tertiary">결제 주기</dt>
              <dd className="text-[15px] font-medium text-ink">{subscription.billingCycle === "매년" ? "매년 자동 결제" : "매월 자동 결제"}</dd>
            </div>
            <div className="flex min-h-[52px] items-center justify-between gap-4">
              <dt className="text-[15px] text-ink-tertiary">카테고리</dt>
              <dd className="text-[15px] font-medium text-ink">{subscription.category || "엔터테인먼트"}</dd>
            </div>
          </dl>

          <SectionBand className="mt-2" />

          {/* 5. 설정 행 */}
          <div className="divide-y divide-gray-100">
            <div className="flex min-h-[64px] items-center justify-between gap-4 px-5 py-2">
              <button
                type="button"
                onClick={() => setTimePickerOpen(true)}
                className="min-w-0 flex-1 py-1 text-left"
                aria-label={`사전 결제 알림 시간 변경, 현재 D-${alertDDay} ${alertAmpm} ${Number(alertHour)}시`}
              >
                <span className="block text-[16px] font-medium text-ink">사전 결제 알림</span>
                <span className="mt-0.5 flex items-center gap-0.5 text-[13px] text-ink-tertiary">
                  결제 D-{alertDDay} {alertAmpm} {Number(alertHour)}시
                  <ChevronRight size={14} className="text-ink-subtle" aria-hidden="true" />
                </span>
              </button>
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
            </div>

            <div className="flex min-h-[64px] items-center justify-between gap-4 px-5 py-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-medium text-ink">홈 화면 상단 고정</h2>
                <span className="mt-0.5 block break-keep text-[13px] text-ink-tertiary">홈 목록 맨 위에 보여줘요.</span>
              </div>
              <ToggleSwitch
                checked={Boolean(subscription.isPinned || subscription.pinned)}
                onChange={(checked) => {
                  onUpdate(subscription.subscriptionId, {
                    isPinned: checked,
                    pinned: checked,
                  });
                }}
                label="홈 화면 상단 고정"
              />
            </div>

            {subscription.sharingEnabled && Number(subscription.shareCount) > 1 && (
              <ListRow
                title="정산 요청 보내기"
                subtitle={`${subscription.shareCount}명 · 1인 ${formatWonText(buildSettlementRequest(subscription).perPerson)}`}
                withArrow
                onClick={async () => {
                  const request = buildSettlementRequest(subscription);
                  const result = await shareText({ title: request.title, text: request.message });
                  if (result.method === "clipboard") onToast?.("정산 요청 문구를 복사했어요. 단톡방에 붙여 넣어 보내세요.");
                }}
              />
            )}

            {/* 결제일을 내 캘린더에 넣기 (캘린더 권한 없이 캘린더 앱 일정 화면을 채워 연다) */}
            <ListRow
              leading={<CalendarPlus size={20} strokeWidth={1.8} className="shrink-0 text-ink-muted" aria-hidden="true" />}
              title="내 캘린더에 결제일 추가"
              subtitle={Capacitor.isNativePlatform() ? "반복 일정으로 넣어요" : "일정 파일(.ics)로 받아요"}
              withArrow
              onClick={async () => {
                const result = await addBillingToCalendar(subscription);
                if (!result.ok) onToast?.(result.code === "NO_CALENDAR_APP" ? "캘린더 앱을 찾지 못했어요." : "캘린더를 열지 못했어요.");
                else if (result.method === "ics") onToast?.("일정 파일을 받았어요. 열어서 캘린더에 추가해 주세요.");
              }}
            />
          </div>

          <SectionBand />

          {/* 6. 해지 동작: 주요 버튼 하나 + 보조 버튼 */}
          <div className="space-y-2.5 px-5 pt-5">
            <Button
              variant="primary"
              size="large"
              fullWidth
              onClick={() => {
                // Google Play·App Store·카드 자동납부·2단계 결제 경로 차단 및 금전적 불이익 경고 구독은 해지 안내를 먼저 보여준다.
                const hasRailPlan = Boolean(railPlan);
                const isNative = Capacitor.isNativePlatform();
                const autoOpen = !isNative && shouldAutoOpenServicePage(subscription) && !hasRailPlan && !isMoneyWarning;
                if (autoOpen && subscription.cancelUrl) {
                  window.open(subscription.cancelUrl, "_blank", "noopener,noreferrer");
                }
                onStartCancel(subscription.subscriptionId, promotion, { autoOpen });
              }}
              className={highlightCancel ? "ring-2 ring-ink ring-offset-2 animate-pulse" : ""}
            >
              해지하기
            </Button>
            <Button variant="secondary" size="large" fullWidth onClick={() => setCelebrateSheetOpen(true)}>
              해지 완료로 표시하고 삭제
            </Button>
          </div>
        </>
      ) : (
        /* 수정 모드 폼 */
        <section className="px-5 pb-6 pt-6">
          <h2 className="mb-4 text-[18px] font-bold tracking-[-0.025em] text-ink">구독 정보 수정</h2>
          <div className="space-y-4">
            <label className="block text-[14px] font-medium text-ink-tertiary">
              요금제
              <input
                className={EDIT_INPUT}
                value={draft.plan}
                onChange={(e) => setDraft((v) => ({ ...v, plan: e.target.value }))}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[14px] font-medium text-ink-tertiary">
                결제 금액
                <input
                  className={EDIT_INPUT}
                  type="number"
                  min="0"
                  value={draft.amount}
                  onChange={(e) => setDraft((v) => ({ ...v, amount: e.target.value }))}
                />
              </label>
              {draft.billingCycle === "매년" ? (
                <label className="block text-[14px] font-medium text-ink-tertiary">
                  갱신일
                  <input
                    className={EDIT_INPUT}
                    type="date"
                    value={draft.nextBillingDate || ""}
                    onChange={(e) => setDraft((v) => ({ ...v, nextBillingDate: e.target.value }))}
                  />
                </label>
              ) : (
                <label className="block text-[14px] font-medium text-ink-tertiary">
                  결제일 (1~31일)
                  <input
                    className={EDIT_INPUT}
                    type="number"
                    min="1"
                    max="31"
                    value={draft.dueDay}
                    onChange={(e) => setDraft((v) => ({ ...v, dueDay: e.target.value }))}
                  />
                </label>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="block text-[14px] font-medium text-ink-tertiary">
                결제 주기
                <SelectTrigger
                  label="결제 주기"
                  valueLabel={draft.billingCycle}
                  onClick={() => setCyclePickerOpen(true)}
                  className="mt-1.5"
                />
                {cyclePickerOpen && (
                  <SelectSheet
                    title="결제 주기"
                    options={[
                      { value: "매월", label: "매월" },
                      { value: "매년", label: "매년" },
                    ]}
                    value={draft.billingCycle}
                    onSelect={(next) => setDraft((v) => ({ ...v, billingCycle: next }))}
                    onClose={() => setCyclePickerOpen(false)}
                  />
                )}
              </div>
              <div className="block text-[14px] font-medium text-ink-tertiary">
                카테고리
                <SelectTrigger
                  label="카테고리"
                  valueLabel={draft.category}
                  onClick={() => setCategoryPickerOpen(true)}
                  className="mt-1.5"
                />
                {categoryPickerOpen && (
                  <SelectSheet
                    title="카테고리"
                    options={["엔터테인먼트", "OTT", "음악", "쇼핑", "생산성", "도서", "클라우드", "게임", "기타"].map((cat) => ({ value: cat, label: cat }))}
                    value={draft.category}
                    onSelect={(next) => setDraft((v) => ({ ...v, category: next }))}
                    onClose={() => setCategoryPickerOpen(false)}
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block text-[14px] font-medium text-ink-tertiary mb-1.5">
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
              <p role="alert" className="text-[13px] font-medium text-danger">{editError}</p>
            )}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <Button variant="secondary" size="large" onClick={() => setEditing(false)}>취소</Button>
            <Button size="large" variant="primary" onClick={save}>저장</Button>
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
            <div className="grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-ink mb-3">
              <Check size={24} strokeWidth={2.2} />
            </div>
            <h3 className="text-[20px] font-bold text-ink tracking-[-0.03em]">
              {subscription.name} 해지 완료
            </h3>
            <dl className="mt-4 w-full divide-y divide-gray-100 border-y border-gray-100 text-left">
              <div className="flex min-h-[48px] items-center justify-between">
                <dt className="text-[15px] text-ink-tertiary">1년에 아끼는 돈</dt>
                <dd className="text-[16px] font-semibold tabular-nums text-ink">{formatWonText(annualAmount)}</dd>
              </div>
              <div className="flex min-h-[48px] items-center justify-between">
                <dt className="text-[15px] text-ink-tertiary">매달 아끼는 돈</dt>
                <dd className="text-[16px] font-semibold tabular-nums text-ink">{formatWonText(monthlyAmount)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[14px] text-ink-tertiary leading-relaxed max-w-[300px]">
              {expectedNextWatchDate
                ? `다음 결제 예정일(${expectedNextWatchDate}) 이후 재결제가 없는지 꾸독이 자동으로 지켜볼게요.`
                : "공식 웹사이트에서 해지를 마치셨다면 목록에서 제거하여 지출 현황을 최신화하세요."}
            </p>

            <details className="mt-4 w-full rounded-xl bg-gray-50 px-3 text-left">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-center text-[14px] font-medium text-ink-muted hover:text-ink">
                해지 완료 화면 저장하기
              </summary>
              <div className="border-t border-gray-200 py-3">
                <CancelProofCapture
                  record={{
                    serviceId: canonicalServiceId,
                    recordId: subscription.subscriptionId || subscription.id,
                    subscriptionId: subscription.subscriptionId || subscription.id,
                    serviceName: subscription.name,
                    amount: subscription.amount,
                    cancelledAt: new Date().toISOString(),
                  }}
                />
                {userId && (
                  <DifficultySurvey
                    serviceId={canonicalServiceId}
                    session={detailCancelSessionRef.current}
                    userId={userId}
                  />
                )}
              </div>
            </details>

            <div className="mt-6 w-full space-y-2.5">
              <Button
                variant="primary"
                size="large"
                fullWidth
                onClick={() => {
                  setCelebrateSheetOpen(false);
                  onDelete?.(subscription.subscriptionId || subscription.id);
                }}
              >
                목록에서 삭제 완료
              </Button>
              <Button variant="secondary" size="large" fullWidth onClick={() => setCelebrateSheetOpen(false)}>
                닫기
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}
    </main>
  );
}
