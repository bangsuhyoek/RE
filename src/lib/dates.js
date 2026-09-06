const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const formatWon = (amount) => `₩${Number(amount || 0).toLocaleString("ko-KR")}`;

export const getMonthKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export const getLastDate = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

export const dateForDueDay = (year, monthIndex, dueDay) =>
  new Date(year, monthIndex, Math.min(Number(dueDay), getLastDate(year, monthIndex)));

export const getNextChargeDate = (subscription, reference = new Date()) => {
  const today = startOfDay(reference);
  const thisMonth = dateForDueDay(today.getFullYear(), today.getMonth(), subscription.dueDay);
  if (thisMonth >= today) return thisMonth;
  return dateForDueDay(today.getFullYear(), today.getMonth() + 1, subscription.dueDay);
};

export const daysUntilCharge = (subscription, reference = new Date()) => {
  const today = startOfDay(reference);
  const next = getNextChargeDate(subscription, reference);
  return Math.round((next - today) / 86_400_000);
};

export const isPastDueThisCycle = (subscription, reference = new Date()) => {
  const today = startOfDay(reference);
  const thisMonth = dateForDueDay(today.getFullYear(), today.getMonth(), subscription.dueDay);
  return thisMonth < today;
};

export const formatBillingDate = (subscription, reference = new Date()) => {
  const date = getNextChargeDate(subscription, reference);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

export const formatKoreanMonth = (year, monthIndex) => `${year}년 ${monthIndex + 1}월`;

export const getCalendarDays = (year, monthIndex) => {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const lastDay = getLastDate(year, monthIndex);
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= lastDay ? day : null;
  });
};
