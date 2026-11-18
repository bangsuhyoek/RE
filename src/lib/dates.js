export const parseLocalDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return null;
  // 시각과 시간대가 붙은 ISO 값(예: createdAt "2026-09-11T23:30:00.000Z")은 기기 시간대 날짜로 바꾼다.
  // 앞 10자리만 자르면 한국 오전 0~9시에 만든 값이 하루 전 날짜가 된다.
  if (/^\d{4}-\d{1,2}-\d{1,2}T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(dateStr.trim())) {
    const instant = new Date(dateStr.trim());
    if (!Number.isNaN(instant.getTime())) {
      return new Date(instant.getFullYear(), instant.getMonth(), instant.getDate());
    }
  }
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) {
    const fallback = new Date(dateStr);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, month, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// C2 표기: 화면과 알림·메시지 모두 "17,000원".
export const formatWon = (amount) => `${Number(amount || 0).toLocaleString("ko-KR")}원`;
export const formatWonText = formatWon;
// 예전에 저장된 알림·대화 문구의 "₩14,900"을 화면에 보여 줄 때 "14,900원"으로 바꾼다(저장 데이터는 그대로).
export const normalizeWonText = (text) =>
  typeof text === "string" ? text.replace(/[₩￦]\s?(\d[\d,]*)/g, "$1원") : text;

// 기기 시간대 기준 YYYY-MM-DD. toISOString()은 UTC라 한국 자정이 전날로 바뀌므로 날짜 키에는 이 함수를 쓴다.
export const toLocalDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const getMonthKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export const getLastDate = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

export const dateForDueDay = (year, monthIndex, dueDay) =>
  new Date(year, monthIndex, Math.min(Number(dueDay), getLastDate(year, monthIndex)));

export const getNextChargeDate = (subscription, reference = new Date()) => {
  const today = startOfDay(reference);
  const isYearly = subscription?.billingCycle === "매년";

  if (subscription?.nextBillingDate) {
    const explicitParsed = parseLocalDate(subscription.nextBillingDate);
    const explicit = explicitParsed ? startOfDay(explicitParsed) : null;
    if (explicit && explicit >= today) return explicit;
    if (explicit) {
      if (isYearly) {
        const targetMonth = explicit.getMonth();
        const targetDay = explicit.getDate();
        let targetYear = explicit.getFullYear() + 1;
        let candidate = dateForDueDay(targetYear, targetMonth, targetDay);
        while (candidate < today) {
          targetYear += 1;
          candidate = dateForDueDay(targetYear, targetMonth, targetDay);
        }
        return candidate;
      }

      const targetDay = explicit.getDate();
      let curYear = explicit.getFullYear();
      let curMonth = explicit.getMonth() + 1;
      let candidate = dateForDueDay(curYear, curMonth, targetDay);
      while (candidate < today) {
        curMonth += 1;
        if (curMonth > 11) {
          curYear += Math.floor(curMonth / 12);
          curMonth = curMonth % 12;
        }
        candidate = dateForDueDay(curYear, curMonth, targetDay);
      }
      return candidate;
    }
  }

  if (isYearly) {
    const createdParsed = subscription.createdAt ? parseLocalDate(subscription.createdAt) : null;
    const baseMonth = createdParsed ? createdParsed.getMonth() : today.getMonth();
    let candidate = dateForDueDay(today.getFullYear(), baseMonth, subscription.dueDay);
    if (candidate < today) {
      candidate = dateForDueDay(today.getFullYear() + 1, baseMonth, subscription.dueDay);
    }
    return candidate;
  }

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
  if (!subscription) return false;
  const today = startOfDay(reference);

  // 등록일이 있고 오늘과 같은 날(또는 생성일 이후 결제일 이전 주기 등) 확인
  // 이번 결제일 이후 등록한 구독은 그 주기 제외:
  // subscription.createdAt 기준이 오늘 결제일(thisCycleDue) 이후라면 이번 주기 갱신 확인 제외
  const createdDate = subscription.createdAt ? parseLocalDate(subscription.createdAt) : null;
  const isYearly = subscription.billingCycle === "매년";

  // 사용자가 지정한 다음 결제일(무료체험 종료일 포함)이 아직 오지 않았으면 이번 주기에 확인할 결제가 없다.
  const explicitNext = subscription.nextBillingDate ? parseLocalDate(subscription.nextBillingDate) : null;
  if (explicitNext && startOfDay(explicitNext) >= today) {
    return false;
  }

  if (isYearly) {
    let thisYearDue = null;
    if (subscription.nextBillingDate) {
      const explicit = parseLocalDate(subscription.nextBillingDate);
      if (explicit) {
        thisYearDue = dateForDueDay(today.getFullYear(), explicit.getMonth(), explicit.getDate());
      }
    }
    if (!thisYearDue) {
      const baseMonth = createdDate ? createdDate.getMonth() : today.getMonth();
      thisYearDue = dateForDueDay(today.getFullYear(), baseMonth, subscription.dueDay || 1);
    }

    // 연간 구독은 올해 결제일이 지났을 때만 (thisYearDue < today)
    if (thisYearDue >= today) {
      return false;
    }

    // 이번 결제일 이후 등록한 구독은 그 주기 제외
    if (createdDate && startOfDay(createdDate) >= thisYearDue) {
      return false;
    }

    return true;
  }

  // 월간 구독
  const thisMonthDue = dateForDueDay(today.getFullYear(), today.getMonth(), subscription.dueDay || 1);
  if (thisMonthDue >= today) {
    return false;
  }

  // 이번 결제일 이후 등록한 구독은 그 주기 제외
  if (createdDate && startOfDay(createdDate) >= thisMonthDue) {
    return false;
  }

  return true;
};

export const formatBillingDate = (subscription, reference = new Date()) => {
  const date = getNextChargeDate(subscription, reference);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

export const formatKoreanMonth = (yearOrDate, monthIndex) => {
  if (yearOrDate instanceof Date) {
    return `${yearOrDate.getFullYear()}년 ${yearOrDate.getMonth() + 1}월`;
  }
  return `${yearOrDate}년 ${Number(monthIndex) + 1}월`;
};

export const getCalendarDays = (year, monthIndex) => {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const lastDay = getLastDate(year, monthIndex);
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= lastDay ? day : null;
  });
};
