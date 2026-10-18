export const CANCEL_POLICY_TYPES = ["period_end", "immediate_prorated", "immediate_loss", "contract_penalty"];

export const CANCEL_POLICIES = {
  "netflix": {
    cancelType: "period_end",
    summary: "해지해도 이번 결제 주기가 끝날 때까지 시청할 수 있어요.",
    sourceUrl: "https://help.netflix.com/ko/node/407",
    checkedAt: "2026-10-16"
  },
  "youtube": {
    cancelType: "period_end",
    summary: "해지해도 결제일까지 유지되며, 고객센터를 통해 중도해지도 가능해요.",
    sourceUrl: "https://support.google.com/youtube/answer/6308278?hl=ko",
    checkedAt: "2026-10-16"
  },
  "ytmusic": {
    cancelType: "period_end",
    summary: "해지해도 결제일까지 유지되며, 고객센터를 통해 중도해지도 가능해요.",
    sourceUrl: "https://support.google.com/youtube/answer/6308278?hl=ko",
    checkedAt: "2026-10-16"
  },
  "disney": {
    cancelType: "period_end",
    summary: "해지해도 현재 결제 기간이 끝날 때까지 이용할 수 있어요.",
    sourceUrl: "https://help.disneyplus.com/ko/article/disneyplus-cancel",
    checkedAt: "2026-10-16"
  },
  "tving": {
    cancelType: "period_end",
    summary: "해지해도 현재 이용 기간 만료일까지 시청할 수 있어요.",
    sourceUrl: "https://www.tving.com/help/faq",
    checkedAt: "2026-10-16"
  },
  "wavve": {
    cancelType: "period_end",
    summary: "자동결제 해지 시 남은 이용 기간까지 시청할 수 있어요.",
    sourceUrl: "https://www.wavve.com/customer/faq?faqId=3872",
    checkedAt: "2026-10-16"
  },
  "coupang": {
    cancelType: "period_end",
    headline: "혜택을 안 썼다면 해지 시 전액 환불돼요",
    summary: "당월 혜택 미사용 시 전액 환불, 사용 시 결제 기간까지 유지돼요.",
    sourceUrl: "https://news.coupang.com/archives/64216/",
    checkedAt: "2026-10-16"
  },
  "coupangplay": {
    cancelType: "period_end",
    headline: "혜택을 안 썼다면 해지 시 전액 환불돼요",
    summary: "와우 멤버십을 해지해도 남은 멤버십 기간까지 시청할 수 있어요.",
    sourceUrl: "https://play.coupang.com/faq",
    checkedAt: "2026-10-16"
  },
  "naverplus": {
    cancelType: "period_end",
    headline: "혜택 미이용 시 즉시 종료하고 환불받을 수 있어요",
    summary: "정기결제 해지 시 이번 회차 마지막 날까지 혜택이 유지돼요.",
    sourceUrl: "https://help.naver.com/service/23168/contents/13775",
    checkedAt: "2026-10-16"
  },
  "watcha": {
    cancelType: "period_end",
    summary: "해지해도 남은 이용 기간이 끝날 때까지 계속 감상할 수 있어요.",
    sourceUrl: "https://help.watcha.com/hc/ko/articles/31326576396825",
    checkedAt: "2026-10-16"
  },
  "spotify": {
    cancelType: "period_end",
    summary: "해지해도 다음 청구일까지 이용 후 무료 플랜으로 바뀌어요.",
    sourceUrl: "https://support.spotify.com/kr-ko/article/cancel-premium/",
    checkedAt: "2026-10-16"
  },
  "melon": {
    cancelType: "period_end",
    summary: "해지 예약 시 만료일까지 유지되며, 중도해지 시 즉시 종료 및 환불돼요.",
    sourceUrl: "https://help.melon.com/web/faq/content.htm?faqId=2212",
    checkedAt: "2026-10-16"
  },
  "genie": {
    cancelType: "period_end",
    summary: "해지 신청해도 현재 이용권 만료일까지 음악을 들을 수 있어요.",
    sourceUrl: "https://www.genie.co.kr/support/service/helpView?ct=6",
    checkedAt: "2026-10-16"
  },
  "bugs": {
    cancelType: "period_end",
    summary: "해지 예약 시 현재 결제된 이용 기간까지 이용할 수 있어요.",
    sourceUrl: "https://music.bugs.co.kr/m/help/nextbugs?category=11",
    checkedAt: "2026-10-16"
  },
  "vibe": {
    cancelType: "period_end",
    summary: "구독 해지 시 현재 회차의 남은 기간 동안 혜택이 유지돼요.",
    sourceUrl: "https://help.naver.com/service/20370/contents/8862",
    checkedAt: "2026-10-16"
  },
  "applemusic": {
    cancelType: "period_end",
    summary: "구독 취소 시 현재 결제 주기가 끝날 때까지 이용할 수 있어요.",
    sourceUrl: "https://support.apple.com/ko-kr/118428",
    checkedAt: "2026-10-16"
  },
  "appletv": {
    cancelType: "period_end",
    summary: "구독 취소해도 현재 결제 기간 만료일까지 시청할 수 있어요.",
    sourceUrl: "https://support.apple.com/ko-kr/118428",
    checkedAt: "2026-10-16"
  },
  "apple-arcade": {
    cancelType: "period_end",
    summary: "구독 취소 후에도 다음 청구일까지 게임을 계속 플레이할 수 있어요.",
    sourceUrl: "https://support.apple.com/ko-kr/118428",
    checkedAt: "2026-10-16"
  },
  "icloud": {
    cancelType: "period_end",
    summary: "다운그레이드해도 현재 청구 주기 종료일까지 용량이 유지돼요.",
    sourceUrl: "https://support.apple.com/ko-kr/108318",
    checkedAt: "2026-10-16"
  },
  "chatgpt": {
    cancelType: "period_end",
    summary: "해지해도 이번 결제 주기가 끝날 때까지 Plus를 쓸 수 있어요.",
    sourceUrl: "https://help.openai.com/en/articles/7232927-how-do-i-cancel-my-chatgpt-plus-subscription",
    checkedAt: "2026-10-16"
  },
  "claude-pro": {
    cancelType: "period_end",
    summary: "해지해도 현재 청구 기간이 끝날 때까지 Pro 기능을 쓸 수 있어요.",
    sourceUrl: "https://support.anthropic.com/en/articles/8325617-how-do-i-cancel-my-paid-claude-subscription",
    checkedAt: "2026-10-16"
  },
  "adobe": {
    cancelType: "contract_penalty",
    summary: "연간 플랜 약정 기간 중도 해지 시 취소 수수료가 청구돼요.",
    sourceUrl: "https://helpx.adobe.com/kr/manage-account/using/creative-cloud-subscription-terms.html",
    checkedAt: "2026-10-16"
  },
  "adobe-lightroom": {
    cancelType: "period_end",
    summary: "월간 플랜 취소 시 결제 주기 끝까지 유료 기능이 유지돼요.",
    sourceUrl: "https://helpx.adobe.com/kr/account/individual/subscriptions-and-plans/renewals-and-cancellations/cancel-adobe-subscription.html",
    checkedAt: "2026-10-16"
  },
  "ms365": {
    cancelType: "period_end",
    summary: "구독 취소 후에도 남은 결제 기간 동안 앱과 용량을 쓸 수 있어요.",
    sourceUrl: "https://support.microsoft.com/ko-kr/accounts-billing/subscriptions/cancel-a-microsoft-365-subscription",
    checkedAt: "2026-10-16"
  },
  "notion": {
    cancelType: "period_end",
    summary: "다운그레이드해도 현재 결제 주기가 끝날 때까지 이용 가능해요.",
    sourceUrl: "https://www.notion.com/help/upgrade-or-downgrade-your-plan",
    checkedAt: "2026-10-16"
  },
  "millie": {
    cancelType: "period_end",
    summary: "해지 신청해도 남은 구독 기간 동안 도서를 계속 읽을 수 있어요.",
    sourceUrl: "https://www.millie.co.kr/v3/customer",
    checkedAt: "2026-10-16"
  },
  "ridiselect": {
    cancelType: "period_end",
    summary: "구독 해지 예약 시 다음 결제 예정일까지 계속 이용할 수 있어요.",
    sourceUrl: "https://ridihelp.ridibooks.com/support/solutions/articles/154000207870--%EC%85%80%EB%A0%89%ED%8A%B8-%EA%B5%AC%EB%8F%85-%EC%9B%94%EC%A0%95%EC%95%A1-%ED%95%B4%EC%A7%80-%EB%B0%A9%EB%B2%95",
    checkedAt: "2026-10-16"
  },
  "laftel": {
    cancelType: "period_end",
    summary: "해지해도 남은 멤버십 만료일까지 애니메이션을 감상할 수 있어요.",
    sourceUrl: "https://help.laftel.net/hc/ko/articles/6011133529231",
    checkedAt: "2026-10-16"
  },
  "google-one": {
    cancelType: "period_end",
    summary: "취소해도 현재 결제 주기가 끝날 때까지 스토리지가 유지돼요.",
    sourceUrl: "https://support.google.com/googleone/answer/9056360?hl=ko",
    checkedAt: "2026-10-16"
  },
  "google-play-pass": {
    cancelType: "period_end",
    summary: "정기 결제를 해지해도 결제 기간 끝까지 혜택을 이용할 수 있어요.",
    sourceUrl: "https://support.google.com/googleplay/answer/7018481?hl=ko",
    checkedAt: "2026-10-16"
  },
  "github-copilot": {
    cancelType: "period_end",
    summary: "취소해도 이번 청구 주기 만료일까지 계속 사용할 수 있어요.",
    sourceUrl: "https://docs.github.com/en/copilot/how-tos/manage-your-account/view-and-change-your-copilot-plan",
    checkedAt: "2026-10-16"
  },
  "kakao-emoticon": {
    cancelType: "period_end",
    summary: "해지 예약 시 다음 정기결제일까지 이모티콘을 이용할 수 있어요.",
    sourceUrl: "https://cs.kakao.com/helps_html/1073199050",
    checkedAt: "2026-10-16"
  },
  "xbox-gamepass": {
    cancelType: "period_end",
    summary: "정기 결제 취소 시 남은 구독 기간 동안 게임을 플레이할 수 있어요.",
    sourceUrl: "https://support.xbox.com/ko-KR/help/subscriptions-billing/manage-subscriptions/cancel-recurring-billing-or-subscription",
    checkedAt: "2026-10-16"
  },
  "ps-plus": {
    cancelType: "period_end",
    summary: "구독 취소 시 이미 결제한 기간 만료일까지 혜택이 유지돼요.",
    sourceUrl: "https://www.playstation.com/ko-kr/support/store/cancel-ps-store-subscription/",
    checkedAt: "2026-10-16"
  },
  "nintendo-online": {
    cancelType: "period_end",
    summary: "자동 갱신을 해제해도 현재 유효기간 끝까지 온라인을 즐길 수 있어요.",
    sourceUrl: "https://support.nintendo.com/kr/switch/nintendo_switch_online/05.html",
    checkedAt: "2026-10-16"
  },
  "figma": {
    cancelType: "period_end",
    summary: "다운그레이드 시 현재 청구 주기 종료 후 Starter로 전환돼요.",
    sourceUrl: "https://help.figma.com/hc/en-us/articles/360046216313-Upgrade-or-downgrade-your-plan",
    checkedAt: "2026-10-16"
  },
  "dropbox": {
    cancelType: "period_end",
    summary: "구독 취소 시 청구 주기가 끝날 때까지 유료 용량이 유지돼요.",
    sourceUrl: "https://help.dropbox.com/ko-kr/plans/downgrade-dropbox-individual-plans",
    checkedAt: "2026-10-16"
  },
  "duolingo": {
    cancelType: "period_end",
    summary: "구독 취소 후에도 결제 주기가 끝날 때까지 Super 혜택이 유지돼요.",
    sourceUrl: "https://support.duolingo.com/hc/ko/articles/115004068043",
    checkedAt: "2026-10-16"
  },
  "midjourney": {
    cancelType: "period_end",
    summary: "구독 취소 시 현재 청구 주기 끝까지 남은 GPU 시간을 쓸 수 있어요.",
    sourceUrl: "https://docs.midjourney.com/hc/en-us/articles/25384024738573-Canceling-Your-Subscription",
    checkedAt: "2026-10-16"
  },
  "cursor-ai": {
    cancelType: "period_end",
    summary: "구독 해지 시 이번 결제 기간이 끝날 때까지 Pro 기능이 유지돼요.",
    sourceUrl: "https://prod.cursor.com/help/account-and-billing/cancel",
    checkedAt: "2026-10-16"
  },
  "slack-pro": {
    cancelType: "period_end",
    summary: "무료 플랜으로 다운그레이드해도 현재 결제 기간까지 유지돼요.",
    sourceUrl: "https://slack.com/intl/ko-kr/help/articles/48764458651795",
    checkedAt: "2026-10-16"
  },
  "zoom-pro": {
    cancelType: "period_end",
    summary: "구독 취소 시 현재 결제 주기가 만료될 때까지 Pro를 쓸 수 있어요.",
    sourceUrl: "https://support.zoom.com/hc/ko/article?id=zm_kb&sysparm_article=KB0066687",
    checkedAt: "2026-10-16"
  },
  "todoist": {
    cancelType: "period_end",
    summary: "구독 취소 시 현재 결제 주기가 끝날 때까지 Pro가 유지돼요.",
    sourceUrl: "https://todoist.com/ko/help/articles/cancel-a-todoist-subscription-08AmJLVkC",
    checkedAt: "2026-10-16"
  },
  "1password": {
    cancelType: "period_end",
    summary: "구독 취소 시 결제 기간 종료일까지 모든 항목에 접근할 수 있어요.",
    sourceUrl: "https://support.1password.com/manage-subscription/",
    checkedAt: "2026-10-16"
  },
  "nordvpn": {
    cancelType: "period_end",
    summary: "자동 갱신을 취소해도 남은 구독 기간 동안 VPN을 이용할 수 있어요.",
    sourceUrl: "https://support.nordvpn.com/hc/ko/articles/19556844985489",
    checkedAt: "2026-10-16"
  },
  "speak": {
    cancelType: "period_end",
    summary: "구독을 취소해도 현재 만료일까지 프리미엄을 계속 쓸 수 있어요.",
    sourceUrl: "https://help.speak.com/ko/articles/5355569",
    checkedAt: "2026-10-16"
  },
  "welaaa": {
    cancelType: "period_end",
    summary: "구독 해지 신청 후에도 만료일까지 오디오북을 들을 수 있어요.",
    sourceUrl: "https://www.welaaa.com/support/faq",
    checkedAt: "2026-10-16"
  },
  "class101": {
    cancelType: "immediate_prorated",
    summary: "중도 해지 시 이용 월수를 차감한 잔여 금액이 환불돼요.",
    sourceUrl: "https://help.class101.tv/classmate/class101-subscription-refund-request",
    checkedAt: "2026-10-16"
  },
  "shinsegae-universe": {
    cancelType: "period_end",
    headline: "혜택 미사용 시 즉시 해지·환불, 사용 시 해지 예약",
    summary: "혜택 미사용 시 전액 환불, 사용 시 결제 기간까지 유지돼요.",
    sourceUrl: "https://www.ssg.com/customer/faqKeywordList.ssg?keyword=%ED%95%B4%EC%A7%80",
    checkedAt: "2026-10-16"
  },
  "grammarly": {
    cancelType: "period_end",
    summary: "구독 취소 시 현재 청구 주기가 끝날 때까지 Pro를 쓸 수 있어요.",
    sourceUrl: "https://support.grammarly.com/hc/en-us/articles/115000090172-How-do-I-cancel-my-subscription",
    checkedAt: "2026-10-16"
  },
  "coursera": {
    cancelType: "period_end",
    summary: "구독 취소 시 현재 결제 주기가 끝날 때까지 수강할 수 있어요.",
    sourceUrl: "https://www.coursera.support/s/article/learner-000001189?language=en_US",
    checkedAt: "2026-10-16"
  }
};

export function getCancelPolicy(serviceId) {
  if (!serviceId || typeof serviceId !== "string") {
    return null;
  }
  return CANCEL_POLICIES[serviceId] || null;
}

