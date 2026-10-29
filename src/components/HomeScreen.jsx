import { useMemo, useState } from "react";
import { BellOff, ChevronRight, ListChecks, MessageCircle, TrendingDown } from "lucide-react";
import {
  Button,
  DDayText,
  ListRow,
  MainHeader,
  SectionBand,
  SectionHeader,
  ServiceLogo,
  getSubscriptionDisplayAmount,
} from "./ui";
import { daysUntilCharge, getNextChargeDate } from "../lib/dates";
import { calculateMonthlyTotal } from "../lib/subscriptionAgent";
import { calculateMonthlyProgress } from "../lib/monthlyProgress";

const UPCOMING_LIMIT = 5;
// 해지 확인이 아직 끝나지 않은 항목. 홈 첫 줄은 이 건수를 "해지 확인 중 N건"으로 보여 준다.
const CANCEL_IN_PROGRESS = new Set(["cancel_watching", "cancel_ask"]);

function formatWonText(amount) {
  return Number(amount || 0).toLocaleString("ko-KR") + "원";
}

function formatMonthDay(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return date.getMonth() + 1 + "월 " + date.getDate() + "일";
}

function subscriptionKey(subscription) {
  return subscription.subscriptionId || subscription.id;
}

// 챙길 일 항목에서 로고와 이름을 찾는다. 해지한 구독은 목록에 없으므로 기록(record)의 정보도 쓴다.
function careItemService(item, subscriptions) {
  const record = item.record || null;
  const subId = item.subscriptionId || record?.subscriptionId;
  const matched = subId ? subscriptions.find((sub) => subscriptionKey(sub) === subId) : null;
  return {
    serviceId: matched?.serviceId || matched?.id || record?.serviceId || record?.id || null,
    name: item.serviceName || record?.name || matched?.name || "",
    image: matched?.image || null,
  };
}

function ChevronIcon({ open = false }) {
  return (
    <ChevronRight
      size={18}
      strokeWidth={1.8}
      className={"shrink-0 text-ink-subtle transition-transform " + (open ? "rotate-90" : "")}
      aria-hidden="true"
    />
  );
}

// 로고 두 개를 왼쪽 위·오른쪽 아래로 겹쳐 40px 칸 안에 둔다. 흰 테두리로 겹친 부분을 나눈다.
function LogoStack({ services }) {
  const [first, second] = services;
  if (!second) {
    return <ServiceLogo serviceId={first.serviceId} name={first.name} image={first.image} />;
  }
  return (
    <span className="relative block h-10 w-10 shrink-0" aria-hidden="true">
      <span className="absolute left-0 top-0 block rounded-[7px] ring-2 ring-white">
        <ServiceLogo serviceId={first.serviceId} name={first.name} image={first.image} size={28} />
      </span>
      <span className="absolute bottom-0 right-0 block rounded-[7px] ring-2 ring-white">
        <ServiceLogo serviceId={second.serviceId} name={second.name} image={second.image} size={28} />
      </span>
    </span>
  );
}

function IconTile({ children }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-gray-100 text-ink-tertiary" aria-hidden="true">
      {children}
    </span>
  );
}

// 홈 첫 묶음의 짧은 행(60px). 다가오는 결제 행(68px)보다 조금 낮다.
function CompactRow({ leading, title, subtitle = null, trailing = null, onClick, open, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[60px] w-full items-center gap-3.5 px-5 py-2.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
      {...props}
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-medium leading-[22px] tracking-tight text-ink">{title}</span>
        {subtitle && (
          <span className="mt-0.5 block truncate text-[13px] leading-[18px] tracking-tight text-ink-tertiary">{subtitle}</span>
        )}
      </span>
      {trailing && (
        <span className="shrink-0 text-[16px] font-semibold leading-[22px] tabular-nums tracking-tight text-ink">{trailing}</span>
      )}
      <ChevronIcon open={open} />
    </button>
  );
}

// 펼친 "챙길 일" 안의 꾸독 제안·알림 꺼짐 안내. 결정 버튼은 오른쪽 아래에 둔다.
function TaskNotice({ icon, title, body, actions }) {
  return (
    <div className="flex gap-3.5 px-5 py-3">
      <IconTile>{icon}</IconTile>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium leading-[22px] tracking-tight text-ink">{title}</p>
        {body && <p className="mt-0.5 text-[13px] leading-[18px] tracking-tight text-ink-tertiary">{body}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              size="small"
              variant={action.primary ? "primary" : "secondary"}
              onClick={action.onClick}
              className="min-h-11"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomeFooter({ onOpenTerms, onOpenAccount, onLogout, profile }) {
  const links = [
    onOpenAccount && { label: "내 계정 (" + (profile?.nickname || "사용자") + ")", onClick: onOpenAccount },
    onOpenTerms && { label: "서비스 이용약관", onClick: () => onOpenTerms("terms") },
    onOpenTerms && { label: "개인정보 처리방침", onClick: () => onOpenTerms("privacy") },
    onLogout && { label: "로그아웃", onClick: onLogout },
  ].filter(Boolean);
  if (links.length === 0) return null;
  return (
    <footer className="mt-8 flex flex-wrap items-center justify-center gap-x-1 px-5 text-[12px] text-ink-tertiary">
      {links.map((link) => (
        <button key={link.label} type="button" onClick={link.onClick} className="min-h-11 px-1.5 hover:text-ink">
          {link.label}
        </button>
      ))}
    </footer>
  );
}

export function HomeScreen({
  subscriptions = [],
  savedAmount = 0,
  profile,
  unreadCount = 0,
  notificationDenied,
  onOpenSubscription,
  onShowAll,
  onShowCancelled,
  onAdd,
  onToggleNotificationPermission,
  onOpenNotificationCenter,
  onOpenTerms,
  onLogout,
  onOpenAccount,
  onOpenAgent,
  careSlot = null,
  careItems = [],
  careHasRotation = false,
  onOpenRotation,
  agentInsight = null,
  onOpenAgentInsight,
  onDismissInsight,
}) {
  const [tasksOpen, setTasksOpen] = useState(false);

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((sub) => sub && sub.status !== "cancelled"),
    [subscriptions]
  );
  const monthlyTotal = useMemo(() => calculateMonthlyTotal(subscriptions), [subscriptions]);
  const monthlyProgress = useMemo(() => calculateMonthlyProgress(subscriptions), [subscriptions]);

  const upcoming = useMemo(() => {
    return activeSubscriptions
      .map((sub) => ({ sub, date: getNextChargeDate(sub), days: daysUntilCharge(sub) }))
      .sort((a, b) => a.days - b.days)
      .slice(0, UPCOMING_LIMIT);
  }, [activeSubscriptions]);

  const completed = useMemo(() => {
    return monthlyProgress.items
      .filter((item) => item.isCompleted)
      .sort((a, b) => a.billingDay - b.billingDay)
      .map((item) => ({ ...item, sub: activeSubscriptions.find((sub) => subscriptionKey(sub) === item.subscriptionId) }));
  }, [monthlyProgress, activeSubscriptions]);

  const cancelItems = careItems.filter((item) => CANCEL_IN_PROGRESS.has(item.type));
  const otherCareCount = careItems.length - cancelItems.length;
  const noticeCount = (agentInsight ? 1 : 0) + (notificationDenied ? 1 : 0);
  const taskCount = careItems.length + noticeCount;
  const onlyCancelChecks = cancelItems.length > 0 && otherCareCount === 0 && noticeCount === 0;

  // 해지 확인 중인 서비스. 다가오는 결제 행에 "해지 확인 중"을 붙이는 데 쓴다.
  const cancellingKeys = useMemo(() => {
    const keys = new Set();
    for (const item of careItems) {
      if (!CANCEL_IN_PROGRESS.has(item.type)) continue;
      const record = item.record || {};
      [record.subscriptionId, record.serviceId, record.id].filter(Boolean).forEach((key) => keys.add(key));
    }
    return keys;
  }, [careItems]);
  const isCancelling = (sub) =>
    [sub.subscriptionId, sub.serviceId, sub.id].some((key) => key && cancellingKeys.has(key));

  const taskServices = [];
  const seenNames = new Set();
  // 접힌 항목 전체(챙길 일 + 꾸독 제안)의 서비스를 모은다. 알림 꺼짐 안내는 서비스가 없어서 빠진다.
  const foldedItems = onlyCancelChecks ? cancelItems : [...careItems, ...(agentInsight ? [agentInsight] : [])];
  for (const item of foldedItems) {
    const service = careItemService(item, subscriptions);
    if (!service.name || seenNames.has(service.name)) continue;
    seenNames.add(service.name);
    taskServices.push(service);
  }
  const SUMMARY_NAME_LIMIT = 2;
  const summaryNames = taskServices.slice(0, SUMMARY_NAME_LIMIT).map((service) => service.name).join(", ");
  const hiddenNameCount = taskServices.length - SUMMARY_NAME_LIMIT;
  const taskSubtitle =
    taskServices.length > 0
      ? summaryNames + (hiddenNameCount > 0 ? " 외 " + hiddenNameCount + "개" : "")
      : agentInsight?.title || (notificationDenied ? "결제 전 알림이 꺼져 있어요" : null);

  const nextPayment = upcoming.find((entry) => entry.date)?.date || null;
  const today = new Date();
  const header = (
    <MainHeader
      onOpenAgent={onOpenAgent}
      onOpenNotifications={onOpenNotificationCenter}
      unreadCount={unreadCount}
    />
  );

  const taskRows = (
    <>
      {taskCount > 0 && (
        <CompactRow
          leading={
            taskServices.length > 0 ? (
              <LogoStack services={taskServices} />
            ) : (
              <IconTile>
                <ListChecks size={20} strokeWidth={1.7} />
              </IconTile>
            )
          }
          title={onlyCancelChecks ? "해지 확인 중 " + cancelItems.length + "건" : "챙길 일 " + taskCount + "건"}
          subtitle={taskSubtitle}
          onClick={() => setTasksOpen((open) => !open)}
          open={tasksOpen}
          aria-expanded={tasksOpen}
          aria-controls="home-tasks"
        />
      )}
      {taskCount > 0 && tasksOpen && (
        <div id="home-tasks" className="pb-2">
          {agentInsight && (
            <TaskNotice
              icon={<MessageCircle size={20} strokeWidth={1.7} />}
              title={agentInsight.title}
              body={agentInsight.message}
              actions={[
                onOpenAgentInsight && { label: "대화하기", primary: true, onClick: () => onOpenAgentInsight(agentInsight) },
                onDismissInsight && { label: "닫기", onClick: () => onDismissInsight(agentInsight.id) },
              ].filter(Boolean)}
            />
          )}
          {notificationDenied && (
            <TaskNotice
              icon={<BellOff size={20} strokeWidth={1.7} />}
              title="결제 전 알림이 꺼져 있어요"
              body="결제 3일 전과 하루 전에 알려 드려요."
              actions={[{ label: "알림 켜기", primary: true, onClick: onToggleNotificationPermission }]}
            />
          )}
          {careSlot}
        </div>
      )}
      {taskCount === 0 && careHasRotation && onOpenRotation && (
        <CompactRow
          leading={
            <IconTile>
              <ListChecks size={20} strokeWidth={1.7} />
            </IconTile>
          }
          title="구독 순환 계획"
          onClick={onOpenRotation}
        />
      )}
      {Number(savedAmount) > 0 && (
        <CompactRow
          leading={
            <IconTile>
              <TrendingDown size={20} strokeWidth={1.7} />
            </IconTile>
          }
          title="줄인 구독료"
          trailing={"월 " + formatWonText(savedAmount)}
          onClick={onShowCancelled || onShowAll}
        />
      )}
    </>
  );

  if (activeSubscriptions.length === 0) {
    // 마지막 구독을 해지해도 해지 확인과 줄인 구독료는 계속 보여야 한다.
    return (
      <>
        {header}
        <main className="pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
          <div className="pt-2">{taskRows}</div>
          <section className="px-5 pb-6 pt-16 text-center">
            <h1 className="text-[20px] font-bold leading-[28px] tracking-[-0.025em] text-ink">등록한 구독이 없어요</h1>
            <p className="mt-2 text-[15px] leading-[22px] tracking-tight text-ink-tertiary">
              구독을 추가하면 결제일 전에 알려 드려요.
            </p>
            <Button size="large" fullWidth onClick={onAdd} className="mt-8">
              구독 추가하기
            </Button>
          </section>
          <HomeFooter onOpenTerms={onOpenTerms} onOpenAccount={onOpenAccount} onLogout={onLogout} profile={profile} />
        </main>
      </>
    );
  }

  return (
    <>
      {header}
      <main className="pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        <section className="px-5 pb-4 pt-5" aria-label="이번 달 구독료">
          <p className="text-[15px] font-medium leading-[22px] tracking-tight text-ink-muted">
            {today.getMonth() + 1}월 구독료
          </p>
          <p className="mt-1 text-[30px] font-bold leading-[40px] tracking-[-0.03em] text-ink tabular-nums">
            {formatWonText(monthlyTotal)}
          </p>
          <p className="mt-1 text-[14px] leading-[20px] tracking-tight text-ink-tertiary">
            구독 {activeSubscriptions.length}개{nextPayment ? " · 다음 결제 " + formatMonthDay(nextPayment) : ""}
          </p>
        </section>

        {taskRows}

        <SectionBand className="mt-2" />
        <SectionHeader title="다가오는 결제" actionLabel="전체" onAction={onShowAll} />
        <div>
          {upcoming.map(({ sub, date }) => (
            <ListRow
              key={subscriptionKey(sub)}
              onClick={() => onOpenSubscription(subscriptionKey(sub))}
              leading={<ServiceLogo serviceId={sub.serviceId || sub.id} name={sub.name} monogram={sub.monogram} image={sub.image} />}
              title={sub.name}
              subtitle={
                <>
                  {formatMonthDay(date)}
                  {isCancelling(sub) && (
                    <>
                      {" · "}
                      <span className="font-medium text-ink-muted">해지 확인 중</span>
                    </>
                  )}
                </>
              }
              trailingTitle={formatWonText(getSubscriptionDisplayAmount(sub))}
              trailingSubtitle={<DDayText subscription={sub} />}
            />
          ))}
        </div>

        {completed.length > 0 && (
          <>
            <SectionBand className="mt-3" />
            <SectionHeader
              title="이번 달 결제 완료"
              trailing={
                <span className="text-[14px] tabular-nums tracking-tight text-ink-tertiary">
                  {formatWonText(monthlyProgress.completedAmount)}
                </span>
              }
            />
            <div>
              {completed.map((item) => (
                <ListRow
                  key={item.subscriptionId}
                  onClick={() => onOpenSubscription(item.subscriptionId)}
                  leading={
                    <ServiceLogo
                      serviceId={item.sub?.serviceId || item.sub?.id}
                      name={item.name}
                      monogram={item.sub?.monogram}
                      image={item.sub?.image}
                    />
                  }
                  title={item.name}
                  subtitle={formatMonthDay(item.chargeDate) + " 결제"}
                  trailingTitle={formatWonText(item.amount)}
                />
              ))}
            </div>
          </>
        )}

        <HomeFooter onOpenTerms={onOpenTerms} onOpenAccount={onOpenAccount} onLogout={onLogout} profile={profile} />
      </main>
    </>
  );
}
