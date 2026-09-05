const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseLocalDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return startOfDay(value);
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, month, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month || parsed.getDate() !== day) return null;
  return parsed;
};

export const formatWon = (amount) => {
  const value = Number(amount || 0);
  return `₩${Math.round(Number.isFinite(value) ? value : 0).toLocaleString("ko-KR")}`;
};

export const getMonthKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export const getLastDate = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

export const dateForDueDay = (year, monthIndex, dueDay) => {
  const numericDay = Number(dueDay);
  if (!Number.isFinite(numericDay)) return null;
  const day = Math.max(1, Math.min(Math.trunc(numericDay), getLastDate(year, monthIndex)));
  return new Date(year, monthIndex, day);
};

const getAnchorDate = (subscription) => parseLocalDate(subscription?.nextBillingDate);
const isAnnual = (subscription) => subscription?.billingCycle === "매년";

const monthDistance = (from, to) =>
  (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());

const dateFromAnchorMonth = (anchor, year, monthIndex) =>
  new Date(year, monthIndex, Math.min(anchor.getDate(), getLastDate(year, monthIndex)));

export const getChargeDateInMonth = (subscription, year, monthIndex) => {
  const anchor = getAnchorDate(subscription);
  if (anchor) {
    const targetMonth = new Date(year, monthIndex, 1);
    const anchorMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    if (targetMonth < anchorMonth) return null;

    if (isAnnual(subscription)) {
      if (monthIndex !== anchor.getMonth()) return null;
      return dateFromAnchorMonth(anchor, year, monthIndex);
    }

    return dateFromAnchorMonth(anchor, year, monthIndex);
  }

  // Legacy/OCR records may only have a dueDay. Without an anchor month, preserve
  // the previous monthly recurrence behavior rather than inventing a yearly month.
  return dateForDueDay(year, monthIndex, subscription?.dueDay);
};

export const getNextChargeDate = (subscription, reference = new Date()) => {
  const today = startOfDay(reference);
  const anchor = getAnchorDate(subscription);

  if (anchor) {
    if (anchor >= today) return anchor;

    if (isAnnual(subscription)) {
      let candidate = dateFromAnchorMonth(anchor, today.getFullYear(), anchor.getMonth());
      if (candidate < today) candidate = dateFromAnchorMonth(anchor, today.getFullYear() + 1, anchor.getMonth());
      return candidate;
    }

    const distance = Math.max(0, monthDistance(anchor, today));
    let year = anchor.getFullYear() + Math.floor((anchor.getMonth() + distance) / 12);
    let month = (anchor.getMonth() + distance) % 12;
    let candidate = dateFromAnchorMonth(anchor, year, month);
    if (candidate < today) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
      candidate = dateFromAnchorMonth(anchor, year, month);
    }
    return candidate;
  }

  const thisMonth = dateForDueDay(today.getFullYear(), today.getMonth(), subscription?.dueDay);
  if (!thisMonth) return today;
  if (thisMonth >= today) return thisMonth;
  return dateForDueDay(today.getFullYear(), today.getMonth() + 1, subscription?.dueDay) || today;
};

export const daysUntilCharge = (subscription, reference = new Date()) => {
  const today = startOfDay(reference);
  const next = getNextChargeDate(subscription, reference);
  return Math.max(0, Math.round((next - today) / 86_400_000));
};

export const isPastDueThisCycle = (subscription, reference = new Date()) => {
  const today = startOfDay(reference);
  const chargeThisMonth = getChargeDateInMonth(subscription, today.getFullYear(), today.getMonth());
  return Boolean(chargeThisMonth && chargeThisMonth < today);
};

export const formatBillingDate = (subscription, reference = new Date()) => {
  const date = getNextChargeDate(subscription, reference);
  const prefix = date.getFullYear() === reference.getFullYear() ? "" : `${date.getFullYear()}년 `;
  return `${prefix}${date.getMonth() + 1}월 ${date.getDate()}일`;
};

export const formatKoreanMonth = (yearOrDate, monthIndex) => {
  if (yearOrDate instanceof Date) {
    return `${yearOrDate.getFullYear()}년 ${yearOrDate.getMonth() + 1}월`;
  }
  return `${yearOrDate}년 ${Number(monthIndex) + 1}월`;
};

export const monthlyEquivalentAmount = (subscription) => {
  const amount = Number(subscription?.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return isAnnual(subscription) ? Math.round(amount / 12) : Math.round(amount);
};

export const monthlyEquivalentTotal = (subscriptions = []) =>
  subscriptions.reduce((sum, subscription) => sum + monthlyEquivalentAmount(subscription), 0);

export const getCalendarDays = (year, monthIndex) => {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const lastDay = getLastDate(year, monthIndex);
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= lastDay ? day : null;
  });
};
