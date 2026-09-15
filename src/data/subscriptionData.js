const dayAfterToday = () => {
  const now = new Date();
  const lastDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.min(now.getDate() + 1, lastDate);
};

export const serviceCatalog = [
  {
    "id": "chatgpt",
    "name": "ChatGPT Plus",
    "monogram": "C",
    "category": "SaaS",
    "plan": "ChatGPT Plus",
    "amount": 29000,
    "brandColor": "#10A37F",
    "brandBg": "#E6F6F2",
    "brandText": "#10A37F",
    "availablePlans": [
      {
        "plan": "ChatGPT Plus",
        "amount": 29000
      }
    ],
    "plans": [
      {
        "name": "ChatGPT Plus",
        "amount": 29000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 5,
    "paymentMethod": "KB국민카드 • 8831",
    "cancelUrl": "https://chatgpt.com/#settings/Subscription",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 메뉴",
        "description": "좌측 하단 프로필 > [Settings] 메뉴를 누르세요.",
        "imageUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=320&auto=format&fit=crop&q=80"
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "[Subscription] 탭에서 [Manage]를 클릭합니다.",
        "imageUrl": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=320&auto=format&fit=crop&q=80"
      },
      {
        "stepNumber": 3,
        "title": "플랜 취소",
        "description": "Stripe 결제창에서 [플랜 취소]를 선택하세요.",
        "imageUrl": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=320&auto=format&fit=crop&q=80"
      }
    ],
    "lastUpdated": "2026-09-15T11:20:42.191Z",
    "parseStatus": "PARSED_SUCCESS"
  },
  {
    "id": "claude-pro",
    "name": "Claude Pro",
    "monogram": "C",
    "category": "SaaS",
    "plan": "Claude Pro",
    "amount": 29000,
    "brandColor": "#CC785C",
    "brandBg": "#EEF2FF",
    "brandText": "#CC785C",
    "availablePlans": [
      {
        "plan": "Claude Pro",
        "amount": 29000
      }
    ],
    "plans": [
      {
        "name": "Claude Pro",
        "amount": 29000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://claude.ai/settings/billing",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Claude Pro 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:41.716Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "perplexity-pro",
    "name": "Perplexity Pro",
    "monogram": "P",
    "category": "SaaS",
    "plan": "Perplexity Pro",
    "amount": 27000,
    "brandColor": "#1FB8CD",
    "brandBg": "#EEF2FF",
    "brandText": "#1FB8CD",
    "availablePlans": [
      {
        "plan": "Perplexity Pro",
        "amount": 27000
      }
    ],
    "plans": [
      {
        "name": "Perplexity Pro",
        "amount": 27000,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.perplexity.ai/settings/account",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Perplexity Pro 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:41.608Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "midjourney",
    "name": "Midjourney",
    "monogram": "M",
    "category": "SaaS",
    "plan": "Basic Plan",
    "amount": 14000,
    "brandColor": "#000000",
    "brandBg": "#EEF2FF",
    "brandText": "#000000",
    "availablePlans": [
      {
        "plan": "Basic Plan",
        "amount": 14000
      }
    ],
    "plans": [
      {
        "name": "Basic Plan",
        "amount": 14000,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.midjourney.com/account",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Midjourney 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:41.590Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "runway-gen",
    "name": "Runway Gen-4.5",
    "monogram": "R",
    "category": "SaaS",
    "plan": "Standard Plan",
    "amount": 20000,
    "brandColor": "#000000",
    "brandBg": "#EEF2FF",
    "brandText": "#000000",
    "availablePlans": [
      {
        "plan": "Standard Plan",
        "amount": 20000
      }
    ],
    "plans": [
      {
        "name": "Standard Plan",
        "amount": 20000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://app.runwayml.com/settings/plans",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Runway Gen-4.5 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:41.789Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "v0-vercel",
    "name": "v0 by Vercel",
    "monogram": "v",
    "category": "SaaS",
    "plan": "Premium",
    "amount": 27000,
    "brandColor": "#000000",
    "brandBg": "#EEF2FF",
    "brandText": "#000000",
    "availablePlans": [
      {
        "plan": "Premium",
        "amount": 27000
      }
    ],
    "plans": [
      {
        "name": "Premium",
        "amount": 27000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://v0.dev/chat/settings/billing",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "v0 by Vercel 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:42.248Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "figma",
    "name": "Figma Professional",
    "monogram": "F",
    "category": "SaaS",
    "plan": "Professional",
    "amount": 21000,
    "brandColor": "#F24E1E",
    "brandBg": "#EEF2FF",
    "brandText": "#F24E1E",
    "availablePlans": [
      {
        "plan": "Professional",
        "amount": 21000
      }
    ],
    "plans": [
      {
        "name": "Professional",
        "amount": 21000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.figma.com/settings",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Figma Professional 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:42.347Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "canva",
    "name": "Canva Pro",
    "monogram": "C",
    "category": "SaaS",
    "plan": "Canva Pro",
    "amount": 12900,
    "brandColor": "#00C4CC",
    "brandBg": "#EEF2FF",
    "brandText": "#00C4CC",
    "availablePlans": [
      {
        "plan": "Canva Pro",
        "amount": 12900
      }
    ],
    "plans": [
      {
        "name": "Canva Pro",
        "amount": 12900,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.canva.com/settings/billing-and-teams",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Canva Pro 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:41.617Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "adobe",
    "name": "Adobe Creative Cloud",
    "monogram": "A",
    "category": "SaaS",
    "plan": "모든 앱 (학생 할인)",
    "amount": 26400,
    "brandColor": "#FA0F00",
    "brandBg": "#FFEBEA",
    "brandText": "#FA0F00",
    "availablePlans": [
      {
        "plan": "모든 앱 (학생)",
        "amount": 26400
      },
      {
        "plan": "포토그래피 플랜",
        "amount": 13200
      },
      {
        "plan": "단일 앱",
        "amount": 31900
      },
      {
        "plan": "모든 앱 (일반)",
        "amount": 78100
      }
    ],
    "plans": [
      {
        "name": "모든 앱 (학생)",
        "amount": 26400,
        "billingCycle": "매월",
        "quality": "HD"
      },
      {
        "name": "포토그래피 플랜",
        "amount": 13200,
        "billingCycle": "매월",
        "quality": "HD"
      },
      {
        "name": "단일 앱",
        "amount": 31900,
        "billingCycle": "매월",
        "quality": "HD"
      },
      {
        "name": "모든 앱 (일반)",
        "amount": 78100,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 8,
    "paymentMethod": "신한카드 • 4412",
    "cancelUrl": "https://account.adobe.com/plans",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "계정 로그인",
        "description": "account.adobe.com에 Adobe 계정으로 로그인합니다.",
        "imageUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=320&auto=format&fit=crop&q=80"
      },
      {
        "stepNumber": 2,
        "title": "플랜 관리",
        "description": "내 플랜 카드에서 [플랜 관리]를 선택하세요.",
        "imageUrl": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=320&auto=format&fit=crop&q=80"
      },
      {
        "stepNumber": 3,
        "title": "플랜 취소",
        "description": "[플랜 취소] 버튼을 클릭하여 해지 절차를 완료하세요.",
        "imageUrl": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=320&auto=format&fit=crop&q=80"
      }
    ],
    "lastUpdated": "2026-09-15T11:20:41.611Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "framer",
    "name": "Framer Pro",
    "monogram": "F",
    "category": "SaaS",
    "plan": "Pro",
    "amount": 27000,
    "brandColor": "#0055FF",
    "brandBg": "#EEF2FF",
    "brandText": "#0055FF",
    "availablePlans": [
      {
        "plan": "Pro",
        "amount": 27000
      }
    ],
    "plans": [
      {
        "name": "Pro",
        "amount": 27000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://framer.com/projects",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Framer Pro 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:42.180Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "webflow",
    "name": "Webflow",
    "monogram": "W",
    "category": "SaaS",
    "plan": "CMS Plan",
    "amount": 32000,
    "brandColor": "#4353FF",
    "brandBg": "#EEF2FF",
    "brandText": "#4353FF",
    "availablePlans": [
      {
        "plan": "CMS Plan",
        "amount": 32000
      }
    ],
    "plans": [
      {
        "name": "CMS Plan",
        "amount": 32000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://webflow.com/dashboard/account/plans",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Webflow 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.451Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "cursor-ai",
    "name": "Cursor Pro",
    "monogram": "C",
    "category": "SaaS",
    "plan": "Pro Plan",
    "amount": 27000,
    "brandColor": "#000000",
    "brandBg": "#EEF2FF",
    "brandText": "#000000",
    "availablePlans": [
      {
        "plan": "Pro Plan",
        "amount": 27000
      }
    ],
    "plans": [
      {
        "name": "Pro Plan",
        "amount": 27000,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.cursor.com/settings",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Cursor Pro 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:42.793Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "github-copilot",
    "name": "GitHub Copilot",
    "monogram": "G",
    "category": "SaaS",
    "plan": "Individual",
    "amount": 14000,
    "brandColor": "#181717",
    "brandBg": "#EEF2FF",
    "brandText": "#181717",
    "availablePlans": [
      {
        "plan": "Individual",
        "amount": 14000
      }
    ],
    "plans": [
      {
        "name": "Individual",
        "amount": 14000,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://github.com/settings/billing",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "GitHub Copilot 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:41.622Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "jetbrains-all",
    "name": "JetBrains All Products",
    "monogram": "J",
    "category": "SaaS",
    "plan": "All Products",
    "amount": 37000,
    "brandColor": "#000000",
    "brandBg": "#EEF2FF",
    "brandText": "#000000",
    "availablePlans": [
      {
        "plan": "All Products",
        "amount": 37000
      }
    ],
    "plans": [
      {
        "name": "All Products",
        "amount": 37000,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://account.jetbrains.com/licenses",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "JetBrains All Products 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.115Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "deepl-pro",
    "name": "DeepL Pro",
    "monogram": "D",
    "category": "SaaS",
    "plan": "Starter",
    "amount": 12000,
    "brandColor": "#0F2B46",
    "brandBg": "#EEF2FF",
    "brandText": "#0F2B46",
    "availablePlans": [
      {
        "plan": "Starter",
        "amount": 12000
      }
    ],
    "plans": [
      {
        "name": "Starter",
        "amount": 12000,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.deepl.com/pro-account/subscription",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "DeepL Pro 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:42.103Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "grammarly",
    "name": "Grammarly",
    "monogram": "G",
    "category": "SaaS",
    "plan": "Premium",
    "amount": 16000,
    "brandColor": "#15C39A",
    "brandBg": "#EEF2FF",
    "brandText": "#15C39A",
    "availablePlans": [
      {
        "plan": "Premium",
        "amount": 16000
      }
    ],
    "plans": [
      {
        "name": "Premium",
        "amount": 16000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://account.grammarly.com/subscription",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Grammarly 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.051Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "slack-pro",
    "name": "Slack Pro",
    "monogram": "S",
    "category": "SaaS",
    "plan": "Pro",
    "amount": 11000,
    "brandColor": "#4A154B",
    "brandBg": "#EEF2FF",
    "brandText": "#4A154B",
    "availablePlans": [
      {
        "plan": "Pro",
        "amount": 11000
      }
    ],
    "plans": [
      {
        "name": "Pro",
        "amount": 11000,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://slack.com/admin/billing",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Slack Pro 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:42.105Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "zoom-pro",
    "name": "Zoom Workplace Pro",
    "monogram": "Z",
    "category": "SaaS",
    "plan": "Pro Plan",
    "amount": 19000,
    "brandColor": "#0B5CFF",
    "brandBg": "#EEF2FF",
    "brandText": "#0B5CFF",
    "availablePlans": [
      {
        "plan": "Pro Plan",
        "amount": 19000
      }
    ],
    "plans": [
      {
        "name": "Pro Plan",
        "amount": 19000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://zoom.us/billing",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Zoom Workplace Pro 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:42.375Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "ms365",
    "name": "Microsoft 365",
    "monogram": "M",
    "category": "SaaS",
    "plan": "Personal",
    "amount": 8900,
    "brandColor": "#D83B01",
    "brandBg": "#EEF2FF",
    "brandText": "#D83B01",
    "availablePlans": [
      {
        "plan": "Personal",
        "amount": 8900
      }
    ],
    "plans": [
      {
        "name": "Personal",
        "amount": 8900,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://account.microsoft.com/services",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Microsoft 365 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.291Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "google-one",
    "name": "Google One",
    "monogram": "G",
    "category": "SaaS",
    "plan": "100GB 플랜",
    "amount": 2400,
    "brandColor": "#4285F4",
    "brandBg": "#EEF2FF",
    "brandText": "#4285F4",
    "availablePlans": [
      {
        "plan": "100GB 플랜",
        "amount": 2400
      }
    ],
    "plans": [
      {
        "name": "100GB 플랜",
        "amount": 2400,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://one.google.com/settings",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Google One 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.015Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "icloud",
    "name": "Apple iCloud+",
    "monogram": "A",
    "category": "SaaS",
    "plan": "50GB 플랜",
    "amount": 1100,
    "brandColor": "#0070C9",
    "brandBg": "#EEF2FF",
    "brandText": "#0070C9",
    "availablePlans": [
      {
        "plan": "50GB 플랜",
        "amount": 1100
      }
    ],
    "plans": [
      {
        "name": "50GB 플랜",
        "amount": 1100,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://support.apple.com/ko-kr/HT207594",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Apple iCloud+ 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:42.317Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "dropbox",
    "name": "Dropbox",
    "monogram": "D",
    "category": "SaaS",
    "plan": "Plus 2TB",
    "amount": 15000,
    "brandColor": "#0061FF",
    "brandBg": "#EEF2FF",
    "brandText": "#0061FF",
    "availablePlans": [
      {
        "plan": "Plus 2TB",
        "amount": 15000
      }
    ],
    "plans": [
      {
        "name": "Plus 2TB",
        "amount": 15000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.dropbox.com/account/plan",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Dropbox 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:42.728Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "evernote",
    "name": "Evernote",
    "monogram": "E",
    "category": "SaaS",
    "plan": "Personal",
    "amount": 11900,
    "brandColor": "#00A82D",
    "brandBg": "#EEF2FF",
    "brandText": "#00A82D",
    "availablePlans": [
      {
        "plan": "Personal",
        "amount": 11900
      }
    ],
    "plans": [
      {
        "name": "Personal",
        "amount": 11900,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.evernote.com/secure/BillingInfo.action",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Evernote 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.599Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "todoist",
    "name": "Todoist",
    "monogram": "T",
    "category": "SaaS",
    "plan": "Pro",
    "amount": 5500,
    "brandColor": "#E44332",
    "brandBg": "#EEF2FF",
    "brandText": "#E44332",
    "availablePlans": [
      {
        "plan": "Pro",
        "amount": 5500
      }
    ],
    "plans": [
      {
        "name": "Pro",
        "amount": 5500,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://app.todoist.com/app/settings/subscription",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Todoist 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:42.769Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "1password",
    "name": "1Password",
    "monogram": "1",
    "category": "SaaS",
    "plan": "Individual",
    "amount": 4500,
    "brandColor": "#0094F5",
    "brandBg": "#EEF2FF",
    "brandText": "#0094F5",
    "availablePlans": [
      {
        "plan": "Individual",
        "amount": 4500
      }
    ],
    "plans": [
      {
        "name": "Individual",
        "amount": 4500,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://my.1password.com/billing",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "1Password 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:42.877Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "nordvpn",
    "name": "NordVPN",
    "monogram": "N",
    "category": "SaaS",
    "plan": "Plus (2년 월환산)",
    "amount": 5900,
    "brandColor": "#4687FF",
    "brandBg": "#EEF2FF",
    "brandText": "#4687FF",
    "availablePlans": [
      {
        "plan": "Plus (2년 월환산)",
        "amount": 5900
      }
    ],
    "plans": [
      {
        "name": "Plus (2년 월환산)",
        "amount": 5900,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://my.nordaccount.com/billing/my-subscriptions/",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "NordVPN 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:42.372Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "notion",
    "name": "Notion Plus",
    "monogram": "N",
    "category": "SaaS",
    "plan": "Plus Plan",
    "amount": 14000,
    "brandColor": "#000000",
    "brandBg": "#EEF2FF",
    "brandText": "#000000",
    "availablePlans": [
      {
        "plan": "Plus Plan",
        "amount": 14000
      }
    ],
    "plans": [
      {
        "name": "Plus Plan",
        "amount": 14000,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.notion.so/settings",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Notion Plus 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.874Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "netflix",
    "name": "Netflix",
    "monogram": "N",
    "category": "OTT",
    "plan": "프리미엄",
    "amount": 17000,
    "brandColor": "#E50914",
    "brandBg": "#FEE8E8",
    "brandText": "#E50914",
    "availablePlans": [
      {
        "plan": "광고형 스탠다드",
        "amount": 7000
      },
      {
        "plan": "스탠다드",
        "amount": 13500
      },
      {
        "plan": "프리미엄",
        "amount": 17000
      }
    ],
    "plans": [
      {
        "name": "광고형 스탠다드",
        "amount": 7000,
        "billingCycle": "매월",
        "quality": "1080p"
      },
      {
        "name": "스탠다드",
        "amount": 13500,
        "billingCycle": "매월",
        "quality": "1080p"
      },
      {
        "name": "프리미엄",
        "amount": 17000,
        "billingCycle": "매월",
        "quality": "4K UHD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신한카드 • 4412",
    "cancelUrl": "https://www.netflix.com/cancelplan",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "로그인",
        "description": "넷플릭스 계정으로 로그인해 주세요.",
        "imageUrl": "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=320&auto=format&fit=crop&q=80"
      },
      {
        "stepNumber": 2,
        "title": "계정 선택",
        "description": "우측 상단 프로필 > [계정] 메뉴로 들어갑니다.",
        "imageUrl": "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=320&auto=format&fit=crop&q=80"
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "스크롤을 내려 [멤버십 해지]를 터치하세요.",
        "imageUrl": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=320&auto=format&fit=crop&q=80"
      },
      {
        "stepNumber": 4,
        "title": "해지 완료",
        "description": "혜택 유지 제안을 넘기고 [해지 완료]를 누르면 끝!",
        "imageUrl": "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=320&auto=format&fit=crop&q=80"
      }
    ],
    "lastUpdated": "2026-09-15T11:20:41.754Z",
    "parseStatus": "PARSED_SUCCESS"
  },
  {
    "id": "youtube",
    "name": "YouTube Premium",
    "monogram": "Y",
    "category": "OTT",
    "plan": "개인 멤버십",
    "amount": 14900,
    "brandColor": "#FF0000",
    "brandBg": "#FFEBEB",
    "brandText": "#FF0000",
    "availablePlans": [
      {
        "plan": "개인 멤버십",
        "amount": 14900
      },
      {
        "plan": "가족 멤버십",
        "amount": 19900
      }
    ],
    "plans": [
      {
        "name": "개인 멤버십",
        "amount": 14900,
        "billingCycle": "매월",
        "quality": "HD"
      },
      {
        "name": "가족 멤버십",
        "amount": 19900,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 22,
    "paymentMethod": "카카오페이",
    "cancelUrl": "https://www.youtube.com/paid_memberships",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "프로필",
        "description": "우측 상단 내 프로필 아이콘을 터치하세요.",
        "imageUrl": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=320&auto=format&fit=crop&q=80"
      },
      {
        "stepNumber": 2,
        "title": "구매 항목",
        "description": "[구매 항목 및 멤버십] 메뉴를 선택합니다.",
        "imageUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=320&auto=format&fit=crop&q=80"
      },
      {
        "stepNumber": 3,
        "title": "멤버십 관리",
        "description": "활성 멤버십에서 [관리] 또는 [비활성화]를 누르세요.",
        "imageUrl": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=320&auto=format&fit=crop&q=80"
      },
      {
        "stepNumber": 4,
        "title": "그대로 취소",
        "description": "'일시중지' 대신 하단 [그대로 취소]를 선택하세요.",
        "imageUrl": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=320&auto=format&fit=crop&q=80"
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.789Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "tving",
    "name": "TVING",
    "monogram": "T",
    "category": "OTT",
    "plan": "광고형 스탠다드",
    "amount": 5500,
    "brandColor": "#FF153C",
    "brandBg": "#FFEBEF",
    "brandText": "#FF153C",
    "availablePlans": [
      {
        "plan": "광고형 스탠다드",
        "amount": 5500
      },
      {
        "plan": "스탠다드",
        "amount": 13500
      },
      {
        "plan": "프리미엄",
        "amount": 17000
      }
    ],
    "plans": [
      {
        "name": "광고형 스탠다드",
        "amount": 5500,
        "billingCycle": "매월",
        "quality": "1080p"
      },
      {
        "name": "스탠다드",
        "amount": 13500,
        "billingCycle": "매월",
        "quality": "1080p"
      },
      {
        "name": "프리미엄",
        "amount": 17000,
        "billingCycle": "매월",
        "quality": "4K UHD"
      }
    ],
    "dueDay": 10,
    "paymentMethod": "네이버페이",
    "cancelUrl": "https://www.tving.com/my/pass",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "MY 메뉴",
        "description": "우측 상단 프로필 [MY] 메뉴로 이동합니다.",
        "imageUrl": "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=320&auto=format&fit=crop&q=80"
      },
      {
        "stepNumber": 2,
        "title": "이용권/캐시",
        "description": "[이용권/캐시 내역] > [정기결제 관리]를 선택하세요.",
        "imageUrl": "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=320&auto=format&fit=crop&q=80"
      },
      {
        "stepNumber": 3,
        "title": "해지 신청",
        "description": "하단 [자동결제 해지 신청]을 누르면 완료됩니다.",
        "imageUrl": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=320&auto=format&fit=crop&q=80"
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.010Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "disney",
    "name": "Disney+",
    "monogram": "D",
    "category": "OTT",
    "plan": "스탠다드",
    "amount": 9900,
    "brandColor": "#0063E5",
    "brandBg": "#E8F1FD",
    "brandText": "#0063E5",
    "availablePlans": [
      {
        "plan": "스탠다드",
        "amount": 9900
      },
      {
        "plan": "프리미엄",
        "amount": 13900
      }
    ],
    "plans": [
      {
        "name": "스탠다드",
        "amount": 9900,
        "billingCycle": "매월",
        "quality": "1080p"
      },
      {
        "name": "프리미엄",
        "amount": 13900,
        "billingCycle": "매월",
        "quality": "4K UHD"
      }
    ],
    "dueDay": 18,
    "paymentMethod": "삼성카드 • 3701",
    "cancelUrl": "https://www.disneyplus.com/ko-kr/account",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "로그인",
        "description": "디즈니+ 공식 사이트에서 계정으로 로그인합니다.",
        "imageUrl": "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=320&auto=format&fit=crop&q=80"
      },
      {
        "stepNumber": 2,
        "title": "계정 선택",
        "description": "우측 상단 프로필 > [계정] 메뉴를 선택하세요.",
        "imageUrl": "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=320&auto=format&fit=crop&q=80"
      },
      {
        "stepNumber": 3,
        "title": "멤버십 취소",
        "description": "구독 중인 요금제를 누르고 [멤버십 취소]를 진행하세요.",
        "imageUrl": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=320&auto=format&fit=crop&q=80"
      }
    ],
    "lastUpdated": "2026-09-15T11:20:42.923Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "wavve",
    "name": "Wavve",
    "monogram": "W",
    "category": "OTT",
    "plan": "스탠다드",
    "amount": 10900,
    "brandColor": "#1A56EB",
    "brandBg": "#EEF2FF",
    "brandText": "#1A56EB",
    "availablePlans": [
      {
        "plan": "스탠다드",
        "amount": 10900
      },
      {
        "plan": "디즈니+ 티빙 3사 번들",
        "amount": 22300
      }
    ],
    "plans": [
      {
        "name": "스탠다드",
        "amount": 10900,
        "billingCycle": "매월",
        "quality": "1080p"
      },
      {
        "name": "디즈니+ 티빙 3사 번들",
        "amount": 22300,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.wavve.com/my/pass",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Wavve 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:42.842Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "watcha",
    "name": "WATCHA",
    "monogram": "W",
    "category": "OTT",
    "plan": "프리미엄",
    "amount": 1000,
    "brandColor": "#FF0558",
    "brandBg": "#EEF2FF",
    "brandText": "#FF0558",
    "availablePlans": [
      {
        "plan": "프리미엄",
        "amount": 1000
      },
      {
        "plan": "스탠다드",
        "amount": 10000
      },
      {
        "plan": "프리미엄",
        "amount": 30000
      },
      {
        "plan": "프리미엄",
        "amount": 33333
      }
    ],
    "plans": [
      {
        "name": "프리미엄",
        "amount": 1000,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "스탠다드",
        "amount": 10000,
        "billingCycle": "매월",
        "quality": "1080p"
      },
      {
        "name": "프리미엄",
        "amount": 30000,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 33333,
        "billingCycle": "매월",
        "quality": "4K UHD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://watcha.com/settings",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "WATCHA 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.121Z",
    "parseStatus": "PARSED_SUCCESS"
  },
  {
    "id": "coupangplay",
    "name": "Coupang Play",
    "monogram": "C",
    "category": "OTT",
    "plan": "와우 회원 무료",
    "amount": 5000,
    "brandColor": "#0073E6",
    "brandBg": "#EEF2FF",
    "brandText": "#0073E6",
    "availablePlans": [
      {
        "plan": "와우 회원 무료",
        "amount": 5000
      },
      {
        "plan": "쿠팡 와우 멤버십 연동 무료",
        "amount": 15000
      },
      {
        "plan": "프리미엄",
        "amount": 20000
      }
    ],
    "plans": [
      {
        "name": "와우 회원 무료",
        "amount": 5000,
        "billingCycle": "매월",
        "quality": "HD"
      },
      {
        "name": "쿠팡 와우 멤버십 연동 무료",
        "amount": 15000,
        "billingCycle": "매월",
        "quality": "HD"
      },
      {
        "name": "프리미엄",
        "amount": 20000,
        "billingCycle": "매월",
        "quality": "4K UHD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://loyalty.coupang.com/loyalty/sign-up/home",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Coupang Play 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.125Z",
    "parseStatus": "PARSED_SUCCESS"
  },
  {
    "id": "laftel",
    "name": "Laftel",
    "monogram": "L",
    "category": "OTT",
    "plan": "베이직",
    "amount": 9900,
    "brandColor": "#816BFF",
    "brandBg": "#EEF2FF",
    "brandText": "#816BFF",
    "availablePlans": [
      {
        "plan": "베이직",
        "amount": 9900
      }
    ],
    "plans": [
      {
        "name": "베이직",
        "amount": 9900,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://laftel.net/mypage",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Laftel 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:42.957Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "appletv",
    "name": "Apple TV+",
    "monogram": "A",
    "category": "OTT",
    "plan": "Apple TV+",
    "amount": 6500,
    "brandColor": "#000000",
    "brandBg": "#EEF2FF",
    "brandText": "#000000",
    "availablePlans": [
      {
        "plan": "Apple TV+",
        "amount": 6500
      }
    ],
    "plans": [
      {
        "name": "Apple TV+",
        "amount": 6500,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://tv.apple.com/settings",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Apple TV+ 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:42.987Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "primevideo",
    "name": "Amazon Prime Video",
    "monogram": "A",
    "category": "OTT",
    "plan": "Prime Video",
    "amount": 7900,
    "brandColor": "#00A8E1",
    "brandBg": "#EEF2FF",
    "brandText": "#00A8E1",
    "availablePlans": [
      {
        "plan": "Prime Video",
        "amount": 7900
      }
    ],
    "plans": [
      {
        "name": "Prime Video",
        "amount": 7900,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.primevideo.com/settings/your-account/",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Amazon Prime Video 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.710Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "spotvnow",
    "name": "SPOTV NOW",
    "monogram": "S",
    "category": "OTT",
    "plan": "프리미엄",
    "amount": 19900,
    "brandColor": "#191919",
    "brandBg": "#EEF2FF",
    "brandText": "#191919",
    "availablePlans": [
      {
        "plan": "프리미엄",
        "amount": 19900
      }
    ],
    "plans": [
      {
        "name": "프리미엄",
        "amount": 19900,
        "billingCycle": "매월",
        "quality": "4K UHD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.spotvnow.co.kr/my/pass",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "SPOTV NOW 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.030Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "weverse",
    "name": "Weverse Digital Membership",
    "monogram": "W",
    "category": "OTT",
    "plan": "글로벌 멤버십",
    "amount": 25000,
    "brandColor": "#08E6B2",
    "brandBg": "#EEF2FF",
    "brandText": "#08E6B2",
    "availablePlans": [
      {
        "plan": "글로벌 멤버십",
        "amount": 25000
      }
    ],
    "plans": [
      {
        "name": "글로벌 멤버십",
        "amount": 25000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://weverse.io/more/my",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Weverse Digital Membership 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.035Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "crunchyroll",
    "name": "Crunchyroll",
    "monogram": "C",
    "category": "OTT",
    "plan": "Mega Fan",
    "amount": 8900,
    "brandColor": "#F47521",
    "brandBg": "#EEF2FF",
    "brandText": "#F47521",
    "availablePlans": [
      {
        "plan": "Mega Fan",
        "amount": 8900
      }
    ],
    "plans": [
      {
        "name": "Mega Fan",
        "amount": 8900,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.crunchyroll.com/account/membership",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Crunchyroll 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.052Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "mubi",
    "name": "MUBI",
    "monogram": "M",
    "category": "OTT",
    "plan": "MUBI 월정액",
    "amount": 12900,
    "brandColor": "#051A26",
    "brandBg": "#EEF2FF",
    "brandText": "#051A26",
    "availablePlans": [
      {
        "plan": "MUBI 월정액",
        "amount": 12900
      }
    ],
    "plans": [
      {
        "name": "MUBI 월정액",
        "amount": 12900,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://mubi.com/settings/subscription",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "MUBI 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.129Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "dazn",
    "name": "DAZN",
    "monogram": "D",
    "category": "OTT",
    "plan": "Monthly Pass",
    "amount": 25000,
    "brandColor": "#F8F8F8",
    "brandBg": "#EEF2FF",
    "brandText": "#F8F8F8",
    "availablePlans": [
      {
        "plan": "Monthly Pass",
        "amount": 25000
      }
    ],
    "plans": [
      {
        "name": "Monthly Pass",
        "amount": 25000,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://my.dazn.com/myaccount/subscription",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "DAZN 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.123Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "melon",
    "name": "Melon",
    "monogram": "M",
    "category": "음악",
    "plan": "스트리밍 클럽",
    "amount": 8900,
    "brandColor": "#00CD3C",
    "brandBg": "#EEF2FF",
    "brandText": "#00CD3C",
    "availablePlans": [
      {
        "plan": "스트리밍 클럽",
        "amount": 8900
      }
    ],
    "plans": [
      {
        "name": "스트리밍 클럽",
        "amount": 8900,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://member.melon.com/pay/myservice/index.htm",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Melon 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.089Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "spotify",
    "name": "Spotify",
    "monogram": "S",
    "category": "음악",
    "plan": "개인",
    "amount": 11990,
    "brandColor": "#1DB954",
    "brandBg": "#E8F8EE",
    "brandText": "#1DB954",
    "availablePlans": [
      {
        "plan": "개인",
        "amount": 11990
      },
      {
        "plan": "듀오",
        "amount": 16350
      }
    ],
    "plans": [
      {
        "name": "개인",
        "amount": 11990,
        "billingCycle": "매월",
        "quality": "HD"
      },
      {
        "name": "듀오",
        "amount": 16350,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "토스페이",
    "cancelUrl": "https://www.spotify.com/kr-ko/account/overview/",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "계정 로그인",
        "description": "스포티파이 웹사이트에서 계정으로 로그인하세요.",
        "imageUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=320&auto=format&fit=crop&q=80"
      },
      {
        "stepNumber": 2,
        "title": "요금제 변경",
        "description": "이용 중인 요금제 섹션의 [요금제 변경]을 누르세요.",
        "imageUrl": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=320&auto=format&fit=crop&q=80"
      },
      {
        "stepNumber": 3,
        "title": "Premium 해지",
        "description": "스크롤을 내려 [Spotify 구독 해지] 섹션의 [Premium 해지]를 누르세요.",
        "imageUrl": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=320&auto=format&fit=crop&q=80"
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.697Z",
    "parseStatus": "PARSED_SUCCESS"
  },
  {
    "id": "genie",
    "name": "Genie Music",
    "monogram": "G",
    "category": "음악",
    "plan": "스마트 음악감상",
    "amount": 3600,
    "brandColor": "#0093FF",
    "brandBg": "#EEF2FF",
    "brandText": "#0093FF",
    "availablePlans": [
      {
        "plan": "스마트 음악감상",
        "amount": 3600
      },
      {
        "plan": "스탠다드",
        "amount": 8140
      },
      {
        "plan": "프리미엄",
        "amount": 9240
      },
      {
        "plan": "프리미엄",
        "amount": 11990
      },
      {
        "plan": "프리미엄",
        "amount": 12144
      },
      {
        "plan": "프리미엄",
        "amount": 20040
      }
    ],
    "plans": [
      {
        "name": "스마트 음악감상",
        "amount": 3600,
        "billingCycle": "매월",
        "quality": "HD"
      },
      {
        "name": "스탠다드",
        "amount": 8140,
        "billingCycle": "매월",
        "quality": "1080p"
      },
      {
        "name": "프리미엄",
        "amount": 9240,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 11990,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 12144,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 20040,
        "billingCycle": "매월",
        "quality": "4K UHD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.genie.co.kr/my/myTicket",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Genie Music 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.168Z",
    "parseStatus": "PARSED_SUCCESS"
  },
  {
    "id": "flo",
    "name": "FLO",
    "monogram": "F",
    "category": "음악",
    "plan": "올인원 무제한",
    "amount": 7900,
    "brandColor": "#3F3FFF",
    "brandBg": "#EEF2FF",
    "brandText": "#3F3FFF",
    "availablePlans": [
      {
        "plan": "올인원 무제한",
        "amount": 7900
      }
    ],
    "plans": [
      {
        "name": "올인원 무제한",
        "amount": 7900,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.music-flo.com/mypage/voucher",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "FLO 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.133Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "bugs",
    "name": "Bugs",
    "monogram": "B",
    "category": "음악",
    "plan": "모바일 무제한",
    "amount": 3300,
    "brandColor": "#E60000",
    "brandBg": "#EEF2FF",
    "brandText": "#E60000",
    "availablePlans": [
      {
        "plan": "모바일 무제한",
        "amount": 3300
      },
      {
        "plan": "스탠다드",
        "amount": 4900
      },
      {
        "plan": "프리미엄",
        "amount": 5390
      },
      {
        "plan": "프리미엄",
        "amount": 5940
      },
      {
        "plan": "프리미엄",
        "amount": 7386
      },
      {
        "plan": "프리미엄",
        "amount": 7590
      },
      {
        "plan": "프리미엄",
        "amount": 8690
      },
      {
        "plan": "프리미엄",
        "amount": 8900
      },
      {
        "plan": "프리미엄",
        "amount": 9000
      },
      {
        "plan": "프리미엄",
        "amount": 9790
      },
      {
        "plan": "프리미엄",
        "amount": 9900
      },
      {
        "plan": "프리미엄",
        "amount": 11990
      },
      {
        "plan": "프리미엄",
        "amount": 13750
      }
    ],
    "plans": [
      {
        "name": "모바일 무제한",
        "amount": 3300,
        "billingCycle": "매월",
        "quality": "HD"
      },
      {
        "name": "스탠다드",
        "amount": 4900,
        "billingCycle": "매월",
        "quality": "1080p"
      },
      {
        "name": "프리미엄",
        "amount": 5390,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 5940,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 7386,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 7590,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 8690,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 8900,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 9000,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 9790,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 9900,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 11990,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 13750,
        "billingCycle": "매월",
        "quality": "4K UHD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://secure.bugs.co.kr/my/ticket",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Bugs 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.202Z",
    "parseStatus": "PARSED_SUCCESS"
  },
  {
    "id": "vibe",
    "name": "NAVER VIBE",
    "monogram": "N",
    "category": "음악",
    "plan": "무제한 듣기",
    "amount": 8500,
    "brandColor": "#FF0055",
    "brandBg": "#EEF2FF",
    "brandText": "#FF0055",
    "availablePlans": [
      {
        "plan": "무제한 듣기",
        "amount": 8500
      }
    ],
    "plans": [
      {
        "name": "무제한 듣기",
        "amount": 8500,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://vibe.naver.com/membership",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "NAVER VIBE 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.142Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "applemusic",
    "name": "Apple Music",
    "monogram": "A",
    "category": "음악",
    "plan": "개인 멤버십",
    "amount": 8900,
    "brandColor": "#FA233B",
    "brandBg": "#EEF2FF",
    "brandText": "#FA233B",
    "availablePlans": [
      {
        "plan": "개인 멤버십",
        "amount": 8900
      }
    ],
    "plans": [
      {
        "name": "개인 멤버십",
        "amount": 8900,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://music.apple.com/account/settings",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Apple Music 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.155Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "ytmusic",
    "name": "YouTube Music",
    "monogram": "Y",
    "category": "음악",
    "plan": "Music Premium",
    "amount": 11990,
    "brandColor": "#FF0000",
    "brandBg": "#EEF2FF",
    "brandText": "#FF0000",
    "availablePlans": [
      {
        "plan": "Music Premium",
        "amount": 11990
      }
    ],
    "plans": [
      {
        "name": "Music Premium",
        "amount": 11990,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.youtube.com/paid_memberships",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "YouTube Music 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.834Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "tidal",
    "name": "TIDAL",
    "monogram": "T",
    "category": "음악",
    "plan": "HiFi Plus",
    "amount": 14000,
    "brandColor": "#000000",
    "brandBg": "#EEF2FF",
    "brandText": "#000000",
    "availablePlans": [
      {
        "plan": "HiFi Plus",
        "amount": 14000
      }
    ],
    "plans": [
      {
        "name": "HiFi Plus",
        "amount": 14000,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://my.tidal.com/account/subscription",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "TIDAL 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.493Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "bubble-sm",
    "name": "DearU Bubble",
    "monogram": "D",
    "category": "음악",
    "plan": "1인권",
    "amount": 4500,
    "brandColor": "#FF3366",
    "brandBg": "#EEF2FF",
    "brandText": "#FF3366",
    "availablePlans": [
      {
        "plan": "1인권",
        "amount": 4500
      }
    ],
    "plans": [
      {
        "name": "1인권",
        "amount": 4500,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://play.google.com/store/account/subscriptions",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "DearU Bubble 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.737Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "fromm",
    "name": "fromm",
    "monogram": "f",
    "category": "음악",
    "plan": "1인 메시지권",
    "amount": 4500,
    "brandColor": "#7B2CBF",
    "brandBg": "#EEF2FF",
    "brandText": "#7B2CBF",
    "availablePlans": [
      {
        "plan": "1인 메시지권",
        "amount": 4500
      }
    ],
    "plans": [
      {
        "name": "1인 메시지권",
        "amount": 4500,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://play.google.com/store/account/subscriptions",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "fromm 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.842Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "podbbang",
    "name": "팟빵 오디오매거진",
    "monogram": "팟",
    "category": "음악",
    "plan": "팟빵 프리미엄",
    "amount": 9900,
    "brandColor": "#E61B48",
    "brandBg": "#EEF2FF",
    "brandText": "#E61B48",
    "availablePlans": [
      {
        "plan": "팟빵 프리미엄",
        "amount": 9900
      }
    ],
    "plans": [
      {
        "name": "팟빵 프리미엄",
        "amount": 9900,
        "billingCycle": "매월",
        "quality": "4K UHD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.podbbang.com/mypage/subscription",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "팟빵 오디오매거진 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.407Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "millie",
    "name": "밀리의 서재",
    "monogram": "밀",
    "category": "도서/웹툰",
    "plan": "전자책 정기구독",
    "amount": 9900,
    "brandColor": "#F8B62D",
    "brandBg": "#FFF7E6",
    "brandText": "#B37A00",
    "availablePlans": [
      {
        "plan": "전자책 정기구독",
        "amount": 9900
      },
      {
        "plan": "연 정기구독",
        "amount": 99000
      }
    ],
    "plans": [
      {
        "name": "전자책 정기구독",
        "amount": 9900,
        "billingCycle": "매월",
        "quality": "HD"
      },
      {
        "name": "연 정기구독",
        "amount": 99000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 12,
    "paymentMethod": "카카오페이",
    "cancelUrl": "https://www.millie.co.kr/v3/mypage/subscription",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "관리 이동",
        "description": "하단 메뉴 [관리] 탭으로 이동합니다.",
        "imageUrl": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=320&auto=format&fit=crop&q=80"
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "[구독 관리] > [결제 예정 내역]을 확인하세요.",
        "imageUrl": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=320&auto=format&fit=crop&q=80"
      },
      {
        "stepNumber": 3,
        "title": "해지 신청",
        "description": "하단 [해지 신청]을 누르고 최종 확인을 완료하세요.",
        "imageUrl": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=320&auto=format&fit=crop&q=80"
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.462Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "ridiselect",
    "name": "리디셀렉트",
    "monogram": "리",
    "category": "도서/웹툰",
    "plan": "리디셀렉트 월정액",
    "amount": 4900,
    "brandColor": "#1F8CE6",
    "brandBg": "#EEF2FF",
    "brandText": "#1F8CE6",
    "availablePlans": [
      {
        "plan": "리디셀렉트 월정액",
        "amount": 4900
      }
    ],
    "plans": [
      {
        "name": "리디셀렉트 월정액",
        "amount": 4900,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://select.ridibooks.com/settings",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "리디셀렉트 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.483Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "welaaa",
    "name": "윌라 오디오북",
    "monogram": "윌",
    "category": "음악",
    "plan": "오디오북 무제한",
    "amount": 12500,
    "brandColor": "#00E277",
    "brandBg": "#EEF2FF",
    "brandText": "#00E277",
    "availablePlans": [
      {
        "plan": "오디오북 무제한",
        "amount": 12500
      },
      {
        "plan": "프리미엄",
        "amount": 16900
      }
    ],
    "plans": [
      {
        "name": "오디오북 무제한",
        "amount": 12500,
        "billingCycle": "매월",
        "quality": "HD"
      },
      {
        "name": "프리미엄",
        "amount": 16900,
        "billingCycle": "매월",
        "quality": "4K UHD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.welaaa.com/my/membership",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "윌라 오디오북 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.525Z",
    "parseStatus": "PARSED_SUCCESS"
  },
  {
    "id": "storytel",
    "name": "Storytel",
    "monogram": "S",
    "category": "음악",
    "plan": "무제한 스트리밍",
    "amount": 11900,
    "brandColor": "#FF6633",
    "brandBg": "#EEF2FF",
    "brandText": "#FF6633",
    "availablePlans": [
      {
        "plan": "무제한 스트리밍",
        "amount": 11900
      }
    ],
    "plans": [
      {
        "name": "무제한 스트리밍",
        "amount": 11900,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.storytel.com/kr/ko/my-pages/subscription",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Storytel 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.059Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "longblack",
    "name": "롱블랙",
    "monogram": "롱",
    "category": "도서/웹툰",
    "plan": "월간 멤버십",
    "amount": 4900,
    "brandColor": "#000000",
    "brandBg": "#EEF2FF",
    "brandText": "#000000",
    "availablePlans": [
      {
        "plan": "월간 멤버십",
        "amount": 4900
      }
    ],
    "plans": [
      {
        "name": "월간 멤버십",
        "amount": 4900,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.longblack.co/settings",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "롱블랙 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.527Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "the-joongang-plus",
    "name": "더중앙플러스",
    "monogram": "더",
    "category": "도서/웹툰",
    "plan": "디지털 유료구독",
    "amount": 9000,
    "brandColor": "#E60000",
    "brandBg": "#EEF2FF",
    "brandText": "#E60000",
    "availablePlans": [
      {
        "plan": "디지털 유료구독",
        "amount": 9000
      }
    ],
    "plans": [
      {
        "name": "디지털 유료구독",
        "amount": 9000,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.joongang.co.kr/plus/mypage/subscription",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "더중앙플러스 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.550Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "nyt-digital",
    "name": "The New York Times",
    "monogram": "T",
    "category": "도서/웹툰",
    "plan": "All Access",
    "amount": 6000,
    "brandColor": "#000000",
    "brandBg": "#EEF2FF",
    "brandText": "#000000",
    "availablePlans": [
      {
        "plan": "All Access",
        "amount": 6000
      }
    ],
    "plans": [
      {
        "name": "All Access",
        "amount": 6000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.nytimes.com/subscription/cancel",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "The New York Times 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.721Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "wsj-digital",
    "name": "The Wall Street Journal",
    "monogram": "T",
    "category": "도서/웹툰",
    "plan": "Digital Access",
    "amount": 12000,
    "brandColor": "#000000",
    "brandBg": "#EEF2FF",
    "brandText": "#000000",
    "availablePlans": [
      {
        "plan": "Digital Access",
        "amount": 12000
      }
    ],
    "plans": [
      {
        "name": "Digital Access",
        "amount": 12000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://customercenter.wsj.com/manage-subscription",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "The Wall Street Journal 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.413Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "ft-digital",
    "name": "Financial Times",
    "monogram": "F",
    "category": "도서/웹툰",
    "plan": "Standard Digital",
    "amount": 45000,
    "brandColor": "#FFF1E5",
    "brandBg": "#EEF2FF",
    "brandText": "#FFF1E5",
    "availablePlans": [
      {
        "plan": "Standard Digital",
        "amount": 45000
      }
    ],
    "plans": [
      {
        "name": "Standard Digital",
        "amount": 45000,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.ft.com/myaccount/subscription/overview",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Financial Times 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.641Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "the-economist",
    "name": "The Economist",
    "monogram": "T",
    "category": "도서/웹툰",
    "plan": "Digital Access",
    "amount": 29000,
    "brandColor": "#E3120B",
    "brandBg": "#EEF2FF",
    "brandText": "#E3120B",
    "availablePlans": [
      {
        "plan": "Digital Access",
        "amount": 29000
      }
    ],
    "plans": [
      {
        "name": "Digital Access",
        "amount": 29000,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.economist.com/manage/my-subscription",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "The Economist 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.660Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "audible",
    "name": "Audible",
    "monogram": "A",
    "category": "도서/웹툰",
    "plan": "Audible Plus",
    "amount": 11000,
    "brandColor": "#FF9900",
    "brandBg": "#EEF2FF",
    "brandText": "#FF9900",
    "availablePlans": [
      {
        "plan": "Audible Plus",
        "amount": 11000
      }
    ],
    "plans": [
      {
        "name": "Audible Plus",
        "amount": 11000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.audible.com/account/overview",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Audible 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.130Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "scribd",
    "name": "Scribd",
    "monogram": "S",
    "category": "도서/웹툰",
    "plan": "Monthly Pass",
    "amount": 13000,
    "brandColor": "#1E7B85",
    "brandBg": "#EEF2FF",
    "brandText": "#1E7B85",
    "availablePlans": [
      {
        "plan": "Monthly Pass",
        "amount": 13000
      }
    ],
    "plans": [
      {
        "name": "Monthly Pass",
        "amount": 13000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.scribd.com/account-settings",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Scribd 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.717Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "speak",
    "name": "Speak",
    "monogram": "S",
    "category": "교육/어학",
    "plan": "프리미엄 연간 (월환산)",
    "amount": 29000,
    "brandColor": "#0055FF",
    "brandBg": "#EEF2FF",
    "brandText": "#0055FF",
    "availablePlans": [
      {
        "plan": "프리미엄 연간 (월환산)",
        "amount": 29000
      }
    ],
    "plans": [
      {
        "name": "프리미엄 연간 (월환산)",
        "amount": 29000,
        "billingCycle": "매월",
        "quality": "4K UHD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://app.usespeak.com/settings/subscription",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Speak 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.806Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "duolingo",
    "name": "Duolingo Super",
    "monogram": "D",
    "category": "교육/어학",
    "plan": "Super Duolingo",
    "amount": 9900,
    "brandColor": "#58CC02",
    "brandBg": "#EEF2FF",
    "brandText": "#58CC02",
    "availablePlans": [
      {
        "plan": "Super Duolingo",
        "amount": 9900
      }
    ],
    "plans": [
      {
        "name": "Super Duolingo",
        "amount": 9900,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.duolingo.com/settings/super",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Duolingo Super 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.264Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "ringle",
    "name": "Ringle",
    "monogram": "R",
    "category": "교육/어학",
    "plan": "정기구독 플랜",
    "amount": 159000,
    "brandColor": "#2D3748",
    "brandBg": "#EEF2FF",
    "brandText": "#2D3748",
    "availablePlans": [
      {
        "plan": "정기구독 플랜",
        "amount": 159000
      }
    ],
    "plans": [
      {
        "name": "정기구독 플랜",
        "amount": 159000,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.ringleplus.com/ko/student/mypage",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Ringle 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.835Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "cambly",
    "name": "Cambly",
    "monogram": "C",
    "category": "교육/어학",
    "plan": "주 3회 30분",
    "amount": 129000,
    "brandColor": "#FFC800",
    "brandBg": "#EEF2FF",
    "brandText": "#FFC800",
    "availablePlans": [
      {
        "plan": "주 3회 30분",
        "amount": 129000
      }
    ],
    "plans": [
      {
        "name": "주 3회 30분",
        "amount": 129000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.cambly.com/en/student/settings#subscription",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Cambly 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.435Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "santatoeic",
    "name": "산타토익",
    "monogram": "산",
    "category": "교육/어학",
    "plan": "AI 무제한패스",
    "amount": 29000,
    "brandColor": "#E02128",
    "brandBg": "#EEF2FF",
    "brandText": "#E02128",
    "availablePlans": [
      {
        "plan": "AI 무제한패스",
        "amount": 29000
      }
    ],
    "plans": [
      {
        "name": "AI 무제한패스",
        "amount": 29000,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.santatoeic.com/mypage",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "산타토익 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.801Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "malhaeboca",
    "name": "말해보카",
    "monogram": "말",
    "category": "교육/어학",
    "plan": "연간 프리미엄 (월환산)",
    "amount": 8900,
    "brandColor": "#FFCC00",
    "brandBg": "#EEF2FF",
    "brandText": "#FFCC00",
    "availablePlans": [
      {
        "plan": "연간 프리미엄 (월환산)",
        "amount": 8900
      }
    ],
    "plans": [
      {
        "name": "연간 프리미엄 (월환산)",
        "amount": 8900,
        "billingCycle": "매월",
        "quality": "4K UHD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://play.google.com/store/account/subscriptions",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "말해보카 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.274Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "class101",
    "name": "CLASS101+",
    "monogram": "C",
    "category": "교육/어학",
    "plan": "연간 구독 (월환산)",
    "amount": 18900,
    "brandColor": "#FF5600",
    "brandBg": "#EEF2FF",
    "brandText": "#FF5600",
    "availablePlans": [
      {
        "plan": "연간 구독 (월환산)",
        "amount": 18900
      }
    ],
    "plans": [
      {
        "name": "연간 구독 (월환산)",
        "amount": 18900,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://class101.net/ko/mypage/subscription",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "CLASS101+ 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.870Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "fastcampus",
    "name": "패스트캠퍼스",
    "monogram": "패",
    "category": "교육/어학",
    "plan": "올인원 구독권",
    "amount": 39000,
    "brandColor": "#F44336",
    "brandBg": "#EEF2FF",
    "brandText": "#F44336",
    "availablePlans": [
      {
        "plan": "올인원 구독권",
        "amount": 39000
      }
    ],
    "plans": [
      {
        "name": "올인원 구독권",
        "amount": 39000,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://fastcampus.co.kr/my/subscriptions",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "패스트캠퍼스 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.875Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "inflearn",
    "name": "인프런",
    "monogram": "인",
    "category": "교육/어학",
    "plan": "인프런패스",
    "amount": 29000,
    "brandColor": "#1DC078",
    "brandBg": "#EEF2FF",
    "brandText": "#1DC078",
    "availablePlans": [
      {
        "plan": "인프런패스",
        "amount": 29000
      }
    ],
    "plans": [
      {
        "name": "인프런패스",
        "amount": 29000,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.inflearn.com/my-page/orders",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "인프런 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.878Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "coursera",
    "name": "Coursera Plus",
    "monogram": "C",
    "category": "교육/어학",
    "plan": "Coursera Plus",
    "amount": 69000,
    "brandColor": "#0056D2",
    "brandBg": "#EEF2FF",
    "brandText": "#0056D2",
    "availablePlans": [
      {
        "plan": "Coursera Plus",
        "amount": 69000
      }
    ],
    "plans": [
      {
        "name": "Coursera Plus",
        "amount": 69000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.coursera.org/my-purchases",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Coursera Plus 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.185Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "naverplus",
    "name": "네이버플러스 멤버십",
    "monogram": "네",
    "category": "쇼핑",
    "plan": "월간 이용권",
    "amount": 4000,
    "brandColor": "#03C75A",
    "brandBg": "#EEF2FF",
    "brandText": "#03C75A",
    "availablePlans": [
      {
        "plan": "월간 이용권",
        "amount": 4000
      },
      {
        "plan": "스탠다드",
        "amount": 4900
      },
      {
        "plan": "프리미엄",
        "amount": 5000
      },
      {
        "plan": "프리미엄",
        "amount": 9900
      },
      {
        "plan": "프리미엄",
        "amount": 10000
      },
      {
        "plan": "프리미엄",
        "amount": 15000
      },
      {
        "plan": "프리미엄",
        "amount": 16000
      },
      {
        "plan": "프리미엄",
        "amount": 20000
      },
      {
        "plan": "프리미엄",
        "amount": 26000
      },
      {
        "plan": "프리미엄",
        "amount": 46000
      },
      {
        "plan": "프리미엄",
        "amount": 58800
      },
      {
        "plan": "프리미엄",
        "amount": 66000
      },
      {
        "plan": "프리미엄",
        "amount": 200000
      }
    ],
    "plans": [
      {
        "name": "월간 이용권",
        "amount": 4000,
        "billingCycle": "매월",
        "quality": "HD"
      },
      {
        "name": "스탠다드",
        "amount": 4900,
        "billingCycle": "매월",
        "quality": "1080p"
      },
      {
        "name": "프리미엄",
        "amount": 5000,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 9900,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 10000,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 15000,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 16000,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 20000,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 26000,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 46000,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 58800,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 66000,
        "billingCycle": "매월",
        "quality": "4K UHD"
      },
      {
        "name": "프리미엄",
        "amount": 200000,
        "billingCycle": "매월",
        "quality": "4K UHD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://nid.naver.com/membership/my",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "네이버플러스 멤버십 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.908Z",
    "parseStatus": "PARSED_SUCCESS"
  },
  {
    "id": "baemin-club",
    "name": "배민클럽",
    "monogram": "배",
    "category": "쇼핑",
    "plan": "배민클럽 월정액",
    "amount": 3990,
    "brandColor": "#2AC1BC",
    "brandBg": "#EEF2FF",
    "brandText": "#2AC1BC",
    "availablePlans": [
      {
        "plan": "배민클럽 월정액",
        "amount": 3990
      }
    ],
    "plans": [
      {
        "name": "배민클럽 월정액",
        "amount": 3990,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://baemin.me/club",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "배민클럽 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.911Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "yogipass",
    "name": "요기패스X",
    "monogram": "요",
    "category": "쇼핑",
    "plan": "요기패스X",
    "amount": 2900,
    "brandColor": "#FA0050",
    "brandBg": "#EEF2FF",
    "brandText": "#FA0050",
    "availablePlans": [
      {
        "plan": "요기패스X",
        "amount": 2900
      }
    ],
    "plans": [
      {
        "name": "요기패스X",
        "amount": 2900,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.yogiyo.co.kr/mobile/#/mypage/",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "요기패스X 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.928Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "kurly-pass",
    "name": "컬리멤버스",
    "monogram": "컬",
    "category": "쇼핑",
    "plan": "컬리패스 월정액",
    "amount": 4500,
    "brandColor": "#5F0080",
    "brandBg": "#EEF2FF",
    "brandText": "#5F0080",
    "availablePlans": [
      {
        "plan": "컬리패스 월정액",
        "amount": 4500
      }
    ],
    "plans": [
      {
        "name": "컬리패스 월정액",
        "amount": 4500,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.kurly.com/mypage/membership",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "컬리멤버스 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:43.906Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "coupang",
    "name": "쿠팡 와우 멤버십",
    "monogram": "쿠",
    "category": "쇼핑",
    "plan": "와우 멤버십",
    "amount": 7890,
    "brandColor": "#0073E6",
    "brandBg": "#EBF4FF",
    "brandText": "#0073E6",
    "availablePlans": [
      {
        "plan": "와우 멤버십",
        "amount": 7890
      }
    ],
    "plans": [
      {
        "name": "와우 멤버십",
        "amount": 7890,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://loyalty.coupang.com/loyalty/sign-up/home",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "쿠팡 와우 멤버십 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.097Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "nintendo-online",
    "name": "Nintendo Switch Online",
    "monogram": "N",
    "category": "게임/엔터",
    "plan": "개인 플랜 12개월 (월환산)",
    "amount": 20000,
    "brandColor": "#E60012",
    "brandBg": "#EEF2FF",
    "brandText": "#E60012",
    "availablePlans": [
      {
        "plan": "개인 플랜 12개월 (월환산)",
        "amount": 20000
      }
    ],
    "plans": [
      {
        "name": "개인 플랜 12개월 (월환산)",
        "amount": 20000,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://ec.nintendo.com/my/membership",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Nintendo Switch Online 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.440Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "ps-plus",
    "name": "PlayStation Plus",
    "monogram": "P",
    "category": "게임/엔터",
    "plan": "에센셜",
    "amount": 7500,
    "brandColor": "#003791",
    "brandBg": "#EEF2FF",
    "brandText": "#003791",
    "availablePlans": [
      {
        "plan": "에센셜",
        "amount": 7500
      }
    ],
    "plans": [
      {
        "name": "에센셜",
        "amount": 7500,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://store.playstation.com/ko-kr/subscriptions",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "PlayStation Plus 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.454Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "xbox-gamepass",
    "name": "Xbox Game Pass Ultimate",
    "monogram": "X",
    "category": "게임/엔터",
    "plan": "Ultimate",
    "amount": 13500,
    "brandColor": "#107C10",
    "brandBg": "#EEF2FF",
    "brandText": "#107C10",
    "availablePlans": [
      {
        "plan": "Ultimate",
        "amount": 13500
      },
      {
        "plan": "네이버플러스 무료 연동",
        "amount": 0
      }
    ],
    "plans": [
      {
        "name": "Ultimate",
        "amount": 13500,
        "billingCycle": "매월",
        "quality": "1080p"
      },
      {
        "name": "네이버플러스 무료 연동",
        "amount": 0,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://account.microsoft.com/services",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Xbox Game Pass Ultimate 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:45.435Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "apple-arcade",
    "name": "Apple Arcade",
    "monogram": "A",
    "category": "게임/엔터",
    "plan": "월정액",
    "amount": 6500,
    "brandColor": "#FA233B",
    "brandBg": "#EEF2FF",
    "brandText": "#FA233B",
    "availablePlans": [
      {
        "plan": "월정액",
        "amount": 6500
      }
    ],
    "plans": [
      {
        "name": "월정액",
        "amount": 6500,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://apps.apple.com/account/subscriptions",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Apple Arcade 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:45.036Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "google-play-pass",
    "name": "Google Play Pass",
    "monogram": "G",
    "category": "게임/엔터",
    "plan": "월정액",
    "amount": 6500,
    "brandColor": "#4285F4",
    "brandBg": "#EEF2FF",
    "brandText": "#4285F4",
    "availablePlans": [
      {
        "plan": "월정액",
        "amount": 6500
      }
    ],
    "plans": [
      {
        "name": "월정액",
        "amount": 6500,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://play.google.com/store/account/subscriptions",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Google Play Pass 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.547Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "ea-play",
    "name": "EA Play",
    "monogram": "E",
    "category": "게임/엔터",
    "plan": "EA Play",
    "amount": 5500,
    "brandColor": "#000000",
    "brandBg": "#EEF2FF",
    "brandText": "#000000",
    "availablePlans": [
      {
        "plan": "EA Play",
        "amount": 5500
      }
    ],
    "plans": [
      {
        "name": "EA Play",
        "amount": 5500,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://myaccount.ea.com/cp-ui/subscription/index",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "EA Play 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:45.638Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "wow-subscription",
    "name": "World of Warcraft 정액제",
    "monogram": "W",
    "category": "게임/엔터",
    "plan": "30일 이용권",
    "amount": 19800,
    "brandColor": "#C59B27",
    "brandBg": "#EEF2FF",
    "brandText": "#C59B27",
    "availablePlans": [
      {
        "plan": "30일 이용권",
        "amount": 19800
      }
    ],
    "plans": [
      {
        "name": "30일 이용권",
        "amount": 19800,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://account.battle.net/games",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "World of Warcraft 정액제 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.146Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "kakaotalk-drive",
    "name": "카카오톡 톡서랍 플러스",
    "monogram": "카",
    "category": "생활/모빌리티",
    "plan": "100GB 드라이브",
    "amount": 990,
    "brandColor": "#FEE500",
    "brandBg": "#EEF2FF",
    "brandText": "#FEE500",
    "availablePlans": [
      {
        "plan": "100GB 드라이브",
        "amount": 990
      }
    ],
    "plans": [
      {
        "name": "100GB 드라이브",
        "amount": 990,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://my.kakao.com/product/DRIVE001",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "카카오톡 톡서랍 플러스 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.174Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "kakaotalk-emoticon",
    "name": "카카오톡 이모티콘 플러스",
    "monogram": "카",
    "category": "생활/모빌리티",
    "plan": "이모티콘 무제한",
    "amount": 3900,
    "brandColor": "#FEE500",
    "brandBg": "#EEF2FF",
    "brandText": "#FEE500",
    "availablePlans": [
      {
        "plan": "이모티콘 무제한",
        "amount": 3900
      }
    ],
    "plans": [
      {
        "name": "이모티콘 무제한",
        "amount": 3900,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://my.kakao.com/product/EMOTICON001",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "카카오톡 이모티콘 플러스 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.279Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "naver-mybox",
    "name": "네이버 MYBOX",
    "monogram": "네",
    "category": "생활/모빌리티",
    "plan": "80GB 월정액",
    "amount": 1650,
    "brandColor": "#03C75A",
    "brandBg": "#EEF2FF",
    "brandText": "#03C75A",
    "availablePlans": [
      {
        "plan": "80GB 월정액",
        "amount": 1650
      }
    ],
    "plans": [
      {
        "name": "80GB 월정액",
        "amount": 1650,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://mybox.naver.com/#/capacity",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "네이버 MYBOX 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.224Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "strava-sub",
    "name": "Strava",
    "monogram": "S",
    "category": "생활/모빌리티",
    "plan": "월정액 멤버십",
    "amount": 7900,
    "brandColor": "#FC4C02",
    "brandBg": "#EEF2FF",
    "brandText": "#FC4C02",
    "availablePlans": [
      {
        "plan": "월정액 멤버십",
        "amount": 7900
      }
    ],
    "plans": [
      {
        "name": "월정액 멤버십",
        "amount": 7900,
        "billingCycle": "매월",
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.strava.com/settings/subscription",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Strava 계정 서비스에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독 관리",
        "description": "계정 > 구독 관리 메뉴로 이동합니다."
      },
      {
        "stepNumber": 3,
        "title": "해지 완료",
        "description": "[구독 해지하기]를 클릭하여 완료합니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.450Z",
    "parseStatus": "CRAWL_FAILED"
  },
  {
    "id": "burnfit-pro",
    "name": "번핏 Pro",
    "monogram": "번",
    "category": "생활/모빌리티",
    "plan": "월간 프로",
    "amount": 4900,
    "brandColor": "#FF5252",
    "brandBg": "#EEF2FF",
    "brandText": "#FF5252",
    "availablePlans": [
      {
        "plan": "월간 프로",
        "amount": 4900
      }
    ],
    "plans": [
      {
        "name": "월간 프로",
        "amount": 4900,
        "billingCycle": "매월",
        "quality": "HD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://play.google.com/store/account/subscriptions",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "번핏 Pro 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.747Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "adobe-lightroom",
    "name": "Adobe Lightroom Mobile Premium",
    "monogram": "A",
    "category": "SaaS",
    "plan": "모바일 프리미엄",
    "amount": 5500,
    "brandColor": "#31A8FF",
    "brandBg": "#EEF2FF",
    "brandText": "#31A8FF",
    "availablePlans": [
      {
        "plan": "모바일 프리미엄",
        "amount": 5500
      }
    ],
    "plans": [
      {
        "name": "모바일 프리미엄",
        "amount": 5500,
        "billingCycle": "매월",
        "quality": "4K UHD"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://account.adobe.com/plans",
    "guideSteps": [
      {
        "stepNumber": 1,
        "title": "설정 진입",
        "description": "Adobe Lightroom Mobile Premium 공식 웹사이트/앱에 로그인합니다."
      },
      {
        "stepNumber": 2,
        "title": "구독/결제 관리",
        "description": "프로필 > 계정 설정에서 [구독 관리] 메뉴를 선택합니다."
      },
      {
        "stepNumber": 3,
        "title": "멤버십 해지",
        "description": "하단의 [구독 취소/해지하기]를 누르면 완료됩니다."
      }
    ],
    "lastUpdated": "2026-09-15T11:20:44.826Z",
    "parseStatus": "FALLBACK_APPLIED"
  }
];

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
    }));
  })();

export const promotionCatalog = [
  {
    "id": "naverplus-netflix",
    "category": "OTT",
    "kind": "제휴 0원 무료",
    "title": "Netflix 네이버플러스 무료 연동",
    "subtitle": "네이버 멤버십 회원 0원 혜택",
    "description": "네이버플러스 멤버십(월 4,900원) 이용 시 넷플릭스 광고형 스탠다드를 0원에 시청할 수 있어요.",
    "saving": 5500,
    "originalPrice": 5500,
    "offerPrice": 0,
    "dday": 30,
    "sourceServiceIds": [
      "netflix",
      "naverplus"
    ],
    "link": "https://help.naver.com/service/23168/contents/23881?lang=ko",
    "monogram": "N",
    "benefitPeriod": "네이버 멤버십 유지 기간 상시",
    "campaignPeriod": "상시 제휴 (네이버플러스 멤버십 파트너십)"
  },
  {
    "id": "youtube-promo",
    "category": "100원/무료",
    "kind": "1개월 무료 체험",
    "title": "YouTube Premium",
    "subtitle": "첫 기간 ₩0 체험",
    "description": "₩0에 1개월 무료 체험 • 이후 ₩14,900⁠/⁠월 • VAT 포함 • 혜택 및 가격은 요금제에 따라 다릅니다 • 언제든지 취소 가능",
    "saving": 14900,
    "originalPrice": 14900,
    "offerPrice": 0,
    "dday": 14,
    "sourceServiceIds": [
      "youtube"
    ],
    "link": "https://www.youtube.com/premium",
    "monogram": "Y",
    "lastVerifiedAt": "2026-09-15T11:24:50.485Z",
    "benefitPeriod": "가입 후 첫 1개월 (30일)",
    "campaignPeriod": "상시 진행 (신규 회원 한정)"
  },
  {
    "id": "spotify-annual",
    "category": "연간 전환 팁",
    "kind": "연간 전환 팁",
    "title": "Spotify",
    "subtitle": "연간 결제 시 2개월 무료",
    "description": "연간 멤버십으로 전환하면 2개월 무료 혜택을 받을 수 있어요.",
    "saving": 21800,
    "originalPrice": 130800,
    "offerPrice": 109000,
    "dday": 7,
    "sourceServiceIds": [
      "spotify",
      "youtube"
    ],
    "link": "https://www.spotify.com/kr-ko/premium/",
    "monogram": "S",
    "benefitPeriod": "결제일로부터 1년 (12개월)",
    "campaignPeriod": "상시 운영 (공식 연간 할인 플랜)"
  },
  {
    "id": "watcha-switch",
    "category": "100원/무료",
    "kind": "환승 특가",
    "title": "왓챠 첫 달 100원",
    "description": "넷플릭스 대신 이번 달, 취향에 맞는 콘텐츠를 더 가볍게 시작해요.",
    "saving": 16900,
    "originalPrice": 17000,
    "offerPrice": 100,
    "dday": 3,
    "sourceServiceIds": [
      "netflix",
      "disney",
      "tving"
    ],
    "link": "https://watcha.com/",
    "monogram": "W",
    "benefitPeriod": "가입 후 첫 1개월",
    "campaignPeriod": "상시 진행 (신규 회원 한정)"
  },
  {
    "id": "tving-naver",
    "category": "OTT",
    "kind": "무료 전환",
    "title": "티빙 네이버플러스 무료 연동",
    "description": "네이버플러스 멤버십을 이미 쓴다면 추가 비용 없이 티빙 방송을 시청하세요.",
    "saving": 13500,
    "originalPrice": 13500,
    "offerPrice": 0,
    "dday": 3,
    "sourceServiceIds": [
      "netflix",
      "disney",
      "tving"
    ],
    "link": "https://nid.naver.com/membership/partner",
    "monogram": "T",
    "benefitPeriod": "네이버 멤버십 유지 기간 상시",
    "campaignPeriod": "상시 제휴 (네이버플러스 멤버십 파트너십)"
  },
  {
    "id": "primevideo-trial",
    "category": "100원/무료",
    "kind": "30일 무료 체험",
    "title": "Amazon Prime Video",
    "subtitle": "신규 30일 ₩0 체험",
    "description": "아마존 프라임 비디오 공식 30일 0원 무료 체험 (7일이 아닌 30일 무료 혜택)",
    "saving": 7900,
    "originalPrice": 7900,
    "offerPrice": 0,
    "dday": 14,
    "sourceServiceIds": [
      "primevideo"
    ],
    "link": "https://www.primevideo.com",
    "monogram": "P",
    "benefitPeriod": "가입 후 첫 30일 (1개월간)",
    "campaignPeriod": "상시 진행 (신규 회원 한정 트라이얼)"
  },
  {
    "id": "naver-mybox-naverplus",
    "category": "클라우드/제휴",
    "kind": "네이버 멤버십 제휴",
    "title": "네이버 MYBOX 80GB 무료 연동",
    "subtitle": "네이버 멤버십 회원 전용",
    "description": "네이버플러스 멤버십 이용 시 MYBOX 80GB 저장공간을 추가 비용 없이 무료로 이용할 수 있어요.",
    "saving": 1650,
    "originalPrice": 1650,
    "offerPrice": 0,
    "dday": 30,
    "sourceServiceIds": [
      "naver-mybox",
      "naverplus"
    ],
    "link": "https://mybox.naver.com/#/capacity",
    "monogram": "N",
    "benefitPeriod": "네이버 멤버십 유지 기간 상시",
    "campaignPeriod": "상시 제휴 (네이버플러스 멤버십 파트너십)"
  },
  {
    "id": "disney-annual",
    "category": "학생/연간",
    "kind": "연간 할인",
    "title": "Disney+ 연간 결제 16% 할인",
    "description": "월 결제보다 연간 결제로 바꾸면 1년 동안 더 아낄 수 있어요.",
    "saving": 19800,
    "originalPrice": 118800,
    "offerPrice": 99000,
    "dday": 12,
    "sourceServiceIds": [
      "netflix",
      "youtube",
      "tving"
    ],
    "link": "https://www.disneyplus.com/ko-kr/",
    "monogram": "D",
    "benefitPeriod": "결제일로부터 1년 (12개월)",
    "campaignPeriod": "상시 운영 (공식 연간 할인 플랜)"
  },
  {
    "id": "youtube-bundle",
    "category": "통신사/결합",
    "kind": "결합 혜택",
    "title": "유튜브 프리미엄 통신사 결합",
    "description": "우주패스와 함께 쓰면 월 구독료를 낮출 수 있어요.",
    "saving": 4900,
    "originalPrice": 14900,
    "offerPrice": 10000,
    "dday": 7,
    "sourceServiceIds": [
      "youtube"
    ],
    "link": "https://www.youtube.com/premium",
    "monogram": "Y",
    "benefitPeriod": "우주패스 구독 유지 기간 상시",
    "campaignPeriod": "상시 진행 (신규 회원 한정)"
  },
  {
    "id": "flo-trial",
    "category": "100원/무료",
    "kind": "무료 체험",
    "title": "FLO 1개월 무료 체험",
    "description": "스포티파이 체험 종료 전에 새로운 플레이리스트를 비교해 보세요.",
    "saving": 10900,
    "originalPrice": 10900,
    "offerPrice": 0,
    "dday": 5,
    "sourceServiceIds": [
      "spotify"
    ],
    "link": "https://www.music-flo.com/",
    "monogram": "F",
    "benefitPeriod": "가입 후 첫 1개월",
    "campaignPeriod": "상시 진행 (신규 회원 한정)"
  },
  {
    "id": "millie-student",
    "category": "학생/연간",
    "kind": "학생 제휴",
    "title": "밀리의 서재 첫 달 무료 + 학생 20%",
    "description": "대학생 인증 시 첫 달 무료 이후에도 매월 7,900원에 이용할 수 있어요.",
    "saving": 9900,
    "originalPrice": 9900,
    "offerPrice": 0,
    "dday": 10,
    "sourceServiceIds": [
      "chatgpt",
      "millie",
      "netflix"
    ],
    "link": "https://www.millie.co.kr/",
    "monogram": "M",
    "benefitPeriod": "인증 후 1년 (매년 갱신 가능)",
    "campaignPeriod": "상시 진행 (교육 기관 재학/재직 인증)"
  },
  {
    "id": "adobe-student",
    "category": "학생/연간",
    "kind": "대학생 60% 할인",
    "title": "Adobe CC 모든 앱 학생 60% 할인",
    "description": "포토샵, 프리미어 등 20개 이상의 크리에이티브 앱을 반값 이하로 이용하세요.",
    "saving": 39600,
    "originalPrice": 66000,
    "offerPrice": 26400,
    "dday": 15,
    "sourceServiceIds": [
      "adobe",
      "chatgpt"
    ],
    "link": "https://www.adobe.com/kr/creativecloud/buy/students.html",
    "monogram": "A",
    "benefitPeriod": "인증 후 1년 (매년 갱신 가능)",
    "campaignPeriod": "상시 진행 (교육 기관 재학/재직 인증)"
  },
  {
    "id": "wavve-promo",
    "category": "경쟁사 프로모",
    "kind": "첫 달 100% 페이백",
    "title": "Wavve",
    "subtitle": "특가 프로모션",
    "description": "웨이브 신규 가입 시 첫 달 100% 코인 캐시백 페이백 혜택",
    "saving": 10000,
    "originalPrice": 10000,
    "offerPrice": 1000,
    "dday": 14,
    "sourceServiceIds": [
      "wavve"
    ],
    "link": "https://www.wavve.com/voucher/index.html",
    "monogram": "W",
    "lastVerifiedAt": "2026-09-15T10:45:06.445Z",
    "benefitPeriod": "가입 후 첫 1개월",
    "campaignPeriod": "상시 진행 (신규 회원 한정)"
  },
  {
    "id": "spotify-promo",
    "category": "경쟁사 프로모",
    "kind": "3개월 무료",
    "title": "Spotify",
    "subtitle": "특가 프로모션",
    "description": "3개월에 ₩0으로 Premium을 즐겨보세요",
    "saving": 10000,
    "originalPrice": 10000,
    "offerPrice": 1000,
    "dday": 14,
    "sourceServiceIds": [
      "spotify"
    ],
    "link": "https://www.spotify.com/kr-ko/premium/",
    "monogram": "S",
    "lastVerifiedAt": "2026-09-15T10:45:06.445Z",
    "benefitPeriod": "가입 후 첫 3개월 (2026.09.23까지 신청)",
    "campaignPeriod": "2026.08.15 ~ 2026.09.23 (종료 임박)"
  },
  {
    "id": "genie-promo",
    "category": "100원/무료",
    "kind": "특가 프로모션",
    "title": "Genie Music",
    "subtitle": "첫 기간 ₩0 체험",
    "description": "3,960원",
    "saving": 8400,
    "originalPrice": 8400,
    "offerPrice": 0,
    "dday": 14,
    "sourceServiceIds": [
      "genie"
    ],
    "link": "https://pay.genie.co.kr/buy/recommend",
    "monogram": "G",
    "lastVerifiedAt": "2026-09-15T11:24:50.485Z",
    "benefitPeriod": "정기결제 2회차 (1개월간)",
    "campaignPeriod": "상시 진행 (신규 회원 한정)"
  },
  {
    "id": "millie-promo",
    "category": "100원/무료",
    "kind": "둘째 달 무료",
    "title": "밀리의 서재",
    "subtitle": "첫 기간 ₩0 체험",
    "description": "첫 달 구독하면 둘째 달 무료!",
    "saving": 9900,
    "originalPrice": 9900,
    "offerPrice": 0,
    "dday": 14,
    "sourceServiceIds": [
      "millie"
    ],
    "link": "https://www.millie.co.kr/",
    "monogram": "밀",
    "lastVerifiedAt": "2026-09-15T11:24:50.485Z",
    "benefitPeriod": "가입 후 첫 1개월 (1+1월 무료)",
    "campaignPeriod": "상시 진행 (신규 회원 한정)"
  },
  {
    "id": "netflix-promo",
    "category": "100원/무료",
    "kind": "특가 프로모션",
    "title": "Netflix",
    "subtitle": "첫 기간 ₩0 체험",
    "description": "7,000원으로 시작하세요. 멤버십은 언제든지 해지 가능합니다.",
    "saving": 17000,
    "originalPrice": 17000,
    "offerPrice": 0,
    "dday": 14,
    "sourceServiceIds": [
      "netflix"
    ],
    "link": "https://www.netflix.com/kr/",
    "monogram": "N",
    "lastVerifiedAt": "2026-09-15T11:24:50.485Z",
    "benefitPeriod": "가입 기간 상시",
    "campaignPeriod": "상시 진행 (신규 회원 한정)"
  },
  {
    "id": "naverplus-promo",
    "category": "100원/무료",
    "kind": "특가 프로모션",
    "title": "네이버플러스 멤버십",
    "subtitle": "첫 기간 ₩0 체험",
    "description": "월 9,900원으로 500여 종의",
    "saving": 4900,
    "originalPrice": 4900,
    "offerPrice": 0,
    "dday": 14,
    "sourceServiceIds": [
      "naverplus"
    ],
    "link": "https://nid.naver.com/membership/join",
    "monogram": "네",
    "lastVerifiedAt": "2026-09-15T11:24:50.485Z",
    "benefitPeriod": "네이버 멤버십 유지 기간 상시",
    "campaignPeriod": "상시 제휴 (네이버플러스 멤버십 파트너십)"
  },
  {
    "id": "coupang-promo",
    "category": "100원/무료",
    "kind": "30일 무료 체험",
    "title": "쿠팡 와우 멤버십",
    "subtitle": "첫 기간 ₩0 체험",
    "description": "로켓배송 상품 30일 무료반품",
    "saving": 7890,
    "originalPrice": 7890,
    "offerPrice": 0,
    "dday": 14,
    "sourceServiceIds": [
      "coupang"
    ],
    "link": "https://loyalty.coupang.com/loyalty/sign-up/home",
    "monogram": "쿠",
    "lastVerifiedAt": "2026-09-15T11:20:20.778Z",
    "benefitPeriod": "가입 기간 상시",
    "campaignPeriod": "상시 진행 (신규 회원 한정)"
  },
  {
    "id": "deepl-pro-promo",
    "category": "100원/무료",
    "kind": "특가 프로모션",
    "title": "DeepL Pro",
    "subtitle": "첫 기간 ₩0 체험",
    "description": "무료 체험 시작하기",
    "saving": 12000,
    "originalPrice": 12000,
    "offerPrice": 0,
    "dday": 14,
    "sourceServiceIds": [
      "deepl-pro"
    ],
    "link": "https://www.deepl.com/ko/404",
    "monogram": "D",
    "lastVerifiedAt": "2026-09-15T11:24:50.485Z",
    "benefitPeriod": "가입 기간 상시",
    "campaignPeriod": "상시 진행 (신규 회원 한정)"
  },
  {
    "id": "disney-promo",
    "category": "구독료 할인",
    "kind": "특가 프로모션",
    "title": "Disney+",
    "subtitle": "특가 할인",
    "description": "최대 37% 할인*",
    "saving": 4950,
    "originalPrice": 9900,
    "offerPrice": 4950,
    "dday": 14,
    "sourceServiceIds": [
      "disney"
    ],
    "link": "https://www.disneyplus.com/ko-kr",
    "monogram": "D",
    "lastVerifiedAt": "2026-09-15T11:24:50.485Z",
    "benefitPeriod": "가입 기간 상시",
    "campaignPeriod": "상시 진행 (신규 회원 한정)"
  },
  {
    "id": "vibe-promo",
    "category": "100원/무료",
    "kind": "특가 프로모션",
    "title": "NAVER VIBE",
    "subtitle": "첫 기간 ₩0 체험",
    "description": "월 7,000원",
    "saving": 8500,
    "originalPrice": 8500,
    "offerPrice": 0,
    "dday": 14,
    "sourceServiceIds": [
      "vibe"
    ],
    "link": "https://vibe.naver.com/membership/all",
    "monogram": "N",
    "lastVerifiedAt": "2026-09-15T11:24:50.485Z",
    "benefitPeriod": "가입 기간 상시",
    "campaignPeriod": "상시 진행 (신규 회원 한정)"
  },
  {
    "id": "ringle-promo",
    "category": "구독료 할인",
    "kind": "특가 프로모션",
    "title": "Ringle",
    "subtitle": "특가 할인",
    "description": "최대 59% 할인",
    "saving": 79500,
    "originalPrice": 159000,
    "offerPrice": 79500,
    "dday": 14,
    "sourceServiceIds": [
      "ringle"
    ],
    "link": "https://www.ringleplus.com/ko/1on1",
    "monogram": "R",
    "lastVerifiedAt": "2026-09-15T11:24:50.485Z",
    "benefitPeriod": "가입 기간 상시",
    "campaignPeriod": "상시 진행 (신규 회원 한정)"
  },
  {
    "id": "kakaotalk-drive-promo",
    "category": "100원/무료",
    "kind": "첫 달 100원 특가",
    "title": "카카오톡 톡서랍 플러스",
    "subtitle": "첫 기간 ₩0 체험",
    "description": "2,100원/월",
    "saving": 1000,
    "originalPrice": 990,
    "offerPrice": 0,
    "dday": 14,
    "sourceServiceIds": [
      "kakaotalk-drive"
    ],
    "link": "https://my.kakao.com/product-group/DRIVE?productId=DRIVE006",
    "monogram": "카",
    "lastVerifiedAt": "2026-09-15T11:24:50.485Z",
    "benefitPeriod": "가입 기간 상시",
    "campaignPeriod": "상시 진행 (신규 회원 한정)"
  },
  {
    "id": "kakaotalk-emoticon-promo",
    "category": "100원/무료",
    "kind": "특가 프로모션",
    "title": "카카오톡 이모티콘 플러스",
    "subtitle": "첫 기간 ₩0 체험",
    "description": "4,900원",
    "saving": 3900,
    "originalPrice": 3900,
    "offerPrice": 0,
    "dday": 14,
    "sourceServiceIds": [
      "kakaotalk-emoticon"
    ],
    "link": "https://e.kakao.com/my/product/001",
    "monogram": "카",
    "lastVerifiedAt": "2026-09-15T11:24:50.485Z",
    "benefitPeriod": "가입 기간 상시",
    "campaignPeriod": "상시 진행 (신규 회원 한정)"
  }
];

export const POPULAR_PRESETS = [
  { id: "netflix", name: "Netflix", category: "OTT", plan: "스탠다드", amount: 13500, monogram: "N" },
  { id: "youtube", name: "YouTube Premium", category: "OTT", plan: "개인", amount: 14900, monogram: "Y" },
  { id: "coupang", name: "쿠팡 와우", category: "쇼핑", plan: "와우 멤버십", amount: 7890, monogram: "C" },
  { id: "tving", name: "티빙", category: "OTT", plan: "베이직", amount: 9500, monogram: "T" },
  { id: "disney", name: "Disney+", category: "OTT", plan: "스탠다드", amount: 9900, monogram: "D" },
  { id: "naver", name: "네이버플러스 멤버십", category: "쇼핑", plan: "월간", amount: 4900, monogram: "NP" },
  { id: "millie", name: "밀리의 서재", category: "도서", plan: "전자책 정기구독", amount: 9900, monogram: "M" },
  { id: "spotify", name: "Spotify", category: "음악", plan: "개인", amount: 10900, monogram: "S" },
];
