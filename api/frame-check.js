const ALLOWED_HOST_SUFFIXES = [
  "naver.com",
  "netflix.com",
  "youtube.com",
  "spotify.com",
  "chatgpt.com",
  "openai.com",
  "coupang.com",
  "tving.com",
  "disneyplus.com",
  "millie.co.kr",
];

function hostAllowed(hostname = "") {
  const host = String(hostname).toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith("." + suffix)
  );
}

function readHeader(headers, name) {
  if (!headers) return "";
  if (typeof headers.get === "function") return headers.get(name) || "";
  const target = String(name).toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === target);
  return entry?.[1] || "";
}

export function evaluateFramePolicy(headers = {}) {
  const xFrameOptions = String(readHeader(headers, "x-frame-options")).trim().toLowerCase();
  if (xFrameOptions.includes("deny")) {
    return { embeddable: false, reason: "X_FRAME_OPTIONS_DENY" };
  }
  if (xFrameOptions.includes("sameorigin")) {
    return { embeddable: false, reason: "X_FRAME_OPTIONS_SAMEORIGIN" };
  }

  const csp = String(readHeader(headers, "content-security-policy")).toLowerCase();
  const frameAncestors = csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("frame-ancestors"));

  if (frameAncestors) {
    if (frameAncestors.includes("'none'")) {
      return { embeddable: false, reason: "CSP_FRAME_ANCESTORS_NONE" };
    }
    if (frameAncestors.includes("'self'") && !frameAncestors.includes("*")) {
      return { embeddable: false, reason: "CSP_FRAME_ANCESTORS_RESTRICTED" };
    }
  }

  return { embeddable: true, reason: "NO_BLOCKING_FRAME_HEADER" };
}

function send(response, status, payload) {
  response.status(status).json(payload);
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return send(response, 405, { ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const rawUrl = String(request.query?.url || "").trim();
  let target;
  try {
    target = new URL(rawUrl);
  } catch {
    return send(response, 400, { ok: false, code: "INVALID_URL" });
  }

  if (target.protocol !== "https:" || !hostAllowed(target.hostname)) {
    return send(response, 400, { ok: false, code: "UNSUPPORTED_DOMAIN" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const upstream = await fetch(target.toString(), {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "KKUDOK-Frame-Policy-Check/1.0",
      },
    });

    const policy = evaluateFramePolicy(upstream.headers);
    const reachable = upstream.status >= 200 && upstream.status < 400;
    return send(response, 200, {
      ok: true,
      embeddable: reachable && policy.embeddable,
      reason: reachable ? policy.reason : "UPSTREAM_NOT_REACHABLE",
      status: upstream.status,
      finalUrl: upstream.url || target.toString(),
    });
  } catch (error) {
    return send(response, 200, {
      ok: true,
      embeddable: false,
      reason: error?.name === "AbortError" ? "CHECK_TIMEOUT" : "CHECK_FAILED",
    });
  } finally {
    clearTimeout(timeout);
  }
}
