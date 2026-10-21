export const createMockSubscriptions = () =>
  (() => {
    const getOffsetDueDay = (offset) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return d.getDate();
    };

    const seeds = [
      {
        id: "netflix",
        name: "Netflix",
        monogram: "N",
        category: "엔터테인먼트",
        plan: "Standard 4K",
        amount: 17000,
        dueDay: getOffsetDueDay(0),
        paymentMethod: "신한카드 ****4521",
        cancelUrl: "https://www.netflix.com/cancelplan",
      },
      {
        id: "spotify",
        name: "Spotify",
        monogram: "S",
        category: "음악",
        plan: "Individual",
        amount: 10900,
        dueDay: getOffsetDueDay(1),
        paymentMethod: "신한카드 ****4521",
        cancelUrl: "https://www.spotify.com/account/cancel/",
      },
      {
        id: "chatgpt",
        name: "ChatGPT Plus",
        monogram: "G",
        category: "생산성",
        plan: "Plus",
        amount: 27000,
        dueDay: getOffsetDueDay(3),
        paymentMethod: "현대카드 ****8821",
        cancelUrl: "https://chatgpt.com/#settings",
      },
      {
        id: "adobe",
        name: "Adobe CC",
        monogram: "A",
        category: "생산성",
        plan: "Photography",
        amount: 14000,
        dueDay: getOffsetDueDay(12),
        paymentMethod: "신한카드 ****4521",
        cancelUrl: "https://account.adobe.com/plans",
      },
      {
        id: "icloud",
        name: "iCloud+",
        monogram: "i",
        category: "클라우드",
        plan: "200GB",
        amount: 1200,
        dueDay: getOffsetDueDay(18),
        paymentMethod: "카카오페이",
        cancelUrl: "https://support.apple.com/HT207594",
      },
    ];

    return seeds.map((service, index) => ({
      ...service,
      subscriptionId: `seed-${service.id}`,
      createdAt: new Date(Date.now() - index * 86_400_000).toISOString(),
      billingCycle: "매월",
      status: "active",
      alertD3: true,
      alertD1: true,
      renewalPending: false,
      isDemo: true,
    }));
  })();

