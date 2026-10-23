import { parseLocalDate } from "./dates.js";

export function buildDuesByDay(subscriptions = [], month, lastDay) {
  const map = new Map();
  for (const sub of subscriptions) {
    if (!sub || sub.status === "cancelled") continue;
    if (sub.billingCycle === "매년") {
      const parsedNext = sub.nextBillingDate ? parseLocalDate(sub.nextBillingDate) : null;
      const parsedCreated = sub.createdAt ? parseLocalDate(sub.createdAt) : null;
      const chargeDate = parsedNext || parsedCreated || null;
      if (chargeDate !== null) {
        if (chargeDate.getMonth() !== month) {
          continue;
        }
      }
    }
    const day = Math.min(Number(sub.dueDay) || 1, lastDay);
    const list = map.get(day) || [];
    list.push(sub);
    map.set(day, list);
  }
  return map;
}
