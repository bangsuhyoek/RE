const stripTags = (value = "") =>
  String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

function normalizeHttpsUrl(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|^(?:clid|fbclid|nclid)$/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    return url.href;
  } catch {
    return null;
  }
}

function timeoutSignal(timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timer };
}

async function readJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.errorMessage ||
      payload?.message ||
      `HTTP_${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function candidate({ provider, query, rank, url, title, snippet }) {
  const normalizedUrl = normalizeHttpsUrl(url);
  if (!normalizedUrl) return null;
  return {
    provider,
    query,
    rank,
    url: normalizedUrl,
    title: stripTags(title),
    snippet: stripTags(snippet),
    discoveredAt: new Date().toISOString(),
  };
}

export function createNaverSearchProvider(env = process.env, fetchImpl = globalThis.fetch) {
  const hubId = env.NAVER_SEARCH_API_KEY_ID;
  const hubKey = env.NAVER_SEARCH_API_KEY;
  const legacyId = env.NAVER_CLIENT_ID;
  const legacySecret = env.NAVER_CLIENT_SECRET;

  const mode = hubId && hubKey ? "API_HUB" : legacyId && legacySecret ? "LEGACY" : "UNCONFIGURED";
  const endpoint =
    mode === "API_HUB"
      ? env.NAVER_SEARCH_ENDPOINT || "https://naverapihub.apigw.ntruss.com/search/v1/webkr"
      : env.NAVER_SEARCH_ENDPOINT || "https://openapi.naver.com/v1/search/webkr.json";

  return {
    id: "NAVER",
    mode,
    configured: mode !== "UNCONFIGURED",
    async search(query, { display = 20, start = 1, timeoutMs = 12_000 } = {}) {
      if (mode === "UNCONFIGURED") {
        return { items: [], error: "NAVER_SEARCH_NOT_CONFIGURED", provider: "NAVER" };
      }

      const url = new URL(endpoint);
      url.searchParams.set("query", query);
      url.searchParams.set("display", String(Math.max(1, Math.min(Number(display) || 20, 100))));
      url.searchParams.set("start", String(Math.max(1, Math.min(Number(start) || 1, 1000))));
      if (mode === "API_HUB") url.searchParams.set("format", "json");

      const headers =
        mode === "API_HUB"
          ? {
              "X-NCP-APIGW-API-KEY-ID": hubId,
              "X-NCP-APIGW-API-KEY": hubKey,
            }
          : {
              "X-Naver-Client-Id": legacyId,
              "X-Naver-Client-Secret": legacySecret,
            };

      const { controller, timer } = timeoutSignal(timeoutMs);
      try {
        const response = await fetchImpl(url, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
        const payload = await readJson(response);
        const rawItems = Array.isArray(payload?.items) ? payload.items : [];
        return {
          provider: "NAVER",
          items: rawItems
            .map((item, index) =>
              candidate({
                provider: "NAVER",
                query,
                rank: start + index,
                url: item.link,
                title: item.title,
                snippet: item.description,
              })
            )
            .filter(Boolean),
          error: null,
        };
      } catch (error) {
        return {
          provider: "NAVER",
          items: [],
          error: error?.name === "AbortError" ? "NAVER_SEARCH_TIMEOUT" : error.message,
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

const GOOGLE_CUSTOM_SEARCH_TRANSITION_AT = Date.parse("2027-01-01T00:00:00Z");

export function createGoogleSearchProvider(
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = Date.now()
) {
  const key = env.GOOGLE_SEARCH_API_KEY;
  const cx = env.GOOGLE_SEARCH_CX;
  const requestedMode = String(env.GOOGLE_SEARCH_MODE || "CUSTOM_SEARCH_JSON").trim().toUpperCase();
  const beforeTransition = Number(now) < GOOGLE_CUSTOM_SEARCH_TRANSITION_AT;
  const customSearchAllowed = requestedMode === "CUSTOM_SEARCH_JSON" && beforeTransition;
  const configured = Boolean(key && cx && customSearchAllowed);
  const endpoint =
    env.GOOGLE_SEARCH_ENDPOINT ||
    "https://customsearch.googleapis.com/customsearch/v1";
  const mode = requestedMode === "CUSTOM_SEARCH_JSON" && !beforeTransition
    ? "TRANSITION_REQUIRED"
    : configured
      ? "CUSTOM_SEARCH_JSON"
      : requestedMode === "CUSTOM_SEARCH_JSON"
        ? "UNCONFIGURED"
        : "UNSUPPORTED_MODE";

  return {
    id: "GOOGLE",
    mode,
    configured,
    async search(query, { display = 10, start = 1, timeoutMs = 12_000 } = {}) {
      if (!configured) {
        const error =
          mode === "TRANSITION_REQUIRED"
            ? "GOOGLE_CUSTOM_SEARCH_TRANSITION_REQUIRED"
            : mode === "UNSUPPORTED_MODE"
              ? "GOOGLE_SEARCH_MODE_UNSUPPORTED"
              : "GOOGLE_SEARCH_NOT_CONFIGURED";
        return { items: [], error, provider: "GOOGLE" };
      }

      const url = new URL(endpoint);
      url.searchParams.set("key", key);
      url.searchParams.set("cx", cx);
      url.searchParams.set("q", query);
      url.searchParams.set("num", String(Math.max(1, Math.min(Number(display) || 10, 10))));
      url.searchParams.set("start", String(Math.max(1, Number(start) || 1)));

      const { controller, timer } = timeoutSignal(timeoutMs);
      try {
        const response = await fetchImpl(url, {
          method: "GET",
          signal: controller.signal,
        });
        const payload = await readJson(response);
        const rawItems = Array.isArray(payload?.items) ? payload.items : [];
        return {
          provider: "GOOGLE",
          items: rawItems
            .map((item, index) =>
              candidate({
                provider: "GOOGLE",
                query,
                rank: start + index,
                url: item.link,
                title: item.title,
                snippet: item.snippet,
              })
            )
            .filter(Boolean),
          error: null,
        };
      } catch (error) {
        return {
          provider: "GOOGLE",
          items: [],
          error: error?.name === "AbortError" ? "GOOGLE_SEARCH_TIMEOUT" : error.message,
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export function buildSearchProviders(env = process.env, fetchImpl = globalThis.fetch) {
  return [
    createNaverSearchProvider(env, fetchImpl),
    createGoogleSearchProvider(env, fetchImpl),
  ];
}

export function configuredProviderSummary(providers = []) {
  return providers.map((provider) => ({
    id: provider.id,
    mode: provider.mode,
    configured: Boolean(provider.configured),
  }));
}
