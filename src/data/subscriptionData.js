const dayAfterToday = () => {
  const now = new Date();
  const lastDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.min(now.getDate() + 1, lastDate);
};

export const serviceCatalog = [
  {
    "id": "chatgpt",
    "name": "ChatGPT Plus",
    "monogram": "G",
    "category": "소프트웨어",
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
    "lastUpdated": "2026-09-30T10:07:01.273Z",
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
        "plan": "기본 플랜",
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
        "name": "기본 플랜",
        "amount": 7000,
        "billingCycle": "매월",
        "quality": "HD"
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
    "lastUpdated": "2026-09-30T10:06:59.499Z",
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
    "lastUpdated": "2026-09-30T10:06:59.841Z",
    "parseStatus": "PARSED_SUCCESS"
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
    "lastUpdated": "2026-09-30T10:07:01.036Z",
    "parseStatus": "PARSED_SUCCESS"
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
        "plan": "기본 플랜",
        "amount": 15000
      },
      {
        "plan": "스탠다드",
        "amount": 18000
      },
      {
        "plan": "프리미엄",
        "amount": 21500
      }
    ],
    "plans": [
      {
        "name": "기본 플랜",
        "amount": 15000,
        "billingCycle": "매월",
        "quality": "HD"
      },
      {
        "name": "스탠다드",
        "amount": 18000,
        "billingCycle": "매월",
        "quality": "1080p"
      },
      {
        "name": "프리미엄",
        "amount": 21500,
        "billingCycle": "매월",
        "quality": "4K UHD"
      }
    ],
    "dueDay": 18,
    "paymentMethod": "삼성카드 • 3701",
    "cancelUrl": "https://www.disneyplus.com/ko-kr/account",
    "lastUpdated": "2026-09-30T10:07:00.432Z",
    "parseStatus": "PARSED_SUCCESS"
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
    "lastUpdated": "2026-09-15T11:20:43.089Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "spotify",
    "name": "Spotify",
    "monogram": "S",
    "category": "음악",
    "plan": "개인",
    "amount": 10900,
    "brandColor": "#1DB954",
    "brandBg": "#E8F8EE",
    "brandText": "#1DB954",
    "availablePlans": [
      {
        "plan": "개인",
        "amount": 10900
      },
      {
        "plan": "듀오",
        "amount": 16350
      }
    ],
    "plans": [
      {
        "name": "개인",
        "amount": 10900,
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
    "lastUpdated": "2026-09-30T10:07:00.321Z",
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
    "lastUpdated": "2026-09-15T11:20:43.906Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  {
    "id": "coupang",
    "name": "쿠팡 와우",
    "monogram": "C",
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
        "quality": "1080p"
      }
    ],
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.coupang.com/np/membership/benefit",
    "lastUpdated": "2026-09-30T10:06:59.994Z",
    "parseStatus": "CRAWL_FAILED"
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
    "lastUpdated": "2026-09-15T11:20:44.826Z",
    "parseStatus": "FALLBACK_APPLIED"
  },
  // DB(subscription_services)에만 있던 4개 서비스. 해지 주소는 공식 고객센터·상품 안내로 확인했다(2026-10-04).
  {
    "id": "kakao-emoticon",
    "name": "카카오 이모티콘 플러스",
    "monogram": "K",
    "category": "생활/모빌리티",
    "plan": "정기구독",
    "amount": 3900,
    "brandColor": "#3C1E1E",
    "brandBg": "#FFF9D6",
    "brandText": "#3C1E1E",
    "availablePlans": [
      {
        "plan": "정기구독",
        "amount": 3900
      }
    ],
    "plans": [
      {
        "name": "정기구독",
        "amount": 3900,
        "billingCycle": "매월"
      }
    ],
    "billingCycle": "매월",
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://my.kakao.com/",
    "lastUpdated": "2026-10-04T00:00:00.000Z",
    "parseStatus": "PARSED_SUCCESS"
  },
  {
    "id": "kurly",
    "name": "컬리패스",
    "monogram": "K",
    "category": "쇼핑",
    "plan": "컬리패스 월정액",
    "amount": 4500,
    "brandColor": "#5F0080",
    "brandBg": "#F5EDF8",
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
        "billingCycle": "매월"
      }
    ],
    "billingCycle": "매월",
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "",
    "lastUpdated": "2026-10-04T00:00:00.000Z",
    "parseStatus": "PARSED_SUCCESS"
  },
  {
    "id": "shinsegae-universe",
    "name": "신세계 유니버스 클럽",
    "monogram": "S",
    "category": "쇼핑",
    "plan": "연간 멤버십",
    "amount": 30000,
    "brandColor": "#E4002B",
    "brandBg": "#FDEBEE",
    "brandText": "#E4002B",
    "availablePlans": [
      {
        "plan": "연간 멤버십",
        "amount": 30000
      }
    ],
    "plans": [
      {
        "name": "연간 멤버십",
        "amount": 30000,
        "billingCycle": "매년"
      }
    ],
    "billingCycle": "매년",
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://www.ssg.com/myssg/main.ssg",
    "lastUpdated": "2026-10-04T00:00:00.000Z",
    "parseStatus": "PARSED_SUCCESS"
  },
  {
    "id": "t-universe",
    "name": "T우주 우주패스",
    "monogram": "T",
    "category": "생활/모빌리티",
    "plan": "우주패스 all",
    "amount": 9900,
    "brandColor": "#3617CE",
    "brandBg": "#EEEBFC",
    "brandText": "#3617CE",
    "availablePlans": [
      {
        "plan": "우주패스 all",
        "amount": 9900
      },
      {
        "plan": "우주패스 life",
        "amount": 9900
      }
    ],
    "plans": [
      {
        "name": "우주패스 all",
        "amount": 9900,
        "billingCycle": "매월"
      },
      {
        "name": "우주패스 life",
        "amount": 9900,
        "billingCycle": "매월"
      }
    ],
    "billingCycle": "매월",
    "dueDay": 15,
    "paymentMethod": "신용카드",
    "cancelUrl": "https://m.sktuniverse.co.kr/",
    "lastUpdated": "2026-10-04T00:00:00.000Z",
    "parseStatus": "PARSED_SUCCESS"
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
    "id": "youtube-1m-free",
    "category": "100원/무료",
    "kind": "1개월 무료 체험",
    "title": "YouTube Premium",
    "subtitle": "₩0에 1개월 무료 체험",
    "description": "광고 없는 감상, 백그라운드 재생, YouTube Music 무료 이용 혜택.",
    "saving": 14900,
    "originalPrice": 14900,
    "offerPrice": 0,
    "dday": 30,
    "sourceServiceIds": [
      "youtube"
    ],
    "link": "https://www.youtube.com/premium",
    "monogram": "Y",
    "verifiedStatus": "LIVE_CONFIRMED",
    "campaignPeriod": "상시 진행 (신규 회원 한정)",
    "benefitPeriod": "가입 후 첫 1개월",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "millie-1plus1",
    "category": "100원/무료",
    "kind": "둘째 달 무료 (1+1)",
    "title": "밀리의 서재",
    "subtitle": "첫 달 구독하면 둘째 달 무료!",
    "description": "밀리 10주년 기념 1+1 생일 이벤트! 첫 달 시작 시 둘째 달 이용권 증정.",
    "saving": 9900,
    "originalPrice": 9900,
    "offerPrice": 0,
    "dday": 7,
    "sourceServiceIds": [
      "millie"
    ],
    "link": "https://www.millie.co.kr/",
    "monogram": "M",
    "verifiedStatus": "LIVE_CONFIRMED",
    "campaignPeriod": "상시 진행 (신규 회원 한정)",
    "benefitPeriod": "가입 후 첫 1개월",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "genie-110won",
    "category": "100원/무료",
    "kind": "다음 달 110원 특가",
    "title": "Genie Music (지니)",
    "subtitle": "스마트 음악감상 2회차 110원",
    "description": "지니뮤직 스마트 음악감상 1회차 정상가 결제 시 다음 달 단돈 110원 파격 혜택.",
    "saving": 8290,
    "originalPrice": 8400,
    "offerPrice": 110,
    "dday": 5,
    "sourceServiceIds": [
      "genie"
    ],
    "link": "https://pay.genie.co.kr/buy/recommend",
    "monogram": "G",
    "verifiedStatus": "LIVE_CONFIRMED",
    "campaignPeriod": "상시 진행 (2회차 결제 특가)",
    "benefitPeriod": "정기결제 2회차 (1개월간)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "appletv-7d-free",
    "category": "100원/무료",
    "kind": "7일 무료 체험 (기기 구매 시 3개월)",
    "title": "Apple TV+",
    "subtitle": "애플 오리지널 7일 무료",
    "description": "애플 오리지널 시리즈를 7일간 무료 체험하세요. 새 Apple 기기 구입 시 3개월 무료.",
    "saving": 6500,
    "originalPrice": 6500,
    "offerPrice": 0,
    "dday": 7,
    "sourceServiceIds": [
      "appletv"
    ],
    "link": "https://tv.apple.com",
    "monogram": "TV",
    "verifiedStatus": "LIVE_CONFIRMED",
    "campaignPeriod": "상시 진행 (신규 회원 웰컴 트라이얼)",
    "benefitPeriod": "가입 후 첫 7일간",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "naverplus-netflix",
    "category": "통신사/결합",
    "kind": "넷플릭스 광고형 스탠다드 무료 연동",
    "title": "네이버플러스 X Netflix",
    "subtitle": "네이버 멤버십으로 넷플릭스 0원",
    "description": "네이버플러스 멤버십(월 4,900원) 가입 시 넷플릭스 광고형 스탠다드(월 5,500원) 이용권을 무료 제공.",
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
    "verifiedStatus": "LIVE_CONFIRMED",
    "campaignPeriod": "상시 제휴 (네이버플러스 멤버십 파트너십)",
    "benefitPeriod": "네이버 멤버십 유지 기간 상시",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "naver-spotify-link",
    "category": "통신사/결합",
    "kind": "네이버플러스 스포티파이 연동 무료",
    "title": "네이버플러스 X Spotify",
    "subtitle": "네이버 멤버십으로 스포티파이 0원",
    "description": "네이버플러스 멤버십 디지털 혜택으로 Spotify Premium Basic 무제한 스트리밍을 매월 0원에 이용.",
    "saving": 8690,
    "originalPrice": 8690,
    "offerPrice": 0,
    "dday": 30,
    "sourceServiceIds": [
      "spotify",
      "naverplus"
    ],
    "link": "https://nid.naver.com/membership/join",
    "monogram": "NP",
    "verifiedStatus": "LIVE_CONFIRMED",
    "campaignPeriod": "상시 제휴 (네이버플러스 멤버십 파트너십)",
    "benefitPeriod": "네이버 멤버십 유지 기간 상시",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "disney-bundle-37",
    "category": "통신사/결합",
    "kind": "3사 통합 번들 37% 결합 할인",
    "title": "Disney+ X TVING X Wavve",
    "subtitle": "디즈니+, 티빙, 웨이브를 한 번에!",
    "description": "KBO 생중계부터 지상파, 디즈니+ 오리지널까지 개별 구독 대비 최대 37% 결합 할인.",
    "saving": 12000,
    "originalPrice": 34300,
    "offerPrice": 22300,
    "dday": 15,
    "sourceServiceIds": [
      "disney",
      "tving",
      "wavve"
    ],
    "link": "https://www.disneyplus.com/ko-kr",
    "monogram": "D",
    "verifiedStatus": "LIVE_CONFIRMED",
    "campaignPeriod": "상시 제휴 (통합 번들 요금제)",
    "benefitPeriod": "번들 요금제 유지 기간 상시",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "adobe-student-66",
    "category": "학생/연간",
    "kind": "학생·교사 66% 특가 할인",
    "title": "Adobe Creative Cloud",
    "subtitle": "모든 앱 20종 66% 할인",
    "description": "포토샵, 프리미어, 일러스트 등 20개 전 앱을 첫해 월 26,400원에 이용하세요. (연 62만 원 절약)",
    "saving": 51700,
    "originalPrice": 78100,
    "offerPrice": 26400,
    "dday": 14,
    "sourceServiceIds": [
      "adobe"
    ],
    "link": "https://www.adobe.com/kr/creativecloud/buy/students.html",
    "monogram": "A",
    "verifiedStatus": "LIVE_CONFIRMED",
    "campaignPeriod": "상시 진행 (교육 기관 재학/재직 인증)",
    "benefitPeriod": "인증 후 1년 (매년 갱신 가능)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "github-student-pack",
    "category": "학생/연간",
    "kind": "학생 Copilot 100% 무료 제공",
    "title": "GitHub Student Pack",
    "subtitle": "GitHub Copilot 무료 이용",
    "description": "학생 인증 시 GitHub Pro 및 AI 코딩 도구 GitHub Copilot(월 14,000원 상당)을 전액 무료 제공.",
    "saving": 14000,
    "originalPrice": 14000,
    "offerPrice": 0,
    "dday": 365,
    "sourceServiceIds": [
      "github-copilot"
    ],
    "link": "https://education.github.com/pack",
    "monogram": "GH",
    "verifiedStatus": "LIVE_CONFIRMED",
    "campaignPeriod": "상시 진행 (교육 기관 재학/재직 인증)",
    "benefitPeriod": "인증 후 1년 (매년 갱신 가능)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "jetbrains-student-free",
    "category": "학생/연간",
    "kind": "학생 전 제품 IDE 100% 무료 라이선스",
    "title": "JetBrains All Products Pack",
    "subtitle": "IntelliJ Ultimate 등 16종 무료",
    "description": "학생증 및 학교 메일 인증 시 연간 37만원 상당의 JetBrains 전 제품을 전액 무료로 이용하세요.",
    "saving": 37000,
    "originalPrice": 37000,
    "offerPrice": 0,
    "dday": 365,
    "sourceServiceIds": [
      "jetbrains-all"
    ],
    "link": "https://www.jetbrains.com/community/education/#students",
    "monogram": "JB",
    "verifiedStatus": "LIVE_CONFIRMED",
    "campaignPeriod": "상시 진행 (교육 기관 재학/재직 인증)",
    "benefitPeriod": "인증 후 1년 (매년 갱신 가능)",
    "lastCheckedAt": "2026-09-28T17:32:46.388Z",
    "lastVerifiedAt": "2026-09-28T17:32:46.388Z"
  },
  {
    "id": "disney-annual-16",
    "category": "학생/연간",
    "kind": "연간 결제 16% 할인 (2개월 무료 효과)",
    "title": "Disney+",
    "subtitle": "연간 결제로 2개월 무료 효과",
    "description": "스탠다드 요금제를 연 99,000원에 결제하여 월 결제 대비 16% 절약하세요.",
    "saving": 19800,
    "originalPrice": 118800,
    "offerPrice": 99000,
    "dday": 365,
    "sourceServiceIds": [
      "disney"
    ],
    "link": "https://www.disneyplus.com/ko-kr",
    "monogram": "D",
    "verifiedStatus": "LIVE_CONFIRMED",
    "campaignPeriod": "상시 운영 (공식 연간 할인 플랜)",
    "benefitPeriod": "결제일로부터 1년 (12개월)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "adobe-new-user-25",
    "category": "경쟁사 프로모",
    "kind": "신규 구독자 첫해 한정 25% 할인",
    "title": "Adobe Creative Cloud",
    "subtitle": "첫해 한정 모든 앱 25% 할인",
    "description": "신규 구독자라면 모든 앱 플랜을 정가 78,100원 대신 첫해 월 58,200원에 이용하세요.",
    "saving": 19900,
    "originalPrice": 78100,
    "offerPrice": 58200,
    "dday": 14,
    "sourceServiceIds": [
      "adobe"
    ],
    "link": "https://www.adobe.com/kr/creativecloud/plans.html",
    "monogram": "A",
    "verifiedStatus": "LIVE_CONFIRMED",
    "campaignPeriod": "상시 진행 (신규 회원 한정)",
    "benefitPeriod": "가입 후 첫 1개월",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "youtube-lite-43",
    "category": "OTT",
    "kind": "Premium Lite 요금제 43% 비용 절감",
    "title": "YouTube Premium Lite",
    "subtitle": "광고 제거 전용 신규 플랜 월 8,500원",
    "description": "YouTube Music 없이 영상 광고만 제거하고 싶은 유저를 위한 43% 저렴한 공식 요금제.",
    "saving": 6400,
    "originalPrice": 14900,
    "offerPrice": 8500,
    "dday": 30,
    "sourceServiceIds": [
      "youtube"
    ],
    "link": "https://www.youtube.com/premium",
    "monogram": "Y",
    "verifiedStatus": "LIVE_CONFIRMED",
    "campaignPeriod": "상시 진행 (신규 회원 한정)",
    "benefitPeriod": "가입 후 첫 1개월",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "midjourney-promo",
    "title": "Midjourney",
    "subtitle": "연간 결제 시 20% 요금 할인",
    "kind": "연간 결제 시 20% 요금 할인",
    "category": "SaaS",
    "description": "1년 정기결제 시 매월 2,800원 절약",
    "saving": 2800,
    "originalPrice": 14000,
    "offerPrice": 11200,
    "dday": 30,
    "sourceServiceIds": [
      "midjourney"
    ],
    "link": "https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans",
    "monogram": "M",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "canva-promo",
    "title": "Canva Pro",
    "subtitle": "초중고 교육용 Canva Pro 100% 무료",
    "kind": "초중고 교육용 Canva Pro 100% 무료",
    "category": "SaaS",
    "description": "교육 기관 인증 시 팀 프로 기능 무료",
    "saving": 12900,
    "originalPrice": 12900,
    "offerPrice": 0,
    "dday": 30,
    "sourceServiceIds": [
      "canva"
    ],
    "link": "https://www.canva.com/education/",
    "monogram": "C",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "framer-promo",
    "title": "Framer Pro",
    "subtitle": "Free 플랜 무료 사이트 호스팅 (0원)",
    "kind": "Free 플랜 무료 사이트 호스팅 (0원)",
    "category": "SaaS",
    "description": "서브도메인 무료 배포로 구독료 대체",
    "saving": 29873,
    "originalPrice": 29873,
    "offerPrice": 0,
    "dday": 30,
    "sourceServiceIds": [
      "framer"
    ],
    "link": "https://www.framer.com",
    "monogram": "F",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "github-copilot-promo",
    "title": "GitHub Copilot",
    "subtitle": "GitHub Student Pack 100% 무료",
    "kind": "GitHub Student Pack 100% 무료",
    "category": "SaaS",
    "description": "학생 개발자 인증 시 Copilot AI 코딩 무료",
    "saving": 14000,
    "originalPrice": 14000,
    "offerPrice": 0,
    "dday": 30,
    "sourceServiceIds": [
      "github-copilot"
    ],
    "link": "https://education.github.com/pack",
    "monogram": "G",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "slack-pro-promo",
    "title": "Slack Pro",
    "subtitle": "비영리 단체 및 교육용 85% 할인",
    "kind": "비영리 단체 및 교육용 85% 할인",
    "category": "SaaS",
    "description": "교육/비영리 프로모션 공식 링크 갱신",
    "saving": 9350,
    "originalPrice": 11000,
    "offerPrice": 1650,
    "dday": 30,
    "sourceServiceIds": [
      "slack-pro"
    ],
    "link": "https://slack.com/intl/ko-kr/solutions/education",
    "monogram": "S",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "zoom-pro-promo",
    "title": "Zoom Workplace Pro",
    "subtitle": "Basic 플랜 40분 화상회의 무료 (0원)",
    "kind": "Basic 플랜 40분 화상회의 무료 (0원)",
    "category": "SaaS",
    "description": "40분 미팅 무제한 무료 생성",
    "saving": 19000,
    "originalPrice": 19000,
    "offerPrice": 0,
    "dday": 30,
    "sourceServiceIds": [
      "zoom-pro"
    ],
    "link": "https://zoom.us/pricing",
    "monogram": "Z",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "ms365-promo",
    "title": "Microsoft 365",
    "subtitle": "대학생 Office 365 Education 100% 무료",
    "kind": "대학생 Office 365 Education 100% 무료",
    "category": "SaaS",
    "description": "학교 웹메일 인증 시 정품 오피스 0원",
    "saving": 8900,
    "originalPrice": 8900,
    "offerPrice": 0,
    "dday": 30,
    "sourceServiceIds": [
      "ms365"
    ],
    "link": "https://www.microsoft.com/ko-kr/education/products/office",
    "monogram": "M",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "evernote-promo",
    "title": "Evernote",
    "subtitle": "학생 인증 시 연간 결제 40% 할인",
    "kind": "학생 인증 시 연간 결제 40% 할인",
    "category": "SaaS",
    "description": "학생증 인증 시 1년간 40% 요금 감면",
    "saving": 4760,
    "originalPrice": 11900,
    "offerPrice": 7140,
    "dday": 30,
    "sourceServiceIds": [
      "evernote"
    ],
    "link": "https://www.evernote.com",
    "monogram": "E",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "1password-promo",
    "title": "1Password",
    "subtitle": "Families 5인 공유 (인당 월 1,500원)",
    "kind": "Families 5인 공유 (인당 월 1,500원)",
    "category": "SaaS",
    "description": "가족 요금제 공유 시 60% 이상 비용 절약",
    "saving": 3000,
    "originalPrice": 4500,
    "offerPrice": 1500,
    "dday": 30,
    "sourceServiceIds": [
      "1password"
    ],
    "link": "https://1password.com",
    "monogram": "1",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "youtube-promo",
    "title": "YouTube Premium",
    "subtitle": "1개월 0원 무료 체험 + Lite 43% 할인",
    "kind": "1개월 0원 무료 체험 + Lite 43% 할인",
    "category": "OTT",
    "description": "신규 가입 시 첫 달 0원 체험",
    "saving": 14900,
    "originalPrice": 14900,
    "offerPrice": 0,
    "dday": 30,
    "sourceServiceIds": [
      "youtube"
    ],
    "link": "https://www.youtube.com/premium",
    "monogram": "Y",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "appletv-promo",
    "title": "Apple TV+",
    "subtitle": "7일 무료 체험 (신규 기기 구매 시 3개월)",
    "kind": "7일 무료 체험 (신규 기기 구매 시 3개월)",
    "category": "OTT",
    "description": "7일 무료, Apple 신규 기기 구입 시 3개월 0원",
    "saving": 6500,
    "originalPrice": 6500,
    "offerPrice": 0,
    "dday": 30,
    "sourceServiceIds": [
      "appletv"
    ],
    "link": "https://support.apple.com",
    "monogram": "A",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "genie-promo",
    "title": "Genie Music",
    "subtitle": "스마트 음악감상 2회차 다음 달 110원",
    "kind": "스마트 음악감상 2회차 다음 달 110원",
    "category": "음악",
    "description": "1회차 결제 시 다음 달 110원 특가",
    "saving": 8290,
    "originalPrice": 8400,
    "offerPrice": 110,
    "dday": 30,
    "sourceServiceIds": [
      "genie"
    ],
    "link": "https://www.genie.co.kr",
    "monogram": "G",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "applemusic-promo",
    "title": "Apple Music",
    "subtitle": "1개월 무료 (기기 구매 시 6개월 무료)",
    "kind": "1개월 무료 (기기 구매 시 6개월 무료)",
    "category": "음악",
    "description": "1개월 무료, AirPods 구매 시 6개월 0원",
    "saving": 8900,
    "originalPrice": 8900,
    "offerPrice": 0,
    "dday": 30,
    "sourceServiceIds": [
      "applemusic"
    ],
    "link": "https://support.apple.com",
    "monogram": "A",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "ytmusic-promo",
    "title": "YouTube Music",
    "subtitle": "YouTube Premium 가입 시 Music 0원 무료",
    "kind": "YouTube Premium 가입 시 Music 0원 무료",
    "category": "음악",
    "description": "유튜브 프리미엄 구독 시 뮤직 자동 포함",
    "saving": 11990,
    "originalPrice": 11990,
    "offerPrice": 0,
    "dday": 30,
    "sourceServiceIds": [
      "ytmusic"
    ],
    "link": "https://music.youtube.com",
    "monogram": "Y",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "millie-promo",
    "title": "밀리의 서재",
    "subtitle": "10주년 기념 1+1 (둘째 달 0원)",
    "kind": "10주년 기념 1+1 (둘째 달 0원)",
    "category": "도서/웹툰",
    "description": "첫 달 결제 시 둘째 달 이용권 무료 증정",
    "saving": 9900,
    "originalPrice": 9900,
    "offerPrice": 0,
    "dday": 30,
    "sourceServiceIds": [
      "millie"
    ],
    "link": "https://www.millie.co.kr/",
    "monogram": "밀",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "nyt-digital-promo",
    "title": "The New York Times",
    "subtitle": "All Access 첫해 주 $0.50 특가 (월 약 2,600원)",
    "kind": "All Access 첫해 주 $0.50 특가 (월 약 2,600원)",
    "category": "도서/웹툰",
    "description": "주 0.5달러 특가 적용",
    "saving": 23400,
    "originalPrice": 6000,
    "offerPrice": 2600,
    "dday": 30,
    "sourceServiceIds": [
      "nyt-digital"
    ],
    "link": "https://www.nytimes.com",
    "monogram": "T",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "ft-digital-promo",
    "title": "Financial Times",
    "subtitle": "Financial Times 4주 시험구독 1달러",
    "kind": "Financial Times 4주 시험구독 1달러",
    "category": "도서/웹툰",
    "description": "첫 달 1,400원 파격가 체험 지원",
    "saving": 43600,
    "originalPrice": 45000,
    "offerPrice": 1400,
    "dday": 30,
    "sourceServiceIds": [
      "ft-digital"
    ],
    "link": "https://www.ft.com",
    "monogram": "F",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "audible-promo",
    "title": "Audible",
    "subtitle": "Audible 30일 무료 + 1권 영구소장",
    "kind": "Audible 30일 무료 + 1권 영구소장",
    "category": "도서/웹툰",
    "description": "첫 달 0원 + 베스트셀러 1권 무료 소장",
    "saving": 11000,
    "originalPrice": 11000,
    "offerPrice": 0,
    "dday": 30,
    "sourceServiceIds": [
      "audible"
    ],
    "link": "https://www.audible.com",
    "monogram": "A",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "scribd-promo",
    "title": "Scribd",
    "subtitle": "Scribd 30일 0원 무료 체험",
    "kind": "Scribd 30일 0원 무료 체험",
    "category": "도서/웹툰",
    "description": "전자책 및 논문 30일간 0원",
    "saving": 13000,
    "originalPrice": 13000,
    "offerPrice": 0,
    "dday": 30,
    "sourceServiceIds": [
      "scribd"
    ],
    "link": "https://www.scribd.com",
    "monogram": "S",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "apple-arcade-promo",
    "title": "Apple Arcade",
    "subtitle": "1개월 0원 무료 (기기 구매 시 3개월)",
    "kind": "1개월 0원 무료 (기기 구매 시 3개월)",
    "category": "게임/엔터",
    "description": "인앱결제 없는 200개 게임 무료 플레이",
    "saving": 6500,
    "originalPrice": 6500,
    "offerPrice": 0,
    "dday": 30,
    "sourceServiceIds": [
      "apple-arcade"
    ],
    "link": "https://support.apple.com/billing",
    "monogram": "A",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
  },
  {
    "id": "naver-mybox-promo",
    "title": "네이버 MYBOX",
    "subtitle": "기본 30GB 영구 0원 무료 제공",
    "kind": "기본 30GB 영구 0원 무료 제공",
    "category": "생활/모빌리티",
    "description": "네이버 계정 기본 30GB 무료 클라우드",
    "saving": 1650,
    "originalPrice": 1650,
    "offerPrice": 0,
    "dday": 30,
    "sourceServiceIds": [
      "naver-mybox"
    ],
    "link": "https://mybox.naver.com",
    "monogram": "네",
    "benefitPeriod": "상시 진행 (공식 검증 완료)",
    "campaignPeriod": "상시 진행 (인증 프로모션)",
    "lastCheckedAt": "2026-09-28T17:28:02.172Z",
    "verifiedStatus": "LIVE_CONFIRMED",
    "lastVerifiedAt": "2026-09-28T17:28:02.172Z"
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
