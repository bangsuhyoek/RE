const AUTH_TIMEOUT_MS = 3_000;

export const verifySupabaseAuth = async (authHeader) => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    const err = new Error("Supabase auth not configured");
    err.code = "AGENT_AUTH_NOT_CONFIGURED";
    throw err;
  }

  if (!authHeader || typeof authHeader !== "string") {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  if (!token) return null;

  const authController = new AbortController();
  const timer = setTimeout(() => authController.abort(), AUTH_TIMEOUT_MS);
  try {
    const endpoint = supabaseUrl.replace(/\/+$/, "") + "/auth/v1/user";
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      signal: authController.signal,
    });

    if (!res.ok) {
      return null;
    }

    const userData = await res.json().catch(() => null);
    if (!userData?.id) {
      return null;
    }
    return userData.id;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};
