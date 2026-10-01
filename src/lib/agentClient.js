import { getApiEndpoint } from "./apiBase";

/**
 * 규칙으로 해석하지 못한 문장만 서버의 Gemini 해석기에 보낸다.
 * 실패하면 null을 돌려주고, 화면은 규칙 기반 결과(다시 말해 달라는 안내)를 그대로 쓴다.
 */
export async function interpretWithAi(text, subscriptions = []) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(getApiEndpoint("/api/agent"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

