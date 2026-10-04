export const CANCEL_CHANNELS = [
  { id: "web", label: "서비스 웹·앱" },
  { id: "google_play", label: "Google Play" },
  { id: "app_store", label: "App Store" },
  { id: "card_autopay", label: "카드 자동납부" },
  { id: "carrier", label: "휴대폰 요금" },
];

// subscriptions.payment_channel에 저장할 수 있는 값. DB check 제약과 같아야 한다.
export const PAYMENT_CHANNEL_IDS = CANCEL_CHANNELS.map((channel) => channel.id);

