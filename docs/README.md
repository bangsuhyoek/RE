# SubMate 기술·운영·정책 문서 총괄 색인 (Documentation Index)

**최종 갱신: 2026-10-19**  
**원칙: 기존 문서는 절대 임의 삭제하지 않으며, 변경사항은 개정 이력을 보존하여 관리합니다.**

---

## 1. 아키텍처 및 시스템 운영 문서

| 문서명 | 파일 경로 | 설명 |
| :--- | :--- | :--- |
| **시스템 아키텍처** | [ARCHITECTURE.md](ARCHITECTURE.md) | Web/Capacitor/Vercel/Supabase 전체 구조, 온디바이스 데이터 흐름 및 보안 모델 |
| **배포 가이드** | [DEPLOYMENT.md](DEPLOYMENT.md) | Supabase 마이그레이션 우선 순서, Vercel 환경 변수, Android 릴리스 서명, Gemini 키 교체 |
| **운영 런북** | [RUNBOOK.md](RUNBOOK.md) | 정기 크롤러 워크플로, 데이터 보존 주기 점검, 장애 대응 절차, 사용량 한도 관리 |

---

## 2. 법적 약관 및 컴플라이언스 (`docs/terms/`)

| 문서명 | 파일 경로 | 설명 |
| :--- | :--- | :--- |
| **법적 문서 총괄** | [terms/README.md](terms/README.md) | 약관 및 스토어 심사 대응 가이드 |
| **서비스 이용약관** | [terms/01_TERMS_OF_SERVICE.md](terms/01_TERMS_OF_SERVICE.md) | 구독 관리 및 해지 보조 서비스 이용 계약, 면책 조항 |
| **개인정보 처리방침** | [terms/02_PRIVACY_POLICY.md](terms/02_PRIVACY_POLICY.md) | Google OAuth 단일화, Gemini 유료 등급(학습 미사용), Supabase AES-256 저장 암호화 |
| **앱 접근 권한 고지** | [terms/03_APP_PERMISSIONS_AND_CONSENTS.md](terms/03_APP_PERMISSIONS_AND_CONSENTS.md) | targetSdk 36 기준 최소 권한 고지, 오버레이 제거, AI 해지 도우미 고지 |
| **Play Data Safety** | [terms/PLAY_DATA_SAFETY.md](terms/PLAY_DATA_SAFETY.md) | Google Play Console 데이터 보안 질의서 항목별 공식 신고 명세서 |

---

## 3. 제품 기획 및 사양 (PRD & Specifications)

| 문서명 | 파일 경로 | 설명 |
| :--- | :--- | :--- |
| **구독 승인 에이전트 PRD** | [PRD_SUBSCRIPTION_APPROVAL_AGENT.md](PRD_SUBSCRIPTION_APPROVAL_AGENT.md) | 구독 승인 에이전트 제품 요구사항 및 상태 정의서 (v1.6) |
| **에이전트 결제 제안서** | [PROPOSAL_CARD_AGENT_PAYMENT.md](PROPOSAL_CARD_AGENT_PAYMENT.md) | 카드사 제휴 및 에이전트 결제 연동 제안서 (3단계) |
| **결제 메시지 레퍼런스** | [PAYMENT_MESSAGE_REFERENCE.md](PAYMENT_MESSAGE_REFERENCE.md) | 카드사/은행/간편결제 알림 포맷 및 파싱 규칙 레퍼런스 |
| **프로모션 크롤러 설계** | [superpowers/specs/2026-10-16-promotion-crawler-design.md](superpowers/specs/2026-10-16-promotion-crawler-design.md) | 프로모션 수집 및 검증 파이프라인 아키텍처 사양서 |
| **프로모션 크롤러 계획** | [superpowers/plans/2026-10-16-promotion-crawler-plan.md](superpowers/plans/2026-10-16-promotion-crawler-plan.md) | 크롤러 개발 단계별 작업 계획서 |

---

## 4. 해지 리서치 문서 위치 안내 (Cancellation Research)

SubMate의 핵심 차별화 요소인 구독 해지 관련 리서치는 연구 목적과 형태에 따라 아래 세 곳에 분산 보존되어 있으며, 모든 파일은 영구 보존됩니다:

```text
docs/
  ├── RESEARCH_SUBSCRIPTION_CANCELLATION_INNOVATION.md  [1. 해지 UX 및 혁신 전략 리서치]
  ├── RESEARCH_LOW_PERMISSION_CANCEL.md                 [2. 저권한 해지 아키텍처 리서치]
  └── research/
        ├── llm-fallback-notes.md                       [LLM 폴백 전략 노트]
        └── cancel-flows/                               [3. 서비스별 해지 경로 데이터셋]
              ├── coverage-report.md                    (카테고리별 해지 커버리지 분석)
              ├── ott.json                              (넷플릭스, 티빙, 디즈니+, 웨이브, 왓챠, 쿠팡플레이)
              ├── music_1.json, music_2.json            (멜론, 지니, 스포티파이, 벅스, 유튜브뮤직, 플로)
              ├── saas_1.json ~ saas_4.json             (ChatGPT, 노션, 클로드, 퍼플렉시티 등 SaaS)
              ├── books_news.json                       (밀리의서재, 리디북스 등)
              ├── education.json                        (듀오링고 등 교육)
              └── game_life_shop.json                   (요기요, 컬리 등 라이프/커머스)
```

### 상세 설명
1. **[해지 UX 및 혁신 전략 리서치](RESEARCH_SUBSCRIPTION_CANCELLATION_INNOVATION.md)**:
   - 국내외 20+ 주요 서비스의 다크패턴(해지 버튼 은닉, 긴 설문 강제, 전화 해지 유도) 실태 조사 및 법적 규제(개정 전자상거래법) 분석.
   - 사용자 중심의 해지 및 환불 지원 자동화 모델 제시.
2. **[저권한 해지 아키텍처 리서치](RESEARCH_LOW_PERMISSION_CANCEL.md)**:
   - 보안 및 스토어 검수 위험이 높은 안드로이드 접근성 서비스(`AccessibilityService`)나 시스템 오버레이(`SYSTEM_ALERT_WINDOW`)를 쓰지 않고, 인앱 해지 브라우저(`CancelBrowserActivity`)와 선언적 라우팅(`declarative`)을 통해 안전하게 해지를 돕는 저권한(Low-permission) 아키텍처 설계 근거.
3. **[서비스별 해지 경로 데이터셋](research/cancel-flows/)**:
   - 실제 30개 이상 서비스의 웹/앱 해지 단계별 URL, 셀렉터, 버튼 텍스트, 확인 플로우를 체계적으로 구조화한 JSON 데이터셋 및 커버리지 보고서([coverage-report.md](research/cancel-flows/coverage-report.md)).
   - AI 해지 도우미가 다음 단계를 판단하지 못했을 때를 대비한 폴백 전략([llm-fallback-notes.md](research/llm-fallback-notes.md)) 포함.

---

## 5. 기타 리서치 문서

- **[마이데이터 자동 탐색 리서치](RESEARCH_MYDATA_AUTODISCOVERY.md)**: 마이데이터 API를 활용한 금융 구독 결제 내역 자동 탐색 가능성 및 규제 검토 보고서.
