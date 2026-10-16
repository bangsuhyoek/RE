
import { getApiEndpoint } from "./apiBase";
import { supabase } from "./supabase";

/**
 * 규칙으로 해석하지 못한 문장만 서버의 Gemini 해석기에 보낸다.
 * 게스트 사용자이거나 Supabase 세션이 없으면 서버를 부르지 않고 즉시 null을 반환한다.
 * 실패하면 null을 돌려주고, 화면은 규칙 기반 결과(다시 말해 달라는 안내)를 그대로 쓴다.
 */
export async function interpretWithAi(text, subscriptions = []) {
  if (!supabase?.auth) return null;

  let session = null;
  try {
    const sessionRes = await supabase.auth.getSession();
    session = sessionRes?.data?.session;
  } catch {
    return null;
  }

  const token = session?.access_token;
  if (!token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(getApiEndpoint("/api/agent"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text,
        services: subscriptions.map((subscription) => ({
          id: subscription.subscriptionId || subscription.id,
          name: subscription.name,
        })),
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) return null;
    return { intent: payload.intent, subscriptionId: payload.subscriptionId };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
