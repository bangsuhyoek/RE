// 어카운트인포(금융결제원) 카드자동납부 해지는 영업일 09:00~22:00에만 된다.
// 공휴일은 우주항공청·한국천문연구원 월력요항과 관공서의 공휴일에 관한 규정 기준이다(2026-10-04 확인).
// 목록이 없는 해는 주말만 빼고 계산하고, 화면에서 공휴일일 수 있다고 알린다.

export const ACCOUNTINFO_CANCEL_HOURS = { openHour: 9, closeHour: 22 };

export const KR_HOLIDAYS = {
  2026: [
    "2026-01-01",
    "2026-02-16", "2026-02-17", "2026-02-18",
    "2026-03-01", "2026-03-02",
    "2026-05-01", "2026-05-05", "2026-05-24", "2026-05-25",
    "2026-06-03", "2026-06-06",
    "2026-07-17",
    "2026-08-15", "2026-08-17",
    "2026-09-24", "2026-09-25", "2026-09-26",
    "2026-10-03", "2026-10-05", "2026-10-09",
    "2026-12-25",
  ],
  2027: [
    "2027-01-01",
    "2027-02-06", "2027-02-07", "2027-02-08", "2027-02-09",
    "2027-03-01",
    "2027-05-01", "2027-05-03", "2027-05-05", "2027-05-13",
    "2027-06-06",
    "2027-07-17", "2027-07-19",
    "2027-08-15", "2027-08-16",
    "2027-09-14", "2027-09-15", "2027-09-16",
    "2027-10-03", "2027-10-04", "2027-10-09", "2027-10-11",
    "2027-12-25", "2027-12-27",
  ],
};

const HOLIDAY_SET = new Set(Object.values(KR_HOLIDAYS).flat());

const pad = (value) => String(value).padStart(2, "0");

export const toDateKey = (date) => date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());

export const hasHolidayData = (year) => Boolean(KR_HOLIDAYS[year]);

export function isBusinessDay(date) {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  return !HOLIDAY_SET.has(toDateKey(date));
}

export function isAccountInfoCancelOpen(now = new Date()) {
  const hour = now.getHours();
  return isBusinessDay(now) && hour >= ACCOUNTINFO_CANCEL_HOURS.openHour && hour < ACCOUNTINFO_CANCEL_HOURS.closeHour;
}

// 지금이 해지 가능 시간이면 now를, 아니면 다음 영업일 09:00을 돌려준다.
export function nextAccountInfoCancelOpening(now = new Date()) {
  if (isAccountInfoCancelOpen(now)) return new Date(now);
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), ACCOUNTINFO_CANCEL_HOURS.openHour, 0, 0, 0);
  if (!(isBusinessDay(candidate) && now < candidate)) {
    do {
      candidate.setDate(candidate.getDate() + 1);
    } while (!isBusinessDay(candidate));
  }
  return candidate;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function formatKoreanDateTime(date) {
  return (date.getMonth() + 1) + "월 " + date.getDate() + "일(" + WEEKDAYS[date.getDay()] + ") " + pad(date.getHours()) + ":" + pad(date.getMinutes());
}

// 해지 화면에 보여줄 상태. holidayDataKnown이 false면 공휴일을 확인하지 못한 해다.
export function describeAccountInfoAvailability(now = new Date()) {
  const open = isAccountInfoCancelOpen(now);
  const nextOpen = nextAccountInfoCancelOpening(now);
  return {
    open,
    nextOpen,
    nextOpenLabel: formatKoreanDateTime(nextOpen),
    holidayDataKnown: hasHolidayData(now.getFullYear()) && hasHolidayData(nextOpen.getFullYear()),
  };
}

