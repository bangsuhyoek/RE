import { dateForDueDay, formatKoreanMonth, formatWon, getNextChargeDate } from "./dates.js";

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * 같은 카테고리의 활성 월간 구독 후보를 반환한다.
 * 연간 구독은 한 달 단위로 순환하기에 부적합하므로 제외한다.
 */
export function getRotationCandidates(subscriptions = [], category) {
  if (!Array.isArray(subscriptions)) return [];
  return subscriptions.filter((sub) => {
    if (!sub) return false;
    if (category && sub.category !== category) return false;
    if (sub.status === "cancelled") return false;
    // 연간 구독은 이미 1년 치를 결제했거나 1년 약정이므로 월별 순환 대상에서 제외
    if (sub.billingCycle !== "매월") return false;
    return true;
  });
}

/**
 * 사용자가 선택한 구독들을 바탕으로 월별 순환 계획을 생성한다.
 */
export function buildRotationPlan({ subscriptions = [], order, months = 6, start = new Date() }) {
  if (!Array.isArray(subscriptions) || subscriptions.length < 2) {
    return { ok: false, reason: "NEED_TWO" };
  }

  const subMap = new Map();
  for (const sub of subscriptions) {
    const id = sub.subscriptionId || sub.id;
    subMap.set(id, sub);
  }

  let orderedSubs = [];
  if (Array.isArray(order) && order.length > 0) {
    for (const id of order) {
      if (subMap.has(id)) {
        orderedSubs.push(subMap.get(id));
      }
    }
  }

  // order에 누락된 구독이 있거나 order가 없으면 금액 오름차순으로 정렬
  if (orderedSubs.length < subscriptions.length) {
    const remaining = subscriptions
      .filter((s) => !orderedSubs.includes(s))
      .sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
    orderedSubs = [...orderedSubs, ...remaining];
  }

  const startDate = startOfDay(start);
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();

  const planMonths = [];
  // 다시 가입하면 그날이 새 결제일이 된다. 서비스별로 지금 결제일을 따로 기억한다.
  const dueDays = new Map(orderedSubs.map((sub) => [sub.subscriptionId || sub.id, Number(sub.dueDay) || 1]));

  for (let i = 0; i < months; i++) {
    const currentMonthDate = new Date(startYear, startMonth + i, 1);
    const year = currentMonthDate.getFullYear();
    const monthIndex = currentMonthDate.getMonth();
    const label = formatKoreanMonth(year, monthIndex);

    const activeSub = orderedSubs[i % orderedSubs.length];
    const prevSub = i === 0 ? null : orderedSubs[(i - 1) % orderedSubs.length];

    const cancel = [];
    const resume = [];

    if (i === 0) {
      // 1번째 달: order[0]만 유지하고, 나머지는 각자의 이번 달 결제일 전날(cancelBy)까지 해지
      for (const sub of orderedSubs) {
        const subId = sub.subscriptionId || sub.id;
        const activeId = activeSub.subscriptionId || activeSub.id;
        if (subId !== activeId) {
          // 이번 달 결제일이 이미 지났으면 다음 결제일 전에 해지하면 된다.
          const chargeDate = getNextChargeDate(sub, startDate);
          const cancelBy = new Date(chargeDate);
          cancelBy.setDate(cancelBy.getDate() - 1);
          cancel.push({
            subscriptionId: subId,
            name: sub.name,
            amount: sub.amount,
            cancelBy,
          });
        }
      }
    } else {
      // 2번째 달 이후: 이전 달에 활성이었던 서비스를 이번 달 결제일 하루 전에 해지
      const prevId = prevSub.subscriptionId || prevSub.id;
      const prevChargeDate = dateForDueDay(year, monthIndex, dueDays.get(prevId));
      const cancelBy = new Date(prevChargeDate);
      cancelBy.setDate(cancelBy.getDate() - 1);
      cancel.push({
        subscriptionId: prevSub.subscriptionId || prevSub.id,
        name: prevSub.name,
        amount: prevSub.amount,
        cancelBy,
      });

      // 이번 달 활성 서비스는 이전 서비스의 결제 주기가 끝나는 날(이전 서비스의 결제일)에 다시 가입
      const startOn = new Date(prevChargeDate);
      dueDays.set(activeSub.subscriptionId || activeSub.id, startOn.getDate());
      resume.push({
        subscriptionId: activeSub.subscriptionId || activeSub.id,
        name: activeSub.name,
        amount: activeSub.amount,
        startOn,
      });
    }

    planMonths.push({
      index: i,
      label,
      active: {
        subscriptionId: activeSub.subscriptionId || activeSub.id,
        name: activeSub.name,
        amount: activeSub.amount,
      },
      cancel,
      resume,
    });
  }

  // 절약액 계산
  const currentMonthly = subscriptions.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const plannedMonthly = Math.round(
    subscriptions.reduce((sum, s) => sum + Number(s.amount || 0), 0) / subscriptions.length
  );
  const monthlySaving = Math.round(currentMonthly - plannedMonthly);
  const yearlySaving = monthlySaving * 12;

  return {
    ok: true,
    months: planMonths,
    currentMonthly,
    plannedMonthly,
    monthlySaving,
    yearlySaving,
  };
}

/**
 * 플랜 정보를 바탕으로 알림 목록을 생성한다.
 * cancel은 cancelBy 날짜 오전 9시, resume은 startOn 날짜 오전 9시.
 * 과거 시각은 제외한다.
 */
export function buildRotationReminders(plan, now = new Date()) {
  if (!plan || !plan.ok || !Array.isArray(plan.months)) return [];

  const reminders = [];
  const nowDate = new Date(now);

  for (const monthItem of plan.months) {
    const activeName = monthItem.active?.name;

    // 해지 알림
    if (Array.isArray(monthItem.cancel)) {
      for (const c of monthItem.cancel) {
        const at = new Date(c.cancelBy);
        at.setHours(9, 0, 0, 0);

        if (at > nowDate) {
          const costStr = formatWon(c.amount);
          reminders.push({
            id: `rotation-cancel-${c.subscriptionId}-${at.getTime()}`,
            at,
            type: "rotation_cancel",
            subscriptionId: c.subscriptionId,
            title: `[구독 순환] ${c.name} 해지할 날이에요`,
            body: `이번 달은 ${activeName} 차례예요. 오늘 ${c.name}를 해지하면 다음 결제(${costStr})가 나가지 않아요.`,
          });
        }
      }
    }

    // 가입(재개) 알림
    if (Array.isArray(monthItem.resume)) {
      for (const r of monthItem.resume) {
        const at = new Date(r.startOn);
        at.setHours(9, 0, 0, 0);

        if (at > nowDate) {
          reminders.push({
            id: `rotation-resume-${r.subscriptionId}-${at.getTime()}`,
            at,
            type: "rotation_resume",
            subscriptionId: r.subscriptionId,
            title: `[구독 순환] ${r.name} 다시 가입할 날이에요`,
            body: `이번 달은 ${r.name} 차례예요. 오늘부터 새로운 콘텐츠를 즐겨보세요.`,
          });
        }
      }
    }
  }

  // 알림 시각 순으로 정렬
  reminders.sort((a, b) => a.at.getTime() - b.at.getTime());

  return reminders;
}
