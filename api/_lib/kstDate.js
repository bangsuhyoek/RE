export function getKstDateString(date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    const kstOffsetMs = 9 * 60 * 60 * 1000;
    const kstTime = new Date(date.getTime() + kstOffsetMs);
    return kstTime.toISOString().slice(0, 10);
  }
}
