export const DEFAULT_ALLOWED_ORIGINS = [
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

export function getAllowedOrigins() {
  const envOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]));
}

export function isOriginAllowed(origin, customAllowedOrigins) {
  if (!origin || typeof origin !== "string") return false;
  const allowed = customAllowedOrigins || getAllowedOrigins();
  return allowed.includes(origin.trim());
}

export function applyCors(request, response, options = {}) {
  if (!response || typeof response.setHeader !== "function") return;
  if (response.headersSent) return;

  const existingVary = typeof response.getHeader === "function"
    ? response.getHeader("Vary")
    : (response.headers?.vary || response.headers?.Vary);

  if (existingVary) {
    const tokens = String(existingVary).split(",").map((s) => s.trim().toLowerCase());
    if (!tokens.includes("origin")) {
      response.setHeader("Vary", `${existingVary}, Origin`);
    }
  } else {
    response.setHeader("Vary", "Origin");
  }

  response.setHeader("Access-Control-Allow-Methods", options.methods || "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", options.headers || "Content-Type, Authorization");

  const headers = request?.headers || {};
  const origin = headers.origin ?? headers.Origin ?? headers.ORIGIN;
  if (typeof origin === "string" && origin.trim() && isOriginAllowed(origin, options.allowedOrigins)) {
    response.setHeader("Access-Control-Allow-Origin", origin.trim());
  }
}

export default applyCors;
