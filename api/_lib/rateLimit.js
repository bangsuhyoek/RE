const RATE_LIMIT_10M_MS = 10 * 60 * 1000;
const RPC_TIMEOUT_MS = 3000;

// In-memory fallback map: only used when dev bypass is active
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

const checkInMemoryLimit = (userId, limit10m = 20, limitDaily = 150) => {
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

  if (userRecord.m10.count >= limit10m) {
    const retryAfter = Math.max(1, Math.ceil((userRecord.m10.windowStart + RATE_LIMIT_10M_MS - nowMs) / 1000));
    return { allowed: false, failClosed: false, retryAfterSeconds: retryAfter };
  }

  if (userRecord.daily.count >= limitDaily) {
    const nextDailyStart = windowDailyStart + 24 * 60 * 60 * 1000;
    const retryAfter = Math.max(1, Math.ceil((nextDailyStart - nowMs) / 1000));
    return { allowed: false, failClosed: false, retryAfterSeconds: retryAfter };
  }

  userRecord.m10.count += 1;
  userRecord.daily.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
};

const getEndpointLimits = (endpoint) => {
  switch (endpoint) {
    case "ocr":
      return {
        limit10m: parseInt(process.env.OCR_QUOTA_10M, 10) || 20,
        limitDaily: parseInt(process.env.OCR_QUOTA_DAILY, 10) || 100,
      };
    case "agent":
      return {
        limit10m: parseInt(process.env.AGENT_QUOTA_10M, 10) || 20,
        limitDaily: parseInt(process.env.AGENT_QUOTA_DAILY, 10) || 150,
      };
    case "cancel_next_step":
    case "cancel":
      return {
        limit10m: parseInt(process.env.CANCEL_QUOTA_10M, 10) || 30,
        limitDaily: parseInt(process.env.CANCEL_QUOTA_DAILY, 10) || 200,
      };
    case "chat":
    default:
      return {
        limit10m: parseInt(process.env.CHAT_QUOTA_10M, 10) || 20,
        limitDaily: parseInt(process.env.CHAT_QUOTA_DAILY, 10) || 150,
      };
  }
};

/**
 * Checks and increments project-wide global daily Gemini quota.
 * Fails closed if the RPC call fails.
 */
export const consumeGlobalQuota = async ({ bearerToken }) => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey || !bearerToken) {
    return {
      allowed: false,
      failClosed: true,
      retryAfterSeconds: 60,
    };
  }

  const globalLimit = parseInt(process.env.GEMINI_GLOBAL_DAILY_LIMIT, 10) || 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

  try {
    const endpointUrl = supabaseUrl.replace(/\/+$/, "") + "/rest/v1/rpc/consume_global_gemini_quota";
    const authHeader = bearerToken.startsWith("Bearer ") ? bearerToken : `Bearer ${bearerToken}`;

    const res = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_max_daily: globalLimit }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn("consume_global_gemini_quota RPC non-ok:", res.status);
      return {
        allowed: false,
        failClosed: true,
        retryAfterSeconds: 60,
      };
    }

    const data = await res.json().catch(() => null);
    if (!data || typeof data.allowed !== "boolean") {
      return {
        allowed: false,
        failClosed: true,
        retryAfterSeconds: 60,
      };
    }

    return {
      allowed: data.allowed,
      failClosed: false,
      retryAfterSeconds: data.retry_after_seconds || (data.allowed ? 0 : 60),
    };
  } catch (err) {
    console.warn("consume_global_gemini_quota RPC failed:", err?.message || err);
    return {
      allowed: false,
      failClosed: true,
      retryAfterSeconds: 60,
    };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Checks and increments endpoint user quota.
 * Fails closed if the RPC call fails.
 */
export const consumeEndpointQuota = async ({ userId, bearerToken, endpoint = "chat" }) => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey || !bearerToken) {
    if (process.env.SUBMATE_DEV_CHAT_BYPASS === "1" || (!bearerToken && userId === "anonymous")) {
      const limits = getEndpointLimits(endpoint);
      return checkInMemoryLimit(userId || "anonymous", limits.limit10m, limits.limitDaily);
    }
    return {
      allowed: false,
      failClosed: true,
      retryAfterSeconds: 60,
    };
  }

  const limits = getEndpointLimits(endpoint);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

  try {
    const isLegacyChat = endpoint === "chat";
    const rpcPath = isLegacyChat
      ? "/rest/v1/rpc/consume_agent_chat_quota"
      : "/rest/v1/rpc/consume_endpoint_quota";

    const endpointUrl = supabaseUrl.replace(/\/+$/, "") + rpcPath;
    const authHeader = bearerToken.startsWith("Bearer ") ? bearerToken : `Bearer ${bearerToken}`;
    const rpcBody = isLegacyChat
      ? "{}"
      : JSON.stringify({
          p_endpoint: endpoint,
          p_max_10m: limits.limit10m,
          p_max_daily: limits.limitDaily,
        });

    const res = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: rpcBody,
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`${rpcPath} RPC non-ok:`, res.status);
      return {
        allowed: false,
        failClosed: true,
        retryAfterSeconds: 60,
      };
    }

    const data = await res.json().catch(() => null);
    if (!data || typeof data.allowed !== "boolean") {
      return {
        allowed: false,
        failClosed: true,
        retryAfterSeconds: 60,
      };
    }

    return {
      allowed: data.allowed,
      failClosed: false,
      retryAfterSeconds: data.retry_after_seconds || (data.allowed ? 0 : 60),
    };
  } catch (err) {
    console.warn(`Quota RPC failed (${endpoint}):`, err?.message || err);
    return {
      allowed: false,
      failClosed: true,
      retryAfterSeconds: 60,
    };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Consumes user quota and global Gemini quota before calling models.
 * Fails closed (allowed: false, failClosed: true, retryAfterSeconds: 60) on RPC failure.
 * The per-user quota is checked first so a user who is already over their own limit never
 * burns the project-wide daily counter. The global counter can only be spent in the rare
 * case where the project cap itself is reached.
 */
export const consumeRateLimit = async ({ userId, bearerToken, endpoint = "chat", checkGlobal = true }) => {
  // 1. Consume endpoint user quota
  const userQuotaResult = await consumeEndpointQuota({ userId, bearerToken, endpoint });
  if (!userQuotaResult.allowed) {
    return userQuotaResult;
  }

  // 2. Consume global Gemini quota if requested and authenticated
  if (checkGlobal && bearerToken) {
    const globalQuotaResult = await consumeGlobalQuota({ bearerToken });
    if (!globalQuotaResult.allowed) {
      return globalQuotaResult;
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
};

