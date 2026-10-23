import { SERVICE_ALIAS_CATALOG } from "./serviceAliases.js";
import { getCancelGuide } from "../../src/data/cancelGuides.js";
import { getKstDateString } from "./kstDate.js";

// Tool Declarations for Gemini
export const CHAT_TOOL_DECLARATIONS = [
  {
    name: "list_subscriptions",
    description: "현재 사용자의 구독 목록을 조회합니다. 상태(status)나 카테고리(category)로 필터링할 수 있습니다.",
    parameters: {
      type: "OBJECT",
      properties: {
        status: {
          type: "STRING",
          description: "구독 상태 필터 (예: 'active', 'trial', 'cancelled')",
        },
        category: {
          type: "STRING",
          description: "카테고리 필터 (예: 'OTT', '음악', '생산성')",
        },
      },
    },
  },
  {
    name: "get_spending",
    description: "구독 지출 금액을 계산합니다. 전체 지출뿐만 아니라 특정 구독들만 선택하여 합산하거나 월/연 환산 합계를 구할 때도 사용합니다 (subscriptionIds 지정). 월간(month) 또는 연간(year) 기준을 선택할 수 있으며 카테고리나 결제수단별로 그룹화할 수 있습니다. 해지(cancelled)된 구독은 제외됩니다.",
    parameters: {
      type: "OBJECT",
      properties: {
        period: {
          type: "STRING",
          description: "계산 주기: 'month' (월간) 또는 'year' (연간)",
        },
        subscriptionIds: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "특정 구독들만 합산하거나 월/연 환산 합계를 구할 때 전달하는 구독 ID 목록 (선택)",
        },
        groupBy: {
          type: "STRING",
          description: "그룹화 기준: 'category' 또는 'paymentMethod'",
        },
      },
      required: ["period"],
    },
  },
  {
    name: "get_upcoming_payments",
    description: "오늘(today) 이후 결제 예정인 구독 목록과 합계 금액을 반환합니다. '이번 달 남은 결제'는 range='this_month', '다음 달 결제'는 range='next_month', 특정 일수 조회의 경우 range='days'(기본값)와 days 파라미터를 사용합니다.",
    parameters: {
      type: "OBJECT",
      properties: {
        days: {
          type: "INTEGER",
          description: "조회할 일수 (1~60, 기본값 30)",
        },
        range: {
          type: "STRING",
          description: "조회 기간 범위: 'this_month' (이번 달 오늘부터 말일까지), 'next_month' (다음 달 전체 1일~말일), 'days' (지정 일수 이내, 기본값)",
        },
      },
    },
  },
  {
    name: "compare_subscriptions",
    description: "지정된 2개 이상의 구독 ID 목록에 대한 상세 정보를 비교합니다.",
    parameters: {
      type: "OBJECT",
      properties: {
        subscriptionIds: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "비교할 구독의 ID 배열",
        },
      },
      required: ["subscriptionIds"],
    },
  },
  {
    name: "find_subscription",
    description: "구독 이름, 별칭, 서비스 식별자(serviceId)로 구독을 검색합니다 (한국어/영어 퍼지 검색 지원).",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "검색할 구독 이름 또는 서비스명",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_cancel_info",
    description: "특정 구독의 해지 방법, 경로 및 링크 정보를 조회합니다.",
    parameters: {
      type: "OBJECT",
      properties: {
        subscriptionId: {
          type: "STRING",
          description: "해지 정보를 조회할 구독 ID",
        },
      },
      required: ["subscriptionId"],
    },
  },
  {
    name: "propose_add_subscription",
    description: "사용자에게 새로운 구독 추가를 제안합니다. 실제 추가는 사용자가 UI에서 확인 후 진행됩니다.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "구독 서비스 이름" },
        serviceId: { type: "STRING", description: "서비스 ID (선택)" },
        plan: { type: "STRING", description: "요금제 이름 (선택)" },
        amount: { type: "INTEGER", description: "결제 금액 (0 이상의 정수, 원)" },
        billingCycle: { type: "STRING", description: "'매월' 또는 '매년'" },
        nextChargeDate: { type: "STRING", description: "다음 결제일 (YYYY-MM-DD, 선택)" },
        billingDay: { type: "INTEGER", description: "정기 결제일 (1~31, 선택)" },
        paymentMethod: { type: "STRING", description: "결제 수단 (선택)" },
      },
      required: ["name", "amount", "billingCycle"],
    },
  },
  {
    name: "propose_update_subscription",
    description: "기존 구독 정보 수정을 제안합니다. 실제 수정은 사용자가 UI에서 확인 후 진행됩니다.",
    parameters: {
      type: "OBJECT",
      properties: {
        subscriptionId: { type: "STRING", description: "수정할 구독 ID (기존 스냅샷에 존재해야 함)" },
        changes: {
          type: "OBJECT",
          properties: {
            amount: { type: "INTEGER", description: "변경할 금액 (0 이상의 정수)" },
            billingCycle: { type: "STRING", description: "'매월' 또는 '매년'" },
            nextChargeDate: { type: "STRING", description: "다음 결제일 (YYYY-MM-DD)" },
            billingDay: { type: "INTEGER", description: "정기 결제일 (1~31)" },
            plan: { type: "STRING", description: "요금제" },
            paymentMethod: { type: "STRING", description: "결제 수단" },
          },
          description: "변경할 필드들 (최소 1개 이상 필요)",
        },
      },
      required: ["subscriptionId", "changes"],
    },
  },
  {
    name: "propose_set_alerts",
    description: "구독 알림 설정 변경을 제안합니다 (d-3, d-1 알림 여부).",
    parameters: {
      type: "OBJECT",
      properties: {
        subscriptionId: { type: "STRING", description: "대상 구독 ID 또는 모든 구독 대상 'all'" },
        alertD3: { type: "BOOLEAN", description: "결제 3일 전 알림 여부" },
        alertD1: { type: "BOOLEAN", description: "결제 1일 전 알림 여부" },
      },
      required: ["subscriptionId"],
    },
  },
  {
    name: "propose_open_cancel",
    description: "사용자가 특정 구독을 해지할 수 있도록 해지 도우미/해지 화면 열기를 제안합니다.",
    parameters: {
      type: "OBJECT",
      properties: {
        subscriptionId: { type: "STRING", description: "해지할 구독 ID" },
      },
      required: ["subscriptionId"],
    },
  },
];

export const TOOL_LABELS = {
  list_subscriptions: "구독 목록을 확인하고 있어요",
  get_spending: "지출 금액을 분석하고 있어요",
  get_upcoming_payments: "다가오는 결제 일정을 확인하고 있어요",
  compare_subscriptions: "구독 정보를 비교하고 있어요",
  find_subscription: "구독을 찾고 있어요",
  get_cancel_info: "해지 가이드를 찾고 있어요",
  propose_add_subscription: "구독 추가 카드를 준비하고 있어요",
  propose_update_subscription: "구독 수정 카드를 준비하고 있어요",
  propose_set_alerts: "알림 설정 카드를 준비하고 있어요",
  propose_open_cancel: "해지 가이드 카드를 준비하고 있어요",
};

// Date validation helper (YYYY-MM-DD)
const isValidDateStr = (dateStr) => {
  if (typeof dateStr !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr + "T00:00:00Z");
  return !isNaN(d.getTime());
};

// Pure tool executors over snapshot
export const executeTool = ({ name, args, snapshot, emitAction }) => {
  const subscriptions = Array.isArray(snapshot?.subscriptions) ? snapshot.subscriptions : [];
  const todayStr = snapshot?.today || getKstDateString();

  switch (name) {
    case "list_subscriptions": {
      const { status, category } = args || {};
      let filtered = subscriptions;
      if (status) {
        filtered = filtered.filter((s) => (s.status || "active").toLowerCase() === status.toLowerCase());
      }
      if (category) {
        filtered = filtered.filter((s) => (s.category || "").toLowerCase() === category.toLowerCase());
      }
      return {
        totalCount: filtered.length,
        subscriptions: filtered.map((s) => ({
          id: s.id,
          name: s.name,
          plan: s.plan,
          category: s.category,
          amount: s.amount,
          billingCycle: s.billingCycle,
          nextChargeDate: s.nextChargeDate,
          paymentMethod: s.paymentMethod,
          status: s.status,
          trialEndDate: s.trialEndDate,
        })),
      };
    }

    case "get_spending": {
      const period = args?.period === "year" ? "year" : "month";
      const groupBy = args?.groupBy; // "category" | "paymentMethod"
      const subscriptionIds = Array.isArray(args?.subscriptionIds) ? args.subscriptionIds : null;

      // Exclude cancelled subscriptions
      let activeSubs = subscriptions.filter((s) => (s.status || "active").toLowerCase() !== "cancelled");
      if (subscriptionIds && subscriptionIds.length > 0) {
        activeSubs = activeSubs.filter((s) => subscriptionIds.includes(s.id));
      }

      let total = 0;
      let monthlyTotal = 0;
      let yearlyTotal = 0;
      const items = [];
      const groups = {};

      for (const s of activeSubs) {
        const amt = Number(s.amount) || 0;
        const cycle = s.billingCycle || "매월";
        let subCost;
        let monthlyEquivalent;
        let yearlyEquivalent;

        if (cycle === "매년") {
          monthlyEquivalent = Math.round(amt / 12);
          yearlyEquivalent = amt;
        } else {
          monthlyEquivalent = amt;
          yearlyEquivalent = amt * 12;
        }

        if (period === "month") {
          subCost = monthlyEquivalent;
        } else {
          subCost = yearlyEquivalent;
        }

        total += subCost;
        monthlyTotal += monthlyEquivalent;
        yearlyTotal += yearlyEquivalent;

        items.push({
          id: s.id,
          name: s.name,
          billingCycle: cycle,
          amount: amt,
          monthlyEquivalent,
          yearlyEquivalent,
        });

        if (groupBy === "category" || groupBy === "paymentMethod") {
          const groupKey = (groupBy === "category" ? s.category : s.paymentMethod) || "기타";
          groups[groupKey] = (groups[groupKey] || 0) + subCost;
        }
      }

      return {
        period,
        total,
        monthlyTotal,
        yearlyTotal,
        count: activeSubs.length,
        currency: "KRW",
        subscriptionCount: activeSubs.length,
        items,
        ...(groupBy ? { groupBy, breakdown: groups } : {}),
      };
    }

    case "get_upcoming_payments": {
      const range = args?.range || "days";
      const todayDate = new Date(todayStr + "T00:00:00Z");

      let fromStr;
      let toStr;
      let daysQueried = undefined;

      if (range === "this_month") {
        const [todayY, todayM] = todayStr.split("-").map(Number);
        const lastDay = new Date(Date.UTC(todayY, todayM, 0)).getUTCDate();
        fromStr = todayStr;
        toStr = `${todayY}-${String(todayM).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      } else if (range === "next_month") {
        const [todayY, todayM] = todayStr.split("-").map(Number);
        let nextY = todayY;
        let nextM = todayM + 1;
        if (nextM > 12) {
          nextM = 1;
          nextY++;
        }
        const lastDay = new Date(Date.UTC(nextY, nextM, 0)).getUTCDate();
        fromStr = `${nextY}-${String(nextM).padStart(2, "0")}-01`;
        toStr = `${nextY}-${String(nextM).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      } else {
        const rawDays = Number(args?.days);
        const days = isNaN(rawDays) || rawDays <= 0 ? 30 : Math.min(60, Math.floor(rawDays));
        daysQueried = days;
        const targetDate = new Date(todayDate.getTime() + days * 24 * 60 * 60 * 1000);
        fromStr = todayStr;
        toStr = targetDate.toISOString().slice(0, 10);
      }

      // Exclude cancelled subscriptions
      const activeSubs = subscriptions.filter((s) => (s.status || "active").toLowerCase() !== "cancelled");

      const upcoming = [];
      let totalAmount = 0;

      for (const s of activeSubs) {
        if (!s.nextChargeDate || !isValidDateStr(s.nextChargeDate)) continue;
        const cycle = s.billingCycle || "매월";
        const amt = Number(s.amount) || 0;

        if (cycle === "매년") {
          let [chargeY, chargeM, chargeD] = s.nextChargeDate.split("-").map(Number);
          let chargeDateStr = s.nextChargeDate;
          while (chargeDateStr < todayStr) {
            chargeY += 1;
            const daysInMonth = new Date(Date.UTC(chargeY, chargeM, 0)).getUTCDate();
            const targetDay = Math.min(chargeD, daysInMonth);
            chargeDateStr = `${chargeY}-${String(chargeM).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
          }

          if (chargeDateStr >= fromStr && chargeDateStr <= toStr) {
            const chargeDateObj = new Date(chargeDateStr + "T00:00:00Z");
            const daysLeft = Math.round((chargeDateObj.getTime() - todayDate.getTime()) / (24 * 60 * 60 * 1000));
            upcoming.push({
              id: s.id,
              name: s.name,
              date: chargeDateStr,
              amount: amt,
              dDay: daysLeft,
              billingCycle: s.billingCycle,
              nextChargeDate: chargeDateStr,
              daysLeft,
              paymentMethod: s.paymentMethod,
            });
            totalAmount += amt;
          }
        } else {
          // 매월
          const [, , baseD] = s.nextChargeDate.split("-").map(Number);
          const [fromY, fromM] = fromStr.split("-").map(Number);
          const [toY, toM] = toStr.split("-").map(Number);

          let curY = fromY;
          let curM = fromM;
          while (curY < toY || (curY === toY && curM <= toM)) {
            const daysInCurMonth = new Date(Date.UTC(curY, curM, 0)).getUTCDate();
            const targetDay = Math.min(baseD, daysInCurMonth);
            const dateStr = `${curY}-${String(curM).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
            if (dateStr >= fromStr && dateStr <= toStr && dateStr >= s.nextChargeDate) {
              const chargeDateObj = new Date(dateStr + "T00:00:00Z");
              const daysLeft = Math.round((chargeDateObj.getTime() - todayDate.getTime()) / (24 * 60 * 60 * 1000));
              upcoming.push({
                id: s.id,
                name: s.name,
                date: dateStr,
                amount: amt,
                dDay: daysLeft,
                billingCycle: s.billingCycle,
                nextChargeDate: dateStr,
                daysLeft,
                paymentMethod: s.paymentMethod,
              });
              totalAmount += amt;
            }
            curM++;
            if (curM > 12) {
              curM = 1;
              curY++;
            }
          }
        }
      }

      upcoming.sort((a, b) => (a.date || a.nextChargeDate).localeCompare(b.date || b.nextChargeDate));

      return {
        today: todayStr,
        from: fromStr,
        to: toStr,
        range,
        ...(daysQueried !== undefined ? { daysQueried } : {}),
        totalAmount,
        total: totalAmount,
        upcomingCount: upcoming.length,
        payments: upcoming,
        items: upcoming,
      };
    }

    case "compare_subscriptions": {
      const ids = Array.isArray(args?.subscriptionIds) ? args.subscriptionIds : [];
      if (ids.length === 0) {
        return { error: "비교할 구독 ID를 최소 1개 이상 지정해주세요." };
      }
      const matched = subscriptions.filter((s) => ids.includes(s.id));
      return {
        comparedCount: matched.length,
        subscriptions: matched,
      };
    }

    case "find_subscription": {
      const query = (args?.query || "").trim().toLowerCase();
      if (!query) {
        return { error: "검색어를 입력해주세요." };
      }

      const queryClean = query.replace(/\s+/g, "");

      // 1. Direct name / serviceId match or alias lookup
      const results = subscriptions.filter((s) => {
        const name = (s.name || "").toLowerCase();
        const serviceId = (s.serviceId || "").toLowerCase();
        const nameClean = name.replace(/\s+/g, "");

        if (name.includes(query) || nameClean.includes(queryClean)) return true;
        if (serviceId.includes(query) || serviceId.replace(/\s+/g, "").includes(queryClean)) return true;

        // Check SERVICE_ALIAS_CATALOG
        const aliasEntry = SERVICE_ALIAS_CATALOG.find((entry) => {
          if (entry.id === s.serviceId) return true;
          if (entry.name.toLowerCase() === name) return true;
          return false;
        });

        if (aliasEntry) {
          if (aliasEntry.aliases.some((a) => a.toLowerCase().includes(query) || a.replace(/\s+/g, "").includes(queryClean))) {
            return true;
          }
        }

        // Also check if query matches any alias whose catalog entry matches this subscription
        const matchingCatalogEntries = SERVICE_ALIAS_CATALOG.filter((entry) => {
          return entry.aliases.some((a) => a.toLowerCase().includes(query) || a.replace(/\s+/g, "").includes(queryClean)) ||
            entry.name.toLowerCase().includes(query) ||
            entry.id.includes(query);
        });

        if (matchingCatalogEntries.some((e) => e.id === s.serviceId || e.name.toLowerCase() === name)) {
          return true;
        }

        return false;
      });

      return {
        query,
        count: results.length,
        results: results.map((s) => ({
          id: s.id,
          name: s.name,
          serviceId: s.serviceId,
          plan: s.plan,
          amount: s.amount,
          billingCycle: s.billingCycle,
          status: s.status,
          nextChargeDate: s.nextChargeDate,
        })),
      };
    }

    case "get_cancel_info": {
      const subId = args?.subscriptionId;
      if (!subId) {
        return { error: "구독 ID(subscriptionId)가 필요합니다." };
      }
      const sub = subscriptions.find((s) => s.id === subId);
      if (!sub) {
        return { error: `ID가 ${subId}인 구독을 찾을 수 없습니다.` };
      }

      let guide = null;
      try {
        guide = getCancelGuide(sub.serviceId || sub.name);
      } catch (e) {
        console.warn("getCancelGuide error:", e);
      }

      if (guide) {
        return {
          subscriptionId: sub.id,
          name: sub.name,
          serviceId: sub.serviceId,
          hasGuide: true,
          cancelUrl: guide.cancelUrl || guide.officialUrl,
          estimatedMinutes: guide.estimatedMinutes,
          difficulty: guide.difficulty,
          routes: (guide.routes || []).map((r) => ({
            id: r.id,
            label: r.label,
            steps: r.steps,
          })),
          precautions: guide.precautions || [],
          retentionOffers: guide.retentionOffers || [],
        };
      }

      return {
        subscriptionId: sub.id,
        name: sub.name,
        serviceId: sub.serviceId,
        hasGuide: false,
        message: "이 서비스의 상세 해지 가이드는 앱 내 해지 안내 페이지에서 확인하실 수 있습니다.",
      };
    }

    // Action tools
    case "propose_add_subscription": {
      const { name: subName, serviceId, plan, amount, billingCycle, nextChargeDate, billingDay, paymentMethod } = args || {};

      if (!subName || typeof subName !== "string" || !subName.trim()) {
        return { error: "구독 이름(name)을 입력해주세요." };
      }
      if (typeof amount !== "number" || isNaN(amount) || amount < 0 || !Number.isInteger(amount)) {
        return { error: "결제 금액(amount)은 0 이상의 정수(원)여야 합니다." };
      }
      if (billingCycle !== "매월" && billingCycle !== "매년") {
        return { error: "결제 주기(billingCycle)는 '매월' 또는 '매년'이어야 합니다." };
      }
      if (nextChargeDate && !isValidDateStr(nextChargeDate)) {
        return { error: "다음 결제일(nextChargeDate) 형식이 올바르지 않습니다 (YYYY-MM-DD)." };
      }
      if (billingDay !== undefined) {
        const day = Number(billingDay);
        if (isNaN(day) || !Number.isInteger(day) || day < 1 || day > 31) {
          return { error: "정기 결제일(billingDay)은 1부터 31 사이의 정수여야 합니다." };
        }
      }

      const actionId = "act_" + Math.random().toString(36).substring(2, 10);
      const payload = {
        name: subName.trim(),
        ...(serviceId ? { serviceId: String(serviceId).trim() } : {}),
        ...(plan ? { plan: String(plan).trim() } : {}),
        amount,
        billingCycle,
        ...(nextChargeDate ? { nextChargeDate } : {}),
        ...(billingDay ? { billingDay: Number(billingDay) } : {}),
        ...(paymentMethod ? { paymentMethod: String(paymentMethod).trim() } : {}),
      };

      const summary = `${payload.name} (${payload.billingCycle} ${payload.amount.toLocaleString()}원) 구독 추가`;

      if (typeof emitAction === "function") {
        emitAction({ id: actionId, type: "add_subscription", payload, summary });
      }

      return { status: "proposed_to_user", actionId, summary };
    }

    case "propose_update_subscription": {
      const { subscriptionId, changes } = args || {};
      if (!subscriptionId) {
        return { error: "수정할 구독 ID(subscriptionId)가 필요합니다." };
      }
      const existing = subscriptions.find((s) => s.id === subscriptionId);
      if (!existing) {
        return { error: `구독 목록에서 ID가 '${subscriptionId}'인 구독을 찾을 수 없습니다.` };
      }
      if (!changes || typeof changes !== "object" || Object.keys(changes).length === 0) {
        return { error: "변경할 내용(changes)이 최소 1개 이상 필요합니다." };
      }

      const validKeys = ["amount", "billingCycle", "nextChargeDate", "billingDay", "plan", "paymentMethod"];
      const validatedChanges = {};

      for (const [k, v] of Object.entries(changes)) {
        if (!validKeys.includes(k) || v === undefined) continue;

        if (k === "amount") {
          if (typeof v !== "number" || isNaN(v) || v < 0 || !Number.isInteger(v)) {
            return { error: "금액(amount)은 0 이상의 정수(원)여야 합니다." };
          }
          validatedChanges.amount = v;
        } else if (k === "billingCycle") {
          if (v !== "매월" && v !== "매년") {
            return { error: "결제 주기(billingCycle)는 '매월' 또는 '매년'이어야 합니다." };
          }
          validatedChanges.billingCycle = v;
        } else if (k === "nextChargeDate") {
          if (v !== null && !isValidDateStr(v)) {
            return { error: "다음 결제일(nextChargeDate) 형식이 올바르지 않습니다 (YYYY-MM-DD)." };
          }
          validatedChanges.nextChargeDate = v;
        } else if (k === "billingDay") {
          const day = Number(v);
          if (isNaN(day) || !Number.isInteger(day) || day < 1 || day > 31) {
            return { error: "정기 결제일(billingDay)은 1부터 31 사이의 정수여야 합니다." };
          }
          validatedChanges.billingDay = day;
        } else if (k === "plan" || k === "paymentMethod") {
          validatedChanges[k] = v === null ? null : String(v).trim();
        }
      }

      if (Object.keys(validatedChanges).length === 0) {
        return { error: "유효한 변경 사항이 없습니다." };
      }

      // Filter out unchanged values against current snapshot
      const isSameValue = (key, newVal) => {
        if (key === "amount") return newVal === (existing.amount ?? existing.grossAmount);
        if (key === "billingCycle") return newVal === (existing.billingCycle || "매월");
        if (key === "nextChargeDate") return newVal === (existing.nextChargeDate || null);
        if (key === "billingDay") return newVal === (existing.dueDay ?? existing.billingDay);
        if (key === "plan") return (newVal || null) === (existing.plan || null);
        if (key === "paymentMethod") return (newVal || null) === (existing.paymentMethod || null);
        return false;
      };

      for (const [k, v] of Object.entries(validatedChanges)) {
        if (isSameValue(k, v)) {
          delete validatedChanges[k];
        }
      }

      if (Object.keys(validatedChanges).length === 0) {
        return { error: "요청한 값이 현재 값과 같아요. 바꿀 내용이 없어요." };
      }

      const actionId = "act_" + Math.random().toString(36).substring(2, 10);
      const payload = {
        subscriptionId,
        changes: validatedChanges,
      };

      const changeDesc = Object.entries(validatedChanges)
        .map(([k, v]) => {
          if (k === "amount") return `금액 ${v.toLocaleString()}원`;
          if (k === "billingCycle") return `결제주기 ${v}`;
          if (k === "nextChargeDate") return `결제일 ${v}`;
          if (k === "billingDay") return `결제일 매월 ${v}일`;
          if (k === "plan") return `요금제 ${v}`;
          if (k === "paymentMethod") return `결제수단 ${v}`;
          return `${k}: ${v}`;
        })
        .join(", ");

      const summary = `${existing.name} 정보 변경 (${changeDesc})`;

      if (typeof emitAction === "function") {
        emitAction({ id: actionId, type: "update_subscription", payload, summary });
      }

      return { status: "proposed_to_user", actionId, summary };
    }

    case "propose_set_alerts": {
      const { subscriptionId, alertD3, alertD1 } = args || {};
      if (!subscriptionId) {
        return { error: "구독 ID(subscriptionId)가 필요합니다 ('all' 가능)." };
      }

      let subName = "모든 구독";
      if (subscriptionId !== "all") {
        const existing = subscriptions.find((s) => s.id === subscriptionId);
        if (!existing) {
          return { error: `구독 목록에서 ID가 '${subscriptionId}'인 구독을 찾을 수 없습니다.` };
        }
        subName = existing.name;
      }

      if (alertD3 === undefined && alertD1 === undefined) {
        return { error: "alertD3 또는 alertD1 중 최소 하나의 설정값이 필요합니다." };
      }

      if (subscriptionId === "all") {
        const nonCancelled = subscriptions.filter((s) => s.status !== "cancelled");
        const isD3Same = alertD3 === undefined || (nonCancelled.length > 0 && nonCancelled.every((s) => Boolean(s.alertD3) === Boolean(alertD3)));
        const isD1Same = alertD1 === undefined || (nonCancelled.length > 0 && nonCancelled.every((s) => Boolean(s.alertD1) === Boolean(alertD1)));
        if (isD3Same && isD1Same) {
          return { error: "요청한 값이 현재 값과 같아요. 바꿀 내용이 없어요." };
        }
      } else {
        const existing = subscriptions.find((s) => s.id === subscriptionId);
        const isD3Same = alertD3 === undefined || Boolean(existing?.alertD3) === Boolean(alertD3);
        const isD1Same = alertD1 === undefined || Boolean(existing?.alertD1) === Boolean(alertD1);
        if (isD3Same && isD1Same) {
          return { error: "요청한 값이 현재 값과 같아요. 바꿀 내용이 없어요." };
        }
      }

      const actionId = "act_" + Math.random().toString(36).substring(2, 10);
      const payload = {
        subscriptionId,
        ...(alertD3 !== undefined ? { alertD3: Boolean(alertD3) } : {}),
        ...(alertD1 !== undefined ? { alertD1: Boolean(alertD1) } : {}),
      };

      const alertParts = [];
      if (payload.alertD3 !== undefined) alertParts.push(`3일 전 알림 ${payload.alertD3 ? "켜기" : "끄기"}`);
      if (payload.alertD1 !== undefined) alertParts.push(`1일 전 알림 ${payload.alertD1 ? "켜기" : "끄기"}`);

      const summary = `${subName} (${alertParts.join(", ")})`;

      if (typeof emitAction === "function") {
        emitAction({ id: actionId, type: "set_alerts", payload, summary });
      }

      return { status: "proposed_to_user", actionId, summary };
    }

    case "propose_open_cancel": {
      const { subscriptionId } = args || {};
      if (!subscriptionId) {
        return { error: "해지할 구독 ID(subscriptionId)가 필요합니다." };
      }
      const existing = subscriptions.find((s) => s.id === subscriptionId);
      if (!existing) {
        return { error: `구독 목록에서 ID가 '${subscriptionId}'인 구독을 찾을 수 없습니다.` };
      }

      const actionId = "act_" + Math.random().toString(36).substring(2, 10);
      const payload = { subscriptionId };
      const summary = `${existing.name} 해지 가이드 열기`;

      if (typeof emitAction === "function") {
        emitAction({ id: actionId, type: "open_cancel", payload, summary });
      }

      return { status: "proposed_to_user", actionId, summary };
    }

    default:
      return { error: `알 수 없는 도구입니다: ${name}` };
  }
};
