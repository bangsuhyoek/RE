const sktSeed = ({
  variantId,
  url,
  title,
  targetServiceIds,
  targetPlanHint,
  requiredPlan,
  bundleOptions = [],
  bundleSelectionLimit = null,
  trustedOfferPrice = null,
  promoSignupDeadline = null,
  requiredMembership = null,
  requiredMembershipCost = null,
  extraEvidenceTerms = [],
}) => ({
  variantId,
  url,
  title,
  targetServiceIds,
  categoryHint: "PARTNERSHIP_SAVING",
  targetPlanHint,
  requiredPlan,
  requiredMembership,
  requiredMembershipCost,
  requiredMembershipCostEvidenceUrl: requiredMembershipCost === null ? null : url,
  bundleOptions,
  bundleSelectionLimit,
  actionUrlHint: "https://m.tworld.co.kr/product/mobileplan/join",
  actionRequiresLoginHint: false,
  suppressContextualMembership: true,
  suppressOfferPrice: trustedOfferPrice == null,
  trustedOfferPrice,
  trustedOfferBillingCycle: "MONTHLY",
  trustedAudience: "EXISTING_OR_ALL",
  // The special 0-won signup promotion ends before the carrier plan closes.
  promoSignupDeadline,
  planEnrollmentDeadline: "2027-06-30",
  trustedEndAt: promoSignupDeadline || "2027-06-30",
  requiredEvidenceTerms: [
    requiredPlan,
    "2027년 6월 30일",
    promoSignupDeadline ? "2026년 12월 31일" : null,
    trustedOfferPrice == null ? null : `${trustedOfferPrice.toLocaleString("en-US")}원`,
    ...extraEvidenceTerms,
  ].filter(Boolean),
});

const LGUPLUS_YOUTUBE_PRODUCT_URL =
  "https://www.lguplus.com/pogg/product/%EC%9C%A0%ED%8A%9C%EB%B8%8C-%ED%94%84%EB%A6%AC%EB%AF%B8%EC%97%84-%EC%9C%A0%ED%94%8C%EB%9F%AC%EC%8A%A4-%EC%9A%94%EA%B8%88%EC%A0%9C-%EC%A0%84%EC%9A%A9";

const LGUPLUS_YOUTUBE_PLAN_URL =
  "https://www.lguplus.com/mobile/plan/mplan/5g-all/5g-category/LPZ1008097";
const LGUPLUS_YOUTUBE_GUIDE_URL =
  "https://www.lguplus.com/plan/about-5g/youtube_premium_usage_guide";

function lgUplusPriceReview(requiredPlan, planPrice) {
  const target = {
    product: "YOUTUBE_PREMIUM",
    plan: requiredPlan,
    signupPath: "UDOC_U_PLUS_PLAN_EXCLUSIVE",
    eligibility: "PREMIUM_PACK_ACTIVE_THROUGH_MONTH_END",
    billingStage: "MONTHLY_RENEWAL",
    priceBasis: "FINAL_MONTHLY_ADDITIONAL_CHARGE",
  };
  return {
    target,
    // The live product page names the eligible plans and displays the group
    // charge; the usage guide explains the final monthly bill. Both must be
    // fetched afresh. An indexed amount absent from the live plan is a lead.
    catalogJoin: {
      productUrl: LGUPLUS_YOUTUBE_PRODUCT_URL,
      productTitle: "유튜브 프리미엄 (U+요금제 전용)",
      eligiblePlanTerm: requiredPlan.replace(/^유튜브프리미엄\s*/, ""),
      guideUrl: LGUPLUS_YOUTUBE_GUIDE_URL,
      planUrl: LGUPLUS_YOUTUBE_PLAN_URL,
    },
    knownPlans: [
      "플러스플랜130", "플러스플랜115", "플러스플랜105", "LTE 프리미어 플러스",
    ],
    quotes: [
      {
        // This official search-index price was absent from the live plan body.
        product: target.product,
        plan: requiredPlan,
        signupPath: target.signupPath,
        eligibility: null,
        billingStage: null,
        priceBasis: null,
        amount: planPrice,
        sourceUrl: LGUPLUS_YOUTUBE_PLAN_URL,
        evidenceKind: "SEARCH_INDEX",
        effectiveFrom: null,
        effectiveTo: null,
      },
      {
        product: target.product,
        plan: null, // The public guide does not assign a 5G plan.
        signupPath: target.signupPath,
        eligibility: target.eligibility,
        billingStage: null,
        priceBasis: null,
        amount: 4450,
        sourceUrl: LGUPLUS_YOUTUBE_GUIDE_URL,
        evidenceKind: "PUBLIC_GUIDE_UNSCOPED",
        effectiveFrom: null,
        effectiveTo: null,
      },
    ],
  };
}

const lgUplusYouTubeSeeds = [
  ["lguplus-youtube-유튜브프리미엄-플러스플랜130", "유튜브프리미엄 플러스플랜130", "플러스플랜130", 4000, "OFFICIAL_PRICE_CONTEXT_UNVERIFIED", LGUPLUS_YOUTUBE_PRODUCT_URL],
  ["lguplus-youtube-유튜브프리미엄-플러스플랜115", "유튜브프리미엄 플러스플랜115", "플러스플랜115", 4000, "OFFICIAL_PRICE_CONTEXT_UNVERIFIED", LGUPLUS_YOUTUBE_PRODUCT_URL],
  ["lguplus-youtube-유튜브프리미엄-플러스플랜105", "유튜브프리미엄 플러스플랜105", "플러스플랜105", 6400, "OFFICIAL_PRICE_CONTEXT_UNVERIFIED", LGUPLUS_YOUTUBE_PRODUCT_URL],
  ["lguplus-youtube-lte-프리미어-플러스", "LTE 프리미어 플러스", "LTE 프리미어 플러스", 4450, null, LGUPLUS_YOUTUBE_PRODUCT_URL],
].map(([variantId, requiredPlan, planEvidenceTerm, trustedOfferPrice, trustedBlockReason, url]) => ({
  variantId,
  url,
  title: `LG U+ ${requiredPlan} 유튜브 프리미엄 할인 혜택`,
  targetServiceIds: ["youtube"],
  categoryHint: "PARTNERSHIP_SAVING",
  targetPlanHint: "유튜브 프리미엄",
  requiredPlan,
  suppressContextualMembership: true,
  suppressOfferPrice: Boolean(trustedBlockReason),
  trustedOfferPrice: trustedBlockReason ? null : trustedOfferPrice,
  trustedOfferBillingCycle: "MONTHLY",
  trustedAudience: "EXISTING_OR_ALL",
  trustedBlockReason,
  priceReview: trustedBlockReason ? lgUplusPriceReview(requiredPlan, trustedOfferPrice) : null,
  actionUrlHint: LGUPLUS_YOUTUBE_PRODUCT_URL,
  actionRequiresLoginHint: false,
  preferSourcePageActionEntrypoint: Boolean(trustedBlockReason),
  requiredEvidenceTerms: [
    planEvidenceTerm,
    "유튜브 프리미엄",
    trustedBlockReason ? null : `${trustedOfferPrice.toLocaleString("en-US")}원`,
  ].filter(Boolean),
}));

const NAVERPLUS_STUDENT_URL =
  "https://help.naver.com/service/23168/contents/21044?osType=COMMONOS";
const LGUPLUS_NETFLIX_URL =
  "https://www.lguplus.com/plan/about-5g/netflix_usage_guide";
const KB_NEED_PAY_URL =
  "https://card.kbcard.com/CRD/DVIEW/HCAMCXPRICAC0076?cooperationcode=09800&mainCC=a&solicitorcode=7127000004";
const SHINHAN_HAPPY_URL =
  "https://www.shinhancard.com/pconts/html/card/apply/credit/1200235_2207.html";

const naverplusStudentSeeds = [
  ["naverplus-student-spotify-basic", "spotify", "프리미엄 베이직", "스포티파이"],
  ["naverplus-student-netflix-ad-standard", "netflix", "광고형 스탠다드", "넷플릭스"],
  ["naverplus-student-pc-game-pass", "xbox-gamepass", "PC Game Pass", "PC Game Pass"],
].map(([variantId, serviceId, targetPlanHint, evidenceTerm]) => ({
  variantId,
  url: NAVERPLUS_STUDENT_URL,
  title: `네이버플러스 스튜던트 ${targetPlanHint} 선택 혜택`,
  targetServiceIds: [serviceId],
  categoryHint: "PARTNERSHIP_SAVING",
  targetPlanHint,
  trustedOfferPrice: 0,
  trustedOfferBillingCycle: "MONTHLY",
  trustedAudience: "EXISTING_OR_ALL",
  actionUrlHint: "https://nid.naver.com/membership/my",
  actionRequiresLoginHint: true,
  requiredEvidenceTerms: [evidenceTerm, "스튜던트"],
}));

const lgUplusNetflixSeeds = [
  ["lguplus-netflix-130", "스탠다드", "넷플릭스 플러스플랜130"],
  ["lguplus-netflix-115", "베이직", "넷플릭스 플러스플랜115"],
  ["lguplus-netflix-105", "베이직", "넷플릭스 플러스플랜105"],
].map(([variantId, targetPlanHint, requiredPlan]) => ({
  variantId,
  url: LGUPLUS_NETFLIX_URL,
  title: `LG U+ ${requiredPlan} ${targetPlanHint} 제공 혜택`,
  targetServiceIds: ["netflix"],
  categoryHint: "PARTNERSHIP_SAVING",
  targetPlanHint,
  requiredPlan,
  trustedOfferPrice: 0,
  trustedOfferBillingCycle: "MONTHLY",
  trustedAudience: "EXISTING_OR_ALL",
  actionUrlHint: LGUPLUS_NETFLIX_URL,
  actionRequiresLoginHint: false,
  trustedBlockReason: "DIRECT_ACCOUNT_REGISTRATION_FLOW_UNVERIFIED",
  suppressContextualMembership: true,
  requiredEvidenceTerms: [requiredPlan, targetPlanHint],
}));

const kbNeedPaySeeds = [
  ["kb-need-pay-netflix", "netflix", null, "넷플릭스", "OFFICIAL_SITE_RECURRING_DIRECT_CARD"],
  ["kb-need-pay-youtube", "youtube", null, "유튜브", "OFFICIAL_SITE_RECURRING_DIRECT_CARD"],
  ["kb-need-pay-disney", "disney", null, "디즈니", "OFFICIAL_SITE_RECURRING_DIRECT_CARD"],
  ["kb-need-pay-tving", "tving", null, "티빙", "OFFICIAL_SITE_RECURRING_DIRECT_CARD"],
  ["kb-need-pay-wavve", "wavve", null, "웨이브", "OFFICIAL_SITE_RECURRING_DIRECT_CARD"],
  ["kb-need-pay-spotify", "spotify", null, "스포티파이", "OFFICIAL_SITE_RECURRING_DIRECT_CARD"],
  ["kb-need-pay-naverplus", "naverplus", "네이버플러스 멤버십", "네이버플러스", "OFFICIAL_SITE_OR_NAVER_PAY"],
].map(([variantId, serviceId, targetPlanHint, evidenceTerm, eligiblePaymentChannel]) => ({
  variantId,
  url: KB_NEED_PAY_URL,
  title: `KB NEED Pay 카드 ${evidenceTerm} 30% 할인`,
  targetServiceIds: [serviceId],
  categoryHint: "PARTNERSHIP_SAVING",
  targetPlanHint,
  trustedAudience: "EXISTING_OR_ALL",
  trustedOfferBillingCycle: "MONTHLY",
  suppressContextualMembership: true,
  suppressOfferPrice: true,
  discountRate: 30,
  perTransactionCap: 3000,
  monthlyDiscountCap: 5000,
  priorMonthSpendRequirement: 400000,
  eligiblePaymentChannel,
  actionUrlHint: KB_NEED_PAY_URL,
  actionRequiresLoginHint: false,
  requiredEvidenceTerms: [evidenceTerm, "30%", "5천원"],
}));

const shinhanHappySeeds = [
  ["shinhan-happy-netflix", "netflix", null, "넷플릭스", 50, null, "OFFICIAL_SITE_RECURRING_DIRECT"],
  ["shinhan-happy-youtube", "youtube", null, "유튜브", 50, null, "OFFICIAL_SITE_RECURRING_DIRECT"],
  ["shinhan-happy-naverplus", "naverplus", "네이버플러스 멤버십", "네이버", null, 3000, "OFFICIAL_SITE_OR_APP_DIRECT"],
].map(([
  variantId,
  serviceId,
  targetPlanHint,
  evidenceTerm,
  discountRate,
  fixedDiscountAmount,
  eligiblePaymentChannel,
]) => ({
  variantId,
  url: SHINHAN_HAPPY_URL,
  title: `신한카드 국민행복 ${evidenceTerm} 할인`,
  targetServiceIds: [serviceId],
  categoryHint: "PARTNERSHIP_SAVING",
  targetPlanHint,
  trustedAudience: "EXISTING_OR_ALL",
  trustedOfferBillingCycle: "MONTHLY",
  suppressContextualMembership: true,
  suppressOfferPrice: true,
  discountRate,
  fixedDiscountAmount,
  perTransactionCap: serviceId === "naverplus" ? 3000 : 5000,
  monthlyDiscountCap: 10000,
  monthlyDiscountCapScope: "CARD_INTEGRATED",
  monthlyTransactionLimit: 1,
  priorMonthSpendRequirement: 300000,
  eligiblePaymentChannel,
  actionUrlHint: SHINHAN_HAPPY_URL,
  actionRequiresLoginHint: false,
  preferSourcePageActionEntrypoint: true,
  requiredEvidenceTerms: serviceId === "naverplus"
    ? [evidenceTerm, "3천원"]
    : [evidenceTerm, "50%", "5천원"],
}));

const sktSeeds = [
  sktSeed({
    variantId: "skt-youtube-best109",
    promoSignupDeadline: "2026-12-31",
    url: "https://m.tworld.co.kr/product/callplan?prod_id=NA00009801",
    title: "SKT 베스트 109 유튜브 프리미엄 할인 혜택",
    targetServiceIds: ["youtube"],
    targetPlanHint: "유튜브 프리미엄 또는 유튜브 프리미엄 라이트",
    requiredPlan: "베스트 109(유튜브 프리미엄)",
  }),
  sktSeed({
    variantId: "skt-youtube-bestpro",
    promoSignupDeadline: "2026-12-31",
    url: "https://m.tworld.co.kr/product/callplan?prod_id=NA00009814",
    title: "SKT 베스트 Pro 유튜브 프리미엄 + 추가 OTT 할인 혜택",
    targetServiceIds: ["youtube"],
    targetPlanHint: null,
    requiredPlan: "베스트 Pro(유튜브 프리미엄)",
    bundleOptions: ["넷플릭스", "티빙", "디즈니+", "웨이브"],
    bundleSelectionLimit: 1,
  }),
  sktSeed({
    variantId: "skt-youtube-bestmax",
    promoSignupDeadline: "2026-12-31",
    url: "https://m.tworld.co.kr/product/callplan?prod_id=NA00009814",
    title: "SKT 베스트 Max 유튜브 프리미엄 + 추가 OTT 할인 혜택",
    targetServiceIds: ["youtube"],
    targetPlanHint: null,
    requiredPlan: "베스트 Max(유튜브 프리미엄)",
    bundleOptions: ["넷플릭스", "티빙", "디즈니+", "웨이브"],
    bundleSelectionLimit: 1,
  }),
  sktSeed({
    variantId: "skt-youtube-5gx-premium",
    url: "https://m.tworld.co.kr/product/callplan?prod_id=NA00009814",
    title: "SKT 5GX 프리미엄 유튜브 프리미엄 할인 혜택",
    targetServiceIds: ["youtube"],
    targetPlanHint: "유튜브 프리미엄",
    requiredPlan: "5GX 프리미엄(유튜브 프리미엄)",
  }),

  ...[
    ["89", "광고형 스탠다드", [], 3500],
    ["99", "광고형 스탠다드", [], null],
    ["109", "스탠다드", [], null],
    ["Pro", null, ["유튜브 프리미엄", "디즈니+", "티빙", "웨이브"], null],
    ["Max", null, ["유튜브 프리미엄", "디즈니+", "티빙", "웨이브"], null],
  ].map(([tier, targetPlanHint, bundleOptions, trustedOfferPrice]) => sktSeed({
    variantId: `skt-netflix-best${String(tier).toLowerCase()}`,
    // The 89 plan has its own official product page. The 109 page's family
    // table is useful context but cannot replace the exact product source.
    url: tier === "89"
      ? "https://m.tworld.co.kr/product/callplan?prod_id=NA00009793"
      : "https://m.tworld.co.kr/product/callplan?prod_id=NA00009802",
    title: `SKT 베스트 ${tier} 넷플릭스 할인 혜택`,
    targetServiceIds: ["netflix"],
    targetPlanHint,
    requiredPlan: `베스트 ${tier}(넷플릭스)`,
    bundleOptions,
    bundleSelectionLimit: bundleOptions.length ? 1 : null,
    trustedOfferPrice,
    // The 3,500-won offer price is already the billed T universe Netflix
    // subscription cost for this scoped lowest-price option. No second
    // membership charge is added on top of that price.
    requiredMembership: tier === "89" ? "T 우주 ‘Netflix’ 가입" : null,
    requiredMembershipCost: tier === "89" ? 0 : null,
    extraEvidenceTerms: tier === "89"
      ? ["T 우주 ‘Netflix’ 가입 시", "이 혜택 적용 후 고객님께 청구되는 이용요금은 T 우주 구독 상품의 구독 요금"]
      : [],
  })),

  ...[
    ["89", "스탠다드", [], 4950],
    ["99", "스탠다드", [], null],
    ["109", "프리미엄", [], null],
    ["Pro", null, ["유튜브 프리미엄", "넷플릭스", "티빙", "웨이브"], null],
    ["Max", null, ["유튜브 프리미엄", "넷플릭스", "티빙", "웨이브"], null],
  ].map(([tier, targetPlanHint, bundleOptions, trustedOfferPrice]) => sktSeed({
    variantId: `skt-disney-best${String(tier).toLowerCase()}`,
    url: "https://m.tworld.co.kr/product/callplan?prod_id=NA00009803",
    title: `SKT 베스트 ${tier} 디즈니+ 할인 혜택`,
    targetServiceIds: ["disney"],
    targetPlanHint,
    requiredPlan: `베스트 ${tier}(디즈니+)`,
    bundleOptions,
    bundleSelectionLimit: bundleOptions.length ? 1 : null,
    trustedOfferPrice,
  })),

  ...[
    ["89", "티빙&웨이브 광고형", ["Wavve"]],
    ["99", "티빙&웨이브 광고형", ["Wavve"]],
    ["109", "티빙&웨이브 스탠다드", ["Wavve"]],
    ["Pro", null, ["유튜브 프리미엄", "넷플릭스", "디즈니+"]],
    ["Max", null, ["유튜브 프리미엄", "넷플릭스", "디즈니+"]],
  ].map(([tier, targetPlanHint, bundleOptions]) => sktSeed({
    variantId: `skt-tvingwavve-best${String(tier).toLowerCase()}`,
    url: "https://m.tworld.co.kr/product/callplan?prod_id=NA00009817",
    title: `SKT 베스트 ${tier} 티빙&웨이브 할인 혜택`,
    targetServiceIds: ["tving"],
    targetPlanHint,
    requiredPlan: `베스트 ${tier}(티빙&웨이브)`,
    bundleOptions,
    bundleSelectionLimit: bundleOptions.length ? 1 : null,
    trustedOfferPrice: tier === "89" ? 3250 : null,
  })),
];

const BUILT_IN_SOURCES = [
  {
    id: "naverplus-partners",
    partnerType: "MEMBERSHIP",
    partnerId: "naverplus",
    partnerName: "네이버플러스",
    listUrl: "https://help.naver.com/service/23168",
    allowedOrigins: [
      "https://help.naver.com",
      "https://nid.naver.com",
    ],
    contentButtonPrefix: "help-button-",
    contentUrlTemplate: "https://help.naver.com/service/23168/contents/{id}",
    requiredMembership: "naverplus",
    requiredMembershipCostUrl: "https://help.naver.com/service/23168/contents/11764?osType=COMMONOS",
    exclusiveGroupId: "NAVERPLUS_DIGITAL_CONTENT_CHOICE",
    selectionLimit: 1,
    stackable: false,
    seedPages: [
      {
        variantId: "naverplus-spotify-basic",
        url: "https://help.naver.com/service/23168/contents/24788?lang=ko&osType=COMMONOS",
        title: "스포티파이 혜택 안내 및 신청 방법",
        targetServiceIds: ["spotify"],
        categoryHint: "PARTNERSHIP_SAVING",
        targetPlanHint: "프리미엄 베이직",
        requiredEvidenceTerms: ["스포티파이", "프리미엄 베이직"],
        actionUrlHint: "https://nid.naver.com/membership/my?m=viewBenefit",
        actionRequiresLoginHint: true,
        trustedOfferPrice: 0,
        trustedOfferBillingCycle: "MONTHLY",
        trustedAudience: "EXISTING_OR_ALL",
      },
      {
        variantId: "naverplus-netflix-ad-standard",
        url: "https://help.naver.com/service/23168/contents/23881?osType=COMMONOS",
        title: "넷플릭스 혜택 신청 방법",
        targetServiceIds: ["netflix"],
        categoryHint: "PARTNERSHIP_SAVING",
        targetPlanHint: "광고형 스탠다드",
        requiredEvidenceTerms: ["넷플릭스", "광고형 스탠다드"],
        actionUrlHint: "https://nid.naver.com/membership/my?m=viewBenefit",
        actionRequiresLoginHint: true,
        trustedOfferPrice: 0,
        trustedOfferBillingCycle: "MONTHLY",
        trustedAudience: "EXISTING_OR_ALL",
      },
      {
        variantId: "naverplus-netflix-standard-upgrade",
        url: "https://help.naver.com/service/23168/contents/23782?osType=COMMONOS",
        title: "넷플릭스 스탠다드 이용권 업그레이드 방법",
        targetServiceIds: ["netflix"],
        categoryHint: "PARTNERSHIP_SAVING",
        targetPlanHint: "스탠다드",
        requiredEvidenceTerms: ["넷플릭스", "스탠다드", "6,500"],
        actionUrlHint: "https://nid.naver.com/membership/my?m=viewDigital",
        actionRequiresLoginHint: true,
        trustedOfferPrice: 6500,
        trustedOfferBillingCycle: "MONTHLY",
      },
      {
        variantId: "naverplus-netflix-premium-upgrade",
        url: "https://help.naver.com/service/23168/contents/23782?osType=COMMONOS",
        title: "넷플릭스 이용권 업그레이드 방법",
        targetServiceIds: ["netflix"],
        categoryHint: "PARTNERSHIP_SAVING",
        targetPlanHint: "프리미엄",
        requiredEvidenceTerms: ["넷플릭스", "프리미엄"],
        actionUrlHint: "https://nid.naver.com/membership/my?m=viewDigital",
        actionRequiresLoginHint: true,
        trustedOfferPrice: 10000,
        trustedOfferBillingCycle: "MONTHLY",
      },
      {
        variantId: "naverplus-pc-game-pass",
        url: "https://help.naver.com/service/23168/contents/24371?osType=COMMONOS",
        title: "PC Game Pass 혜택 안내 및 이용방법",
        targetServiceIds: ["xbox-gamepass"],
        categoryHint: "PARTNERSHIP_SAVING",
        targetPlanHint: "PC Game Pass",
        requiredEvidenceTerms: ["PC Game Pass"],
        actionUrlHint: "https://nid.naver.com/membership/my",
        actionRequiresLoginHint: true,
        trustedOfferPrice: 0,
        trustedOfferBillingCycle: "MONTHLY",
        trustedAudience: "EXISTING_OR_ALL",
      },
    ],
  },
  {
    id: "naverplus-student",
    partnerType: "MEMBERSHIP",
    partnerId: "naverplus_student",
    partnerName: "네이버플러스 스튜던트",
    listUrl: NAVERPLUS_STUDENT_URL,
    allowedOrigins: [
      "https://help.naver.com",
      "https://nid.naver.com",
    ],
    disableAnchorDiscovery: true,
    requiredMembership: "naverplus_student",
    exclusiveGroupId: "NAVERPLUS_STUDENT_DIGITAL_CONTENT_CHOICE",
    selectionLimit: 1,
    stackable: false,
    seedPages: naverplusStudentSeeds,
  },
  {
    id: "spotify-official-trials",
    partnerType: "SERVICE",
    partnerId: "spotify",
    partnerName: "Spotify",
    listUrl: "https://www.spotify.com/kr-ko/premium/",
    allowedOrigins: [
      "https://www.spotify.com",
    ],
    disableAnchorDiscovery: true,
    seedPages: [
      {
        variantId: "spotify-individual-1m-trial",
        url: "https://www.spotify.com/kr-ko/premium/",
        title: "Spotify Premium 개인 신규가입 1개월 무료체험",
        targetServiceIds: ["spotify"],
        categoryHint: "NEW_USER_FREE_TRIAL",
        targetPlanHint: "개인",
        trustedAudience: "NEW",
        trustedOfferBillingCycle: "MONTHLY",
        requiredEvidenceTerms: ["₩0에 1개월 동안 Premium 개인", "11,990"],
        trustedBlockReason: "SPOTIFY_PAYMENT_METHOD_DEPENDENT_TRIAL_COST",
      },
      {
        variantId: "spotify-student-1m-trial",
        url: "https://www.spotify.com/kr-ko/student/",
        title: "Spotify Premium 학생 신규가입 1개월 무료체험",
        targetServiceIds: ["spotify"],
        categoryHint: "NEW_USER_FREE_TRIAL",
        targetPlanHint: "학생",
        trustedAudience: "NEW",
        trustedOfferBillingCycle: "MONTHLY",
        requiredEvidenceTerms: ["학생은 1개월 동안 무료", "6,600"],
        // The student page's Premium 가입 link enters student verification.
        // It must be present in the live DOM; a generic signup URL cannot
        // stand in for the student-specific authentication boundary.
        actionUrlHint: "https://www.spotify.com/kr-ko/student/verification/",
        preferredPlanActionUrl: "https://www.spotify.com/kr-ko/student/verification/",
        actionRequiresLoginHint: true,
      },
    ],
  },
  {
    id: "disney-bundles",
    partnerType: "PLATFORM_BUNDLE",
    partnerId: "disney_bundle",
    partnerName: "Disney+ Bundle",
    listUrl: "https://www.disneyplus.com/ko-kr",
    allowedOrigins: [
      "https://www.disneyplus.com",
    ],
    disableAnchorDiscovery: true,
    seedPages: [
      {
        variantId: "disney-tving-bundle",
        url: "https://www.disneyplus.com/ko-kr",
        title: "디즈니+·티빙 스탠다드 번들 할인 혜택",
        targetServiceIds: ["disney"],
        categoryHint: "PARTNERSHIP_SAVING",
        targetPlanHint: "디즈니+·티빙 스탠다드 번들",
        requiredEvidenceTerms: ["디즈니+", "티빙", "18,000"],
        trustedOfferPrice: 18000,
        trustedOfferBillingCycle: "MONTHLY",
        trustedAudience: "EXISTING_OR_ALL",
        actionUrlHint: "https://www.disneyplus.com/ko-kr",
        actionRequiresLoginHint: false,
        preferSourcePageActionEntrypoint: true,
      },
      {
        variantId: "disney-tving-wavve-bundle",
        url: "https://www.disneyplus.com/ko-kr",
        title: "디즈니+·티빙·웨이브 스탠다드 번들 할인 혜택",
        targetServiceIds: ["disney"],
        categoryHint: "PARTNERSHIP_SAVING",
        targetPlanHint: "디즈니+·티빙·웨이브 스탠다드 번들",
        requiredEvidenceTerms: ["디즈니+", "티빙", "웨이브", "21,500"],
        trustedOfferPrice: 21500,
        trustedOfferBillingCycle: "MONTHLY",
        trustedAudience: "EXISTING_OR_ALL",
        actionUrlHint: "https://www.disneyplus.com/ko-kr",
        actionRequiresLoginHint: false,
        preferSourcePageActionEntrypoint: true,
      },
    ],
  },
  {
    id: "skt-subscriptions",
    partnerType: "CARRIER",
    partnerId: "skt",
    partnerName: "SKT",
    listUrl: "https://www.tworld.co.kr/web/benefits/benefits-list",
    allowedOrigins: [
      "https://www.tworld.co.kr",
      "https://m.tworld.co.kr",
      "https://shop.tworld.co.kr",
      "https://m.sktuniverse.co.kr",
    ],
    requiredCarrier: "SKT",
    seedPages: sktSeeds,
  },
  {
    id: "kt-choice-bundles",
    partnerType: "CARRIER",
    partnerId: "kt",
    partnerName: "KT",
    listUrl: "https://product.kt.com/wDic/productDetail.do?ItemCode=1681",
    allowedOrigins: [
      "https://product.kt.com",
      "https://m.product.kt.com",
      "https://m.my.kt.com",
    ],
    disableAnchorDiscovery: true,
    requiredCarrier: "KT",
    seedPages: [
      ...[
        ["130", "스탠다드", "넷플릭스 스탠다드", "PL25BD669"],
        ["110", "광고형 스탠다드", "넷플릭스 광고형 스탠다드", "PL2649754"],
        ["90", "광고형 스탠다드", "넷플릭스 광고형 스탠다드", "PL2649755"],
      ].map(([tier, targetPlanHint, targetPlanEvidence, planCode]) => ({
        variantId: `kt-netflix-초이스${tier}`,
        url: "https://m.product.kt.com/static/prodetail/1683/mobile/m_htmlUploadType_20260803085219.html",
        title: `KT 초이스${tier} 넷플릭스 제공 혜택`,
        targetServiceIds: ["netflix"],
        categoryHint: "PARTNERSHIP_SAVING",
        targetPlanHint,
        requiredPlan: `초이스${tier}`,
        requiredEvidenceTerms: [`초이스${tier}`, targetPlanEvidence],
        actionUrlHint: "https://product.kt.com/wDic/simple/mNetflix.do",
        preferredPlanActionUrl: `https://m.my.kt.com/product/s_MobilePriceView.do?ctgryProd=${planCode}`,
        actionRequiresLoginHint: true,
        suppressContextualMembership: true,
        trustedOfferPrice: 0,
        trustedOfferBillingCycle: "MONTHLY",
        trustedAudience: "EXISTING_OR_ALL",
      })),
      ...[["130", "PL25BD667"], ["110", "PL2649753"], ["90", "PL2649752"]].map(([tier, planCode]) => ({
        variantId: `kt-youtube-choice${tier}`,
        url: "https://m.product.kt.com/static/prodetail/1684/mobile/m_htmlUploadType_20260729150106.html",
        title: `KT 초이스${tier} 유튜브 프리미엄 라이트 제공 혜택`,
        targetServiceIds: ["youtube"],
        categoryHint: "PARTNERSHIP_SAVING",
        targetPlanHint: "유튜브 프리미엄 라이트",
        requiredPlan: `초이스${tier}`,
        requiredEvidenceTerms: [`초이스${tier}`, "유튜브 프리미엄 라이트"],
        actionUrlHint: "https://m.product.kt.com/static/prodetail/1684/mobile/m_htmlUploadType_20260729150106.html",
        preferredPlanActionUrl: `https://m.my.kt.com/product/s_MobilePriceView.do?ctgryProd=${planCode}`,
        actionRequiresLoginHint: true,
        suppressContextualMembership: true,
        suppressOfferPrice: true,
      })),
      ...[["130", "PL25BD671"], ["110", "PL2649749"], ["90", "PL2649748"]].map(([tier, planCode]) => ({
        variantId: `kt-disney-초이스${tier}`,
        url: "https://m.product.kt.com/static/prodetail/1685/mobile/m_htmlUploadType_20260729150132.html",
        title: `KT 초이스${tier} 디즈니+ 스탠다드 제공 혜택`,
        targetServiceIds: ["disney"],
        categoryHint: "PARTNERSHIP_SAVING",
        targetPlanHint: "스탠다드",
        requiredPlan: `초이스${tier}`,
        requiredEvidenceTerms: [`초이스${tier}`, "디즈니+ 스탠다드"],
        actionUrlHint: "https://product.kt.com/wDic/productDetail.do?ItemCode=1685",
        preferredPlanActionUrl: `https://m.my.kt.com/product/s_MobilePriceView.do?ctgryProd=${planCode}`,
        actionRequiresLoginHint: true,
        suppressContextualMembership: true,
        trustedOfferPrice: 0,
        trustedOfferBillingCycle: "MONTHLY",
        trustedAudience: "EXISTING_OR_ALL",
      })),
    ],
  },
  {
    id: "lguplus-youtube",
    partnerType: "CARRIER",
    partnerId: "lguplus",
    partnerName: "LG U+",
    listUrl: LGUPLUS_YOUTUBE_PRODUCT_URL,
    allowedOrigins: [
      "https://www.lguplus.com",
      "https://m.lguplus.com",
    ],
    disableAnchorDiscovery: true,
    requiredCarrier: "LG U+",
    seedPages: lgUplusYouTubeSeeds,
  },
  {
    id: "lguplus-netflix",
    partnerType: "CARRIER",
    partnerId: "lguplus",
    partnerName: "LG U+",
    listUrl: LGUPLUS_NETFLIX_URL,
    allowedOrigins: [
      "https://www.lguplus.com",
      "https://m.lguplus.com",
    ],
    disableAnchorDiscovery: true,
    requiredCarrier: "LG U+",
    seedPages: lgUplusNetflixSeeds,
  },
  {
    id: "kb-need-pay",
    partnerType: "CARD",
    partnerId: "kbcard",
    partnerName: "KB국민카드",
    listUrl: KB_NEED_PAY_URL,
    allowedOrigins: ["https://card.kbcard.com"],
    disableAnchorDiscovery: true,
    requiredCard: "KB NEED Pay 카드",
    seedPages: kbNeedPaySeeds,
  },
  {
    id: "shinhan-happy",
    partnerType: "CARD",
    partnerId: "shinhancard",
    partnerName: "신한카드",
    listUrl: SHINHAN_HAPPY_URL,
    allowedOrigins: ["https://www.shinhancard.com"],
    disableAnchorDiscovery: true,
    requiredCard: "신한카드 국민행복",
    seedPages: shinhanHappySeeds,
  },
  {
    id: "apple-official-trials",
    partnerType: "SERVICE",
    partnerId: "apple",
    partnerName: "Apple",
    listUrl: "https://www.apple.com/kr/apple-music/",
    allowedOrigins: [
      "https://www.apple.com",
    ],
    disableAnchorDiscovery: true,
    seedPages: [
      {
        variantId: "applemusic-individual-1m-trial",
        partnerId: "applemusic",
        partnerName: "Apple Music",
        url: "https://www.apple.com/kr/apple-music/",
        title: "Apple Music 개인 신규 구독자 첫 1개월 무료",
        targetServiceIds: ["applemusic"],
        categoryHint: "NEW_USER_FREE_TRIAL",
        targetPlanHint: "개인",
        requiredEvidenceTerms: ["신규 구독자는 첫 1개월 무료", "₩8,900/월"],
        actionUrlHint: "https://music.apple.com/subscribe?itscg=10000&itsct=music_overview_nav",
        actionRequiresLoginHint: false,
      },
      {
        variantId: "appletv-7d-trial",
        partnerId: "appletv",
        partnerName: "Apple TV",
        url: "https://www.apple.com/kr/apple-tv/",
        title: "Apple TV 신규 및 조건 충족 재구독자 7일 무료 체험",
        targetServiceIds: ["appletv"],
        categoryHint: "NEW_USER_FREE_TRIAL",
        targetPlanHint: "Apple TV",
        requiredEvidenceTerms: ["7일 무료 체험", "₩6,500/월", "신규 구독자 및 조건에 부합하는 재구독자"],
        actionUrlHint: "https://tv.apple.com/kr/channel/tvs.sbd.4000?itscg=10000&itsct=atv-tv_op-nav_try-var-210111",
        actionRequiresLoginHint: false,
      },
    ],
  },
];

function isValidSource(source) {
  if (!source?.id || !source?.listUrl) return false;
  try {
    const url = new URL(source.listUrl);
    return (
      url.protocol === "https:" &&
      Array.isArray(source.allowedOrigins) &&
      source.allowedOrigins.includes(url.origin)
    );
  } catch {
    return false;
  }
}

export function getOfficialBenefitSources(env = process.env) {
  const configured = env.BENEFIT_DISCOVERY_SOURCES_JSON;
  if (!configured) return BUILT_IN_SOURCES;

  try {
    const parsed = JSON.parse(configured);
    if (!Array.isArray(parsed)) throw new Error("Expected an array");
    const valid = parsed.filter(isValidSource);
    return valid.length > 0 ? valid : BUILT_IN_SOURCES;
  } catch (error) {
    console.warn(
      "[BenefitDiscovery] Invalid BENEFIT_DISCOVERY_SOURCES_JSON:",
      error.message
    );
    return BUILT_IN_SOURCES;
  }
}

export const OFFICIAL_BENEFIT_SOURCES = BUILT_IN_SOURCES;
