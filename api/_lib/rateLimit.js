const RATE_LIMIT_10M_MS = 10 * 60 * 1000;
const RATE_LIMIT_10M_MAX = 20;
const RATE_LIMIT_DAILY_MAX = 150;
const RPC_TIMEOUT_MS = 3000;

// In-memory fallback map: userId -> { m10: { windowStart, count }, daily: { windowStart, count } }
const inMemoryRateLimits = new Map();

export const _resetInMemoryRateLimits = () => {
  inMemoryRateLimits.clear();
};

const getKstMidnightTimestamp = (date) => {
  const utcMs = date.getTime();
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstDate = new Date(utcMs + kstOffsetMs);
  const y = kstDate.getUTCFullYear();
  const m = kstDate.getUTCMonth();
  const d = kstDate.getUTCDate();
  return Date.UTC(y, m, d) - kstOffsetMs;
};

const checkInMemoryLimit = (userId) => {
  const now = new Date();
  const nowMs = now.getTime();
  const window10mStart = Math.floor(nowMs / RATE_LIMIT_10M_MS) * RATE_LIMIT_10M_MS;
  const windowDailyStart = getKstMidnightTimestamp(now);

  let userRecord = inMemoryRateLimits.get(userId);
  if (!userRecord) {
    userRecord = {
      m10: { windowStart: window10mStart, count: 0 },
      daily: { windowStart: windowDailyStart, count: 0 },
    };
    inMemoryRateLimits.set(userId, userRecord);
  }

  if (userRecord.m10.windowStart !== window10mStart) {
    userRecord.m10 = { windowStart: window10mStart, count: 0 };
  }

  if (userRecord.daily.windowStart !== windowDailyStart) {
    userRecord.daily = { windowStart: windowDailyStart, count: 0 };
  }

  if (userRecord.m10.count >= RATE_LIMIT_10M_MAX) {
    const retryAfter = Math.max(1, Math.ceil((userRecord.m10.windowStart + RATE_LIMIT_10M_MS - nowMs) / 1000));
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  if (userRecord.daily.count >= RATE_LIMIT_DAILY_MAX) {
    const nextDailyStart = windowDailyStart + 24 * 60 * 60 * 1000;
    const retryAfter = Math.max(1, Math.ceil((nextDailyStart - nowMs) / 1000));
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  userRecord.m10.count += 1;
  userRecord.daily.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
};

export const consumeRateLimit = async ({ userId, bearerToken }) => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && anonKey && bearerToken) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
    try {
      const endpoint = supabaseUrl.replace(/\/+$/, "") + "/rest/v1/rpc/consume_agent_chat_quota";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: bearerToken.startsWith("Bearer ") ? bearerToken : `Bearer ${bearerToken}`,
          "Content-Type": "application/json",
        },
        body: "{}",
        signal: controller.signal,
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && typeof data.allowed === "boolean") {
          return {
            allowed: data.allowed,
            retryAfterSeconds: data.retry_after_seconds || (data.allowed ? 0 : 60),
          };
        }
      } else {
        console.warn("consume_agent_chat_quota RPC returned non-ok status:", res.status);
      }
    } catch (err) {
      console.warn("consume_agent_chat_quota RPC call failed, falling back to in-memory limiter:", err?.message || err);
    } finally {
      clearTimeout(timer);
    }
  }

  return checkInMemoryLimit(userId || "anonymous");
};
