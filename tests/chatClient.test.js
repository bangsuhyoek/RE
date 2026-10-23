import test from "node:test";
import assert from "node:assert/strict";
import {
  buildChatSnapshot,
  createSSEParser,
  formatMessagesForServer,
  getAuthToken,
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
  MAX_PERSISTED_MESSAGES,
} from "../src/lib/chatClient.js";

test("buildChatSnapshot: annual plans, sharing personal share, no card numbers, cancelled included with status", () => {
  const refDate = new Date(2026, 9, 18);
  const subs = [
    {
      subscriptionId: "sub-1",
      name: "넷플릭스",
      serviceId: "netflix",
      category: "엔터테인먼트",
      plan: "프리미엄",
      amount: 4250,
      grossAmount: 17000,
      sharingEnabled: true,
      shareCount: 4,
      dueDay: 25,
      billingCycle: "매월",
      paymentMethod: "신한카드 ****4521",
      status: "active",
      alertD3: true,
      alertD1: false,
    },
    {
      subscriptionId: "sub-2",
      name: "쿠팡 와우 연간",
      serviceId: "coupang",
      amount: 58900,
      grossAmount: 58900,
      billingCycle: "매년",
      nextBillingDate: "2027-01-15",
      dueDay: 15,
      paymentMethod: "KB국민카드 • 8831",
      status: "active",
      alertD3: true,
      alertD1: true,
    },
    {
      subscriptionId: "sub-3",
      name: "웨이브",
      serviceId: "wavve",
      amount: 7900,
      billingCycle: "매월",
      dueDay: 10,
      paymentMethod: "1234-5678-9999-0000",
      status: "cancelled",
      alertD3: false,
      alertD1: false,
    },
    {
      subscriptionId: "sub-4",
      name: "유튜브 프리미엄 무료체험",
      serviceId: "youtube",
      amount: 0,
      billingCycle: "매월",
      dueDay: 20,
      paymentMethod: "카카오페이",
      status: "trial",
      isTrial: true,
      trialEndDate: "2026-10-20",
      alertD3: true,
      alertD1: true,
    },
  ];
  const snapshot = buildChatSnapshot(subs, refDate);
  assert.equal(snapshot.today, "2026-10-18");
  assert.equal(snapshot.subscriptions.length, 4);
  const netflix = snapshot.subscriptions[0];
  assert.equal(netflix.name, "넷플릭스");
  assert.equal(netflix.amount, 4250);
  assert.equal(netflix.grossAmount, 17000);
  assert.equal(netflix.billingCycle, "매월");
  assert.equal(netflix.nextChargeDate, "2026-10-25");
  assert.equal(netflix.paymentMethod, "신한카드");
  assert.equal(netflix.status, "active");
  const coupang = snapshot.subscriptions[1];
  assert.equal(coupang.billingCycle, "매년");
  assert.equal(coupang.nextChargeDate, "2027-01-15");
  assert.equal(coupang.paymentMethod, "KB국민카드");
  assert.equal(coupang.status, "active");
  const wavve = snapshot.subscriptions[2];
  assert.equal(wavve.status, "cancelled");
  assert.equal(wavve.nextChargeDate, null);
  assert.ok(!/\d{4}/.test(wavve.paymentMethod));
  const youtube = snapshot.subscriptions[3];
  assert.equal(youtube.status, "trial");
  assert.equal(youtube.paymentMethod, "카카오페이");
  assert.equal(youtube.trialEndDate, "2026-10-20");
});

test("createSSEParser: handles split chunks across multiple boundaries and CRLF/LF", () => {
  const events = [];
  const parser = createSSEParser((ev) => events.push(ev));
  parser("eve");
  parser("nt: tool\r\ndata: {\"name\":\"calc\",\"label\":\"계산 중\"}\r\n\r\n");
  parser("event: delta\ndata: {\"te");
  parser("xt\":\"넷플릭스와 디즈니 플러");
  parser("스 합계는 26,900원이에요.\"}\n\n");
  parser("event: action\r\ndata: {\"id\":\"act-1\",\"type\":\"add_subscription\",\"payload\":{\"name\":\"디즈니+\",\"amount\":9900},\"summary\":\"디즈니+ 추가\"}\r\n\r\n");
  parser("event: done\ndata: {}\n\n");
  assert.equal(events.length, 4);
  assert.equal(events[0].event, "tool");
  assert.deepEqual(events[0].data, { name: "calc", label: "계산 중" });
  assert.equal(events[1].event, "delta");
  assert.equal(events[1].data.text, "넷플릭스와 디즈니 플러스 합계는 26,900원이에요.");
  assert.equal(events[2].event, "action");
  assert.equal(events[2].data.type, "add_subscription");
  assert.equal(events[3].event, "done");
});

test("formatMessagesForServer: limits to last 12 messages and <= 1000 chars per message", () => {
  const input = [];
  for (let i = 0; i < 20; i++) {
    input.push({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "msg " + i + ": " + "a".repeat(1200),
    });
  }
  const formatted = formatMessagesForServer(input);
  assert.equal(formatted.length, 12);
  for (const m of formatted) {
    assert.ok(m.content.length <= 1000);
    assert.ok(m.role === "user" || m.role === "assistant");
  }
});

test("History persistence: localStorage capping to 30 messages and clearing", () => {
  const mockStore = {};
  globalThis.window = {
    localStorage: {
      getItem: (k) => mockStore[k] ?? null,
      setItem: (k, v) => { mockStore[k] = String(v); },
      removeItem: (k) => { delete mockStore[k]; },
    },
  };
  const userId = "user-123";
  const messages = [];
  for (let i = 0; i < 45; i++) {
    messages.push({ id: "m-" + i, role: i % 2 === 0 ? "user" : "assistant", text: "Message " + i });
  }
  saveChatHistory(userId, messages);
  const loaded = loadChatHistory(userId);
  assert.equal(loaded.length, MAX_PERSISTED_MESSAGES);
  assert.equal(loaded[0].id, "m-15");
  assert.equal(loaded[29].id, "m-44");
  clearChatHistory(userId);
  assert.equal(loadChatHistory(userId).length, 0);
});

test("getAuthToken: returns null when there is no session even when window exists", async () => {
  // Ensure window is defined (simulating browser environment)
  globalThis.window = globalThis.window || {};

  // 1. When session is null
  const mockEmptySessionGetter = async () => ({ data: { session: null }, error: null });
  const tokenNoSession = await getAuthToken(mockEmptySessionGetter);
  assert.equal(tokenNoSession, null);

  // 2. When mock client object without session is passed
  const mockEmptyClient = { auth: { getSession: async () => ({ data: { session: null } }) } };
  const tokenClientEmpty = await getAuthToken(mockEmptyClient);
  assert.equal(tokenClientEmpty, null);

  // 3. When session throws an error
  const mockErrorGetter = async () => { throw new Error("network fail"); };
  const tokenError = await getAuthToken(mockErrorGetter);
  assert.equal(tokenError, null);

  // 4. When valid session exists
  const mockValidSessionGetter = async () => ({
    data: { session: { access_token: "real-supabase-session-token-xyz" } },
  });
  const tokenValid = await getAuthToken(mockValidSessionGetter);
  assert.equal(tokenValid, "real-supabase-session-token-xyz");
});

test("History persistence: preserves captured action.before snapshot across reload", () => {
  const mockStore = {};
  globalThis.window = {
    localStorage: {
      getItem: (k) => mockStore[k] ?? null,
      setItem: (k, v) => { mockStore[k] = String(v); },
      removeItem: (k) => { delete mockStore[k]; },
    },
  };
  const userId = "user-diff-test";
  const messages = [
    {
      id: "a-1",
      role: "assistant",
      text: "구독 정보를 수정할게요.",
      actions: [
        {
          id: "act-1",
          type: "update_subscription",
          payload: {
            subscriptionId: "sub-tving",
            changes: { amount: 17000 },
          },
          before: {
            id: "sub-tving",
            name: "티빙",
            amount: 13500,
            billingCycle: "매월",
            plan: "스탠다드",
          },
          status: "pending",
        },
      ],
    },
  ];

  saveChatHistory(userId, messages);
  const loaded = loadChatHistory(userId);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].actions.length, 1);
  assert.deepEqual(loaded[0].actions[0].before, {
    id: "sub-tving",
    name: "티빙",
    amount: 13500,
    billingCycle: "매월",
    plan: "스탠다드",
  });
});
