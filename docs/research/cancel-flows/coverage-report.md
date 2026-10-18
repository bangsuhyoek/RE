# SubMate Cancel Scanner Coverage & Accuracy Analysis Report

> **분석 목적**: 실측 취소 플로우 데이터를 바탕으로 SubMate의 키워드 기반 시맨틱 캔슬 스캐너(UniversalCancelRoute & AutoAdvancer)의 버튼 분류 성능을 측정하고, 단순 키워드/라우트 확장으로 대응 가능한지 또는 LLM 폴백 도입이 필요한지 기술적 의사결정 근거를 제공합니다.

## 1. Executive Summary (요약 및 총계)

| 분류 항목 | 대상 수 | 비율 | 비고 |
| :--- | :---: | :---: | :--- |
| **전체 고유 서비스 (Catalog DB)** | **94** | 100.0% | 실측 연구 대상 전체 (OTT, 음원, SaaS, 교육, 도서/뉴스, 게임/생활 등) |
| **- 전용 전담 라우트 (Dedicated)** | **3** | 3.2% | 네이버플러스, 넷플릭스, 유튜브 (별도 하드코딩 라우트 처리) |
| **- 비(非) 웹 전용 서비스 (Non-Web)** | **11** | 11.7% | 앱 전용(app_only: 5), 스토어 결제 전용(store_only: 6) — 웹 에이전트 불가 |
| **- 시맨틱 스캐너 평가 대상 (Web)** | **80** | 85.1% | 실시간 키워드 스캐너 매칭 시뮬레이션 대상 |

### 시맨틱 스캐너 시뮬레이션 결과 (Web 80개 서비스 기준)

| 평가 기준 (다이얼로그 룰 적용 여부) | OK (완전 자동 가이드 성공) | STUCK (중간 단계 누락 -> 수동 폴백) | UNSAFE (최종 확인 버튼 자동 클릭 위험) | 계 |
| :--- | :---: | :---: | :---: | :---: |
| **기본 환경 (inDialog = false)** | **6** (7.5%) | **64** (80.0%) | **10** (12.5%) | 80 (100%) |
| **팝업 다이얼로그 환경 (inDialog = true)** | **6** (7.5%) | **72** (90.0%) | **2** (2.5%) | 80 (100%) |

**핵심 결론**:
1. **STUCK 비율 80~90%**: 현행 스캐너 키워드셋은 `마이페이지`, `Settings`, `Subscription`, `Billing`, `멤버십 취소` 등 가장 흔한 영문 및 기본 메뉴 레이블을 전혀 포함하지 않아 대다수 서비스의 1~2단계에서 탐색이 중단됩니다.
2. **치명적 UNSAFE 위험 (10개 서비스 / 12.5%)**: 최종 해지 확인 버튼 레이블이 `구독 해지 예약`, `Cancel Subscription`, `혜택 포기`, `구독 취소`, `해지하기` 등으로 구성된 경우, stage-2 또는 stage-3로 잘못 분류되어 AutoAdvancer에 의해 **사용자 동의 없이 자동 클릭**되는 치명적 안전 결함이 발생합니다. (단, 최종 확인창이 모달 팝업으로 인식될 경우 8개는 다이얼로그 룰로 stage 4 전환되어 방어되나, melon과 primevideo 2개는 여전히 auto-tap 위험이 남습니다).
3. **카탈로그 cancelUrl 결함**: 94개 중 51개(54.3%) 서비스가 로그인 리다이렉트(302), Cloudflare WAF 차단(403), 딥링크 불량 상태로, 브라우저 세션 직접 진입 시 자동화 차단 및 세션 유실 위험이 큽니다.

## 2. UNSAFE 케이스 상세 분석 (최종 확인 자동 클릭 위험)

최종 해지 확인 버튼(`final_confirm`)이 stage 4로 인식되지 않고 stage 1~3으로 분류되면서, GuardResult의 2차 stage-2 가드가 누락되거나 stage-3/stage-1으로 분류되어 `autoTap = true`가 발생하는 치명적 사례입니다.

| 서비스 ID | 서비스명 | 최종 버튼 레이블 (`final_confirm`) | 매칭된 스테이지 | 원인 및 안전 위험 설명 |
| :--- | :--- | :--- | :---: | :--- |
| `ridiselect` | 리디셀렉트 | `구독 해지 예약` | Stage 2 | [구독 해지 예약]이 stage2Words("구독 해지")에 매칭. 앞 단계(구독 관리)가 stage 1이어서 첫 stage 2로 간주되어 자동 클릭됨. |
| `nyt-digital` | The New York Times | `Cancel Subscription` | Stage 2 | [Cancel Subscription]이 stage 2 매칭. 2단계 [Cancel your Subscription]이 stage 0으로 누락되어 최종 버튼이 첫 stage 2로 자동 클릭됨. |
| `melon` | Melon | `혜택 포기` | Stage 3 | 최종 팝업 버튼 [혜택 포기]가 stage3Words("혜택 포기")에 매칭되어 stage 3 판정. 중간 단계에서 2차 stage 2 가드가 적용되지 않아 자동 클릭됨. |
| `flo` | FLO | `해지예약 (이용권 해지 예약)` | Stage 2 | [해지예약 (이용권 해지 예약)]이 stage2Words("이용권 해지")에 매칭. 이전 단계에 stage 2가 없어 첫 번째 stage 2로 인식되어 autoTap=true 판정. |
| `bugs` | Bugs | `해지하기` | Stage 2 | [해지하기]가 stage 2 매칭. 2단계 [자동결제 관리/해지]가 누락되어 최종 버튼이 첫 stage 2로 자동 클릭 판정. |
| `applemusic` | Apple Music | `구독 취소` | Stage 2 | [구독 취소]가 stage 2 매칭. 이전 nav 단계들이 영문/경로 복합으로 stage 0 처리되어 최종 취소가 첫 stage 2로 자동 클릭됨. |
| `welaaa` | 윌라 오디오북 | `해지하기` | Stage 2 | [해지하기]가 stage 2 매칭. 1단계 [해지신청]이 stage 0으로 누락되어 [해지하기]가 첫 stage 2가 됨으로써 자동 클릭 위험. |
| `primevideo` | Amazon Prime Video | `내 멤버십 종료` | Stage 1 | 최종 버튼 [내 멤버십 종료]가 stage1Words("내 멤버십")에 매칭되어 stage 1 판정. stage 1은 탐색 메뉴로 간주되어 무조건 자동 클릭됨. |
| `perplexity-pro` | Perplexity Pro | `Cancel subscription` | Stage 2 | [Cancel subscription]이 stage 2 매칭. 2단계 [Manage Subscription]은 stage 1이므로 취소 버튼이 첫 stage 2로 자동 클릭됨. |
| `evernote` | Evernote | `Cancel subscription` | Stage 2 | [Cancel subscription]이 stage 2 매칭. 2단계가 stage 0(긴 텍스트) 누락되어 최종 버튼이 첫 stage 2로 자동 클릭됨. |

> **inDialog = true 적용 시**: ridiselect, nyt-digital, flo, bugs, applemusic, welaaa, perplexity-pro, evernote 8개 서비스는 다이얼로그 룰에 의해 stage 4(수동 탭)로 전환되어 방어됩니다. 하지만 **Melon([혜택 포기] -> stage 3)**과 **Prime Video([내 멤버십 종료] -> stage 1)** 2개는 다이얼로그 안에서도 키워드 우선순위로 인해 여전히 자동 클릭 위험이 유지됩니다.

## 3. 웹 서비스별 상세 시뮬레이션 결과 (80개 서비스)

| 서비스 ID | 서비스명 | 분류 결과 (기본) | 다이얼로그 결과 | 첫 번째 실패/중단 스텝 레이블 | 최종 버튼 처리 |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `millie` | 밀리의 서재 | **STUCK** | **STUCK** | Step 1 (nav): `관리` | `지금 바로 해지하기` (USER) |
| `ridiselect` | 리디셀렉트 | **UNSAFE** | **STUCK** | Step 1 (nav): `셀렉트 > 설정` | `구독 해지 예약` (⚠️ AUTO) |
| `longblack` | 롱블랙 | **STUCK** | **STUCK** | Step 1 (nav): `마이페이지` | `확인` (USER) |
| `the-joongang-plus` | 더중앙플러스 | **STUCK** | **STUCK** | Step 1 (nav): `마이페이지` | `해지하기` (USER) |
| `nyt-digital` | The New York Times | **UNSAFE** | **STUCK** | Step 1 (nav): `Subscription Overview` | `Cancel Subscription` (⚠️ AUTO) |
| `wsj-digital` | The Wall Street Journal | **STUCK** | **STUCK** | Step 1 (nav): `My Account` | `Confirm` (USER) |
| `ft-digital` | Financial Times | **STUCK** | **STUCK** | Step 1 (nav): `My Account` | `Confirm cancellation` (USER) |
| `the-economist` | The Economist | **STUCK** | **STUCK** | Step 1 (nav): `My Account` | `Continue to cancel / Confirm` (USER) |
| `audible` | Audible | **STUCK** | **STUCK** | Step 1 (nav): `Hi, [Name]! > Account details` | `Finish canceling` (USER) |
| `scribd` | Scribd | **STUCK** | **STUCK** | Step 1 (nav): `Your account` | `Continue to cancel / Confirm Cancellation` (USER) |
| `duolingo` | Duolingo Super | **STUCK** | **STUCK** | Step 1 (nav): `Settings` | `Confirm` (USER) |
| `ringle` | Ringle | **STUCK** | **STUCK** | Step 1 (nav): `마이페이지` | `해지 신청` (USER) |
| `cambly` | Cambly | **STUCK** | **STUCK** | Step 1 (nav): `Account Settings` | `Cancel Plan / 플랜 취소 확정` (USER) |
| `class101` | CLASS101+ | **STUCK** | **STUCK** | Step 1 (nav): `마이페이지` | `해지 신청하기` (USER) |
| `fastcampus` | 패스트캠퍼스 | **STUCK** | **STUCK** | Step 1 (nav): `내 강의실` | `해지 신청` (USER) |
| `inflearn` | 인프런 | **STUCK** | **STUCK** | Step 1 (nav): `마이페이지` | `해지 확인` (USER) |
| `coursera` | Coursera Plus | **STUCK** | **STUCK** | Step 1 (nav): `My Purchases (내 구입)` | `Cancel Subscription (구독 취소)` (USER) |
| `nintendo-online` | Nintendo Switch Online | **STUCK** | **STUCK** | Step 1 (nav): `Nintendo Switch Online` | `갱신 정지` (USER) |
| `ps-plus` | PlayStation Plus | **STUCK** | **STUCK** | Step 1 (nav): `PlayStation Plus` | `정기 구독 취소 확인` (USER) |
| `xbox-gamepass` | Xbox Game Pass Ultimate | **STUCK** | **STUCK** | Step 1 (nav): `관리` | `반복 청구 끄기` (USER) |
| `google-play-pass` | Google Play Pass | **STUCK** | **STUCK** | Step 1 (nav): `Google Play Pass` | `구독 취소` (USER) |
| `ea-play` | EA Play | **STUCK** | **STUCK** | Step 1 (nav): `EA Play` | `취소 확인` (USER) |
| `wow-subscription` | World of Warcraft 정액제 | **STUCK** | **STUCK** | Step 1 (nav): `World of Warcraft 계정` | `정기 결제 취소` (USER) |
| `kakaotalk-drive` | 카카오톡 톡서랍 플러스 | **OK** | **OK** | - | `해지하기` (USER) |
| `kakaotalk-emoticon` | 카카오톡 이모티콘 플러스 | **STUCK** | **STUCK** | Step 1 (nav): `이모티콘 플러스 관리` | `해지하기` (USER) |
| `naver-mybox` | 네이버 MYBOX | **STUCK** | **STUCK** | Step 1 (nav): `이용권 / 결제 관리` | `확인` (USER) |
| `strava-sub` | Strava | **STUCK** | **STUCK** | Step 2 (cancel_entry): `멤버십 취소` | `멤버십 취소` (USER) |
| `kurly-pass` | 컬리멤버스 | **STUCK** | **STUCK** | Step 1 (nav): `컬리멤버스 관리` | `해지하기` (USER) |
| `coupang` | 쿠팡 와우 멤버십 | **OK** | **OK** | - | `해지하기` (USER) |
| `melon` | Melon | **UNSAFE** | **UNSAFE** | Step 1 (nav): `내 정보` | `혜택 포기` (⚠️ AUTO) |
| `spotify` | Spotify | **STUCK** | **STUCK** | Step 1 (nav): `계정 페이지 로 이동` | `Premium 해지` (USER) |
| `genie` | Genie Music | **STUCK** | **STUCK** | Step 1 (nav): `프로필(마이뮤직)` | `해지신청` (USER) |
| `flo` | FLO | **UNSAFE** | **STUCK** | Step 1 (nav): `홈 화면 오른쪽 위 톱니바퀴 버튼 (또는 웹: 이용권 메뉴)` | `해지예약 (이용권 해지 예약)` (⚠️ AUTO) |
| `bugs` | Bugs | **UNSAFE** | **STUCK** | Step 1 (nav): `내 정보 (또는 이용권 관리 / sitemap: https://music.bugs.co.kr/myinfo/goods)` | `해지하기` (⚠️ AUTO) |
| `vibe` | NAVER VIBE | **STUCK** | **STUCK** | Step 1 (nav): `우측 상단 프로필 이미지 > My 멤버십 (또는 vibe.naver.com/membership)` | `정기결제 해지하기 (또는 혜택 포기하고 해지하기)` (USER) |
| `applemusic` | Apple Music | **UNSAFE** | **STUCK** | Step 1 (nav): `music.apple.com/kr 이동 및 나의 계정 아이콘 (또는 iOS 설정 > 사용자 이름)` | `구독 취소` (⚠️ AUTO) |
| `ytmusic` | YouTube Music | **STUCK** | **STUCK** | Step 3 (retention): `취소하려면 계속` | `취소` (USER) |
| `tidal` | TIDAL | **STUCK** | **STUCK** | Step 1 (nav): `Subscription` | `Confirm cancellation` (USER) |
| `podbbang` | 팟빵 오디오매거진 | **OK** | **OK** | - | `해지하기` (USER) |
| `welaaa` | 윌라 오디오북 | **UNSAFE** | **STUCK** | Step 1 (cancel_entry): `해지신청` | `해지하기` (⚠️ AUTO) |
| `storytel` | Storytel | **STUCK** | **STUCK** | Step 3 (survey): `계속` | `구독 취소 확인` (USER) |
| `tving` | TVING | **OK** | **OK** | - | `해지 신청하기` (USER) |
| `disney` | Disney+ | **STUCK** | **STUCK** | Step 1 (nav): `구독 플랜` | `Disney+ 취소 완료` (USER) |
| `wavve` | Wavve | **STUCK** | **STUCK** | Step 1 (nav): `나의 이용권` | `해지하기` (USER) |
| `watcha` | WATCHA | **STUCK** | **STUCK** | Step 2 (cancel_entry): `구독을 해지하고 싶어요` | `해지할게요` (USER) |
| `coupangplay` | Coupang Play | **OK** | **OK** | - | `해지 신청하기` (USER) |
| `laftel` | Laftel | **STUCK** | **STUCK** | Step 1 (nav): `결제 예정` | `멤버십 해지하기` (USER) |
| `appletv` | Apple TV+ | **STUCK** | **STUCK** | Step 1 (nav): `설정` | `확인` (USER) |
| `primevideo` | Amazon Prime Video | **UNSAFE** | **UNSAFE** | Step 1 (nav): `내 계정` | `내 멤버십 종료` (⚠️ AUTO) |
| `spotvnow` | SPOTV NOW | **STUCK** | **STUCK** | Step 1 (nav): `이용권/결제 관리` | `해지하기` (USER) |
| `crunchyroll` | Crunchyroll | **STUCK** | **STUCK** | Step 1 (nav): `Membership Plan` | `Cancel Subscription` (USER) |
| `mubi` | MUBI | **STUCK** | **STUCK** | Step 1 (nav): `Subscription` | `Cancel Subscription` (USER) |
| `dazn` | DAZN | **STUCK** | **STUCK** | Step 1 (nav): `구독` | `구독 취소` (USER) |
| `chatgpt` | ChatGPT Plus | **STUCK** | **STUCK** | Step 1 (nav): `Account menu (bottom left avatar/name) > Settings` | - |
| `claude-pro` | Claude Pro | **STUCK** | **STUCK** | Step 1 (nav): `Initials or name (lower left corner) > Settings` | - |
| `perplexity-pro` | Perplexity Pro | **UNSAFE** | **STUCK** | Step 1 (nav): `Scroll to Subscription under Perplexity Pro` | `Cancel subscription` (⚠️ AUTO) |
| `midjourney` | Midjourney | **STUCK** | **STUCK** | Step 1 (nav): `Sign In (via Discord or Google)` | `Confirm cancellation (or Cancel at end of cycle / Refund if <20 GPU min)` (USER) |
| `runway-gen` | Runway Gen-4.5 | **STUCK** | **STUCK** | Step 1 (nav): `Plans & Billing (app.runwayml.com/settings/plans)` | `Cancel Plan` (USER) |
| `v0-vercel` | v0 by Vercel | **STUCK** | **STUCK** | Step 1 (nav): `Navigate to v0 Billing Page` | - |
| `figma` | Figma Professional | **STUCK** | **STUCK** | Step 1 (nav): `Locate Professional team > Admin` | `Cancel plan` (USER) |
| `canva` | Canva Pro | **STUCK** | **STUCK** | Step 1 (nav): `설정` | `구독 취소 완료` (USER) |
| `adobe` | Adobe Creative Cloud | **STUCK** | **STUCK** | Step 2 (cancel_entry): `내 플랜 취소` | `취소 확인` (USER) |
| `framer` | Framer Pro | **STUCK** | **STUCK** | Step 1 (nav): `Settings` | `Cancel Plan` (USER) |
| `webflow` | Webflow | **STUCK** | **STUCK** | Step 1 (nav): `Site settings` | `Downgrade to Starter` (USER) |
| `cursor-ai` | Cursor Pro | **STUCK** | **STUCK** | Step 1 (cancel_entry): `Manage in Stripe` | `Cancel Plan` (USER) |
| `github-copilot` | GitHub Copilot | **STUCK** | **STUCK** | Step 1 (nav): `Settings` | `Cancel Copilot Pro` (USER) |
| `jetbrains-all` | JetBrains All Products | **STUCK** | **STUCK** | Step 1 (nav): `Sign In` | `Confirm` (USER) |
| `deepl-pro` | DeepL Pro | **STUCK** | **STUCK** | Step 1 (nav): `Subscription (�l��)` | `Cancel subscription (�l�� ����)` (USER) |
| `grammarly` | Grammarly | **STUCK** | **STUCK** | Step 1 (nav): `Account` | `Cancel Subscription` (USER) |
| `slack-pro` | Slack Pro | **STUCK** | **STUCK** | Step 1 (nav): `Admin (�ĭl � �$� / � ��)` | `Downgrade Slack (Slack ��ƴ����t��)` (USER) |
| `zoom-pro` | Zoom Workplace Pro | **STUCK** | **STUCK** | Step 1 (nav): `Account Management (��� � ��) > Billing (̭�l)` | `Confirm Cancellation (���� �U�x)` (USER) |
| `ms365` | Microsoft 365 | **STUCK** | **STUCK** | Step 1 (nav): `Manage (� ��)` | `I do not want my subscription (�l���D ���X�� �Jµ�Ȳ�)` (USER) |
| `google-one` | Google One | **OK** | **OK** | - | `Cancel membership (�d���� ����)` (USER) |
| `dropbox` | Dropbox | **STUCK** | **STUCK** | Step 1 (nav): `Avatar (profile picture or initials) in bottom-left corner > Manage account` | `Continue canceling or Confirm change` (USER) |
| `evernote` | Evernote | **UNSAFE** | **STUCK** | Step 1 (nav): `Billing (from left-hand side menu)` | `Cancel subscription` (⚠️ AUTO) |
| `todoist` | Todoist | **STUCK** | **STUCK** | Step 1 (nav): `Avatar at top-left > Settings` | `Cancel subscription` (USER) |
| `1password` | 1Password | **STUCK** | **STUCK** | Step 1 (nav): `Billing (in the sidebar)` | `Follow onscreen instructions / Confirm cancellation` (USER) |
| `nordvpn` | NordVPN | **STUCK** | **STUCK** | Step 1 (nav): `Billing (left navigation sidebar)` | `Cancel auto-renewal` (USER) |
| `notion` | Notion Plus | **STUCK** | **STUCK** | Step 1 (nav): `Settings` | `Downgrade` (USER) |
| `adobe-lightroom` | Adobe Lightroom Mobile Premium | **STUCK** | **STUCK** | Step 2 (cancel_entry): `Cancel your plan` | `Confirm cancellation` (USER) |


## 4. STUCK 원인 분석 및 누락 키워드 목록 (Stage별)

### Stage 1 (네비게이션 / 계정 / 플랜 관리 메뉴 누락)
- **빈도 높은 영문 네비게이션**: `Subscription`, `Settings`, `My Account`, `Billing`, `Plans`, `Your account`, `Account details`, `Payment & Billing`
- **국문 계정/메뉴**: `마이페이지`, `설정`, `내 정보`, `관리`, `결제 내역`, `수강권/결제 관리`, `내 계정`
- **복합/브랜드별 메뉴**: `셀렉트 > 설정`, `Super Duolingo`, `사용 중인 이용권 > 상세보기`

### Stage 2 (해지 신청 / 구독 취소 진입점 누락)
- **국문 해지 진입어**: `멤버십 취소` (3개 서비스 빈출), `해지신청` (붙여쓰기), `정기 결제 취소` (띄어쓰기), `자동 연장 결제의 갱신 정지`, `구독을 해지하고 싶어요`, `해지 예약`, `구독 패스 확인`
- **영문 취소 진입어**: `Cancel your Subscription`, `Cancel your Evernote subscription`, `Manage plan cancellation`
- **보안/확인 스텝**: `비밀번호 입력` (스캐너가 폼 필드로 감지 못하고 버튼으로 스캔 실패함)

### Stage 3 (리텐션 / 만류 / 설문 단계 누락)
- **만류 계속 진행**: `Continue canceling`, `취소하려면 계속`, `취소 계속 진행`, `취소 계속하기`, `계속`, `Continue`, `다음`
- **다운그레이드 유도**: `Downgrade to Free`, `Select Free Plan > Continue`, `Continue to downgrade`
- **설문 조사 라디오/버튼**: `Select cancellation reason`, `Provide a reason for canceling`, `해지 사유 선택`, `Choose a reason for the cancellation`

### Stage 4 (최종 해지 확인 누락 — STUCK 유발 케이스)
- **확인/완료 버튼**: `확인`, `Confirm`, `취소 확인`, `해지 확인`, `Finish canceling`, `갱신 정지`, `반복 청구 끄기`, `Disney+ 취소 완료`, `Downgrade to Starter`

## 5. 비(非) 웹 전용 서비스 (11개)

| 서비스 ID | 서비스명 | 취소 채널 (`cancelChannel`) | 지원 한계 및 비고 |
| :--- | :--- | :---: | :--- |
| `speak` | Speak | `app_only` | 모바일 앱 내 결제 관리 전용 (웹 구독 관리 페이지 없음) |
| `santatoeic` | 산타토익 | `store_only` | 스토어 인앱결제 전용 (Google Play / App Store 관리) |
| `malhaeboca` | 말해보카 | `store_only` | 스토어 인앱결제 전용 (Google Play / App Store 관리) |
| `apple-arcade` | Apple Arcade | `store_only` | 스토어 인앱결제 전용 (Google Play / App Store 관리) |
| `burnfit-pro` | 번핏 Pro | `store_only` | 스토어 인앱결제 전용 (Google Play / App Store 관리) |
| `baemin-club` | 배민클럽 | `app_only` | 배민 앱 전용 (웹 주문/멤버십 관리 미지원) |
| `yogipass` | 요기패스X | `app_only` | 요기요 모바일 앱 전용 |
| `bubble-sm` | DearU Bubble | `store_only` | 스토어 인앱결제 전용 (Google Play / App Store 관리) |
| `fromm` | fromm | `store_only` | 스토어 인앱결제 전용 (Google Play / App Store 관리) |
| `weverse` | Weverse Digital Membership | `app_only` | 위버스 모바일 앱 전용 (웹 해지 미지원) |
| `icloud` | Apple iCloud+ | `app_only` | Apple 기기 설정 또는 Apple 지원 앱 전용 |


## 6. 전용 전담 라우트 서비스 (3개)

| 서비스 ID | 서비스명 | 전용 라우트 클래스 | 처리 방식 |
| :--- | :--- | :--- | :--- |
| `naverplus` | 네이버플러스 멤버십 | `NaverCancelGuideRoute` | 전용 단계별 셀렉터 및 정밀 가이드 로직 기보유 |
| `netflix` | Netflix | `NetflixCancelRoute` | 전용 단계별 셀렉터 및 정밀 가이드 로직 기보유 |
| `youtube` | YouTube Premium | `YouTubeCancelRoute` | 전용 단계별 셀렉터 및 정밀 가이드 로직 기보유 |


## 7. 결함/차단/리다이렉트 cancelUrl 현황 (총 52개)

| 서비스 ID | 서비스명 | 채널 | 카탈로그 등록 URL | 응답 상태 | 원인 분류 |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `longblack` | 롱블랙 | web | https://www.longblack.co/settings | `429` | HTTP 429 Error |
| `nyt-digital` | The New York Times | web | https://www.nytimes.com/subscription/cancel | `301` | Redirect to Login / External (301) |
| `ft-digital` | Financial Times | web | https://www.ft.com/myaccount/subscription/overview | `403` | 403 Forbidden / Cloudflare WAF Block |
| `the-economist` | The Economist | web | https://www.economist.com/manage/my-subscription | `403` | 403 Forbidden / Cloudflare WAF Block |
| `audible` | Audible | web | https://www.audible.com/account/overview | `302` | Redirect to Login / External (302) |
| `scribd` | Scribd | web | https://www.scribd.com/account-settings | `302` | Redirect to Login / External (302) |
| `ps-plus` | PlayStation Plus | web | https://store.playstation.com/ko-kr/subscriptions | `301_redirect` | Redirect to Login / External (301_redirect) |
| `xbox-gamepass` | Xbox Game Pass Ultimate | web | https://account.microsoft.com/services | `302_redirect_login` | Redirect to Login / External (302_redirect_login) |
| `apple-arcade` | Apple Arcade | store_only | https://apps.apple.com/account/subscriptions | `302_redirect_appleid` | Redirect to Login / External (302_redirect_appleid) |
| `google-play-pass` | Google Play Pass | web | https://play.google.com/store/account/subscriptions | `302_redirect_login` | Redirect to Login / External (302_redirect_login) |
| `kakaotalk-emoticon` | 카카오톡 이모티콘 플러스 | web | https://my.kakao.com/product/EMOTICON001 | `301_redirect` | Redirect to Login / External (301_redirect) |
| `naver-mybox` | 네이버 MYBOX | web | https://mybox.naver.com/#/capacity | `302_redirect` | Redirect to Login / External (302_redirect) |
| `burnfit-pro` | 번핏 Pro | store_only | https://play.google.com/store/account/subscriptions | `302_redirect_login` | Redirect to Login / External (302_redirect_login) |
| `naverplus` | 네이버플러스 멤버십 | web | https://nid.naver.com/membership/my | `302_redirect_login` | Redirect to Login / External (302_redirect_login) |
| `baemin-club` | 배민클럽 | app_only | https://baemin.me/club | `400_bad_request` | HTTP 400_bad_request Error |
| `coupang` | 쿠팡 와우 멤버십 | web | https://loyalty.coupang.com/loyalty/sign-up/home | `403_forbidden` | 403 Forbidden / Cloudflare WAF Block |
| `ytmusic` | YouTube Music | web | https://www.youtube.com/paid_memberships | `redirect_303_to_google_login` | Redirect to Login / External (redirect_303_to_google_login) |
| `tidal` | TIDAL | web | https://my.tidal.com/account/subscription | `redirect_308_to_https://account.tidal.com/subscription` | Redirect to Login / External (redirect_308_to_https://account.tidal.com/subscription) |
| `bubble-sm` | DearU Bubble | store_only | https://play.google.com/store/account/subscriptions | `redirect_302_to_google_login` | Redirect to Login / External (redirect_302_to_google_login) |
| `fromm` | fromm | store_only | https://play.google.com/store/account/subscriptions | `redirect_302_to_google_login` | Redirect to Login / External (redirect_302_to_google_login) |
| `podbbang` | 팟빵 오디오매거진 | web | https://www.podbbang.com/mypage/subscription | `redirect_302_to_login` | Redirect to Login / External (redirect_302_to_login) |
| `welaaa` | 윌라 오디오북 | web | https://www.welaaa.com/my/membership | `redirect_302_to_/auth/login?next=%2Fmy%2Fmembership` | Redirect to Login / External (redirect_302_to_/auth/login?next=%2Fmy%2Fmembership) |
| `netflix` | Netflix | web | https://www.netflix.com/cancelplan | `redirect_302_to_login` | Redirect to Login / External (redirect_302_to_login) |
| `youtube` | YouTube Premium | web | https://www.youtube.com/paid_memberships | `redirect_302_to_mobile` | Redirect to Login / External (redirect_302_to_mobile) |
| `tving` | TVING | web | https://www.tving.com/my/pass | `redirect_307` | Redirect to Login / External (redirect_307) |
| `disney` | Disney+ | web | https://www.disneyplus.com/ko-kr/account | `redirect_302` | Redirect to Login / External (redirect_302) |
| `watcha` | WATCHA | web | https://watcha.com/settings | `redirect_302_to_login` | Redirect to Login / External (redirect_302_to_login) |
| `appletv` | Apple TV+ | web | https://tv.apple.com/settings | `redirect_301_to_home` | Redirect to Login / External (redirect_301_to_home) |
| `primevideo` | Amazon Prime Video | web | https://www.primevideo.com/settings/your-account/ | `redirect_302_to_login` | Redirect to Login / External (redirect_302_to_login) |
| `crunchyroll` | Crunchyroll | web | https://www.crunchyroll.com/account/membership | `forbidden_403_cf_block` | 403 Forbidden / Cloudflare WAF Block |
| `mubi` | MUBI | web | https://mubi.com/login | `redirect_302_to_locale_login` | Redirect to Login / External (redirect_302_to_locale_login) |
| `chatgpt` | ChatGPT Plus | web | https://chatgpt.com/#settings/Subscription | `403` | 403 Forbidden / Cloudflare WAF Block |
| `claude-pro` | Claude Pro | web | https://claude.ai/settings/billing | `403` | 403 Forbidden / Cloudflare WAF Block |
| `perplexity-pro` | Perplexity Pro | web | https://www.perplexity.ai/settings/account | `301` | Redirect to Login / External (301) |
| `midjourney` | Midjourney | web | https://www.midjourney.com/account | `403` | 403 Forbidden / Cloudflare WAF Block |
| `v0-vercel` | v0 by Vercel | web | https://v0.dev/chat/settings/billing | `307` | Redirect to Login / External (307) |
| `figma` | Figma Professional | web | https://www.figma.com/settings | `302` | Redirect to Login / External (302) |
| `canva` | Canva Pro | web | https://www.canva.com/settings/billing-and-teams | `blocked_403_cloudflare` | 403 Forbidden / Cloudflare WAF Block |
| `framer` | Framer Pro | web | https://framer.com/projects | `redirect_308_to_projects_slash` | Redirect to Login / External (redirect_308_to_projects_slash) |
| `webflow` | Webflow | web | https://webflow.com/dashboard/account/plans | `redirect_302_to_login` | Redirect to Login / External (redirect_302_to_login) |
| `cursor-ai` | Cursor Pro | web | https://www.cursor.com/settings | `redirect_308_to_https_cursor_com_settings` | Redirect to Login / External (redirect_308_to_https_cursor_com_settings) |
| `jetbrains-all` | JetBrains All Products | web | https://account.jetbrains.com/licenses | `redirect_302_to_login` | Redirect to Login / External (redirect_302_to_login) |
| `grammarly` | Grammarly | web | https://account.grammarly.com/subscription | `302` | Redirect to Login / External (302) |
| `slack-pro` | Slack Pro | web | https://slack.com/admin/billing | `403` | 403 Forbidden / Cloudflare WAF Block |
| `zoom-pro` | Zoom Workplace Pro | web | https://zoom.us/billing | `302` | Redirect to Login / External (302) |
| `ms365` | Microsoft 365 | web | https://account.microsoft.com/services | `302` | Redirect to Login / External (302) |
| `google-one` | Google One | web | https://one.google.com/settings | `302` | Redirect to Login / External (302) |
| `icloud` | Apple iCloud+ | app_only | https://support.apple.com/ko-kr/HT207594 | `301` | Redirect to Login / External (301) |
| `dropbox` | Dropbox | web | https://www.dropbox.com/account/plan | `302` | Redirect to Login / External (302) |
| `evernote` | Evernote | web | https://www.evernote.com/secure/BillingInfo.action | `302` | Redirect to Login / External (302) |
| `nordvpn` | NordVPN | web | https://my.nordaccount.com/billing/my-subscriptions/ | `302` | Redirect to Login / External (302) |
| `notion` | Notion Plus | web | https://www.notion.so/settings | `307` | Redirect to Login / External (307) |


## 8. 기술적 제언: (a) 키워드 확장 vs (b) LLM 폴백

1. **키워드 확장(Option A)의 한계**:
   - 띄어쓰기(`멤버십 취소` vs `멤버십취소`, `해지신청` vs `해지 신청`) 및 서비스별 특수 레이블(`혜택 포기`, `반복 청구 끄기`, `Downgrade to Free`)을 정적 배열로 모두 커버하기 어렵습니다.
   - 특히 **UNSAFE 문제**: [혜택 포기], [내 멤버십 종료], [구독 취소] 처럼 문맥에 따라 중간 만류 단계일 수도 있고 최종 확인 단계일 수도 있는 버튼들을 단순 문자열 포함 규칙으로 안전하게 판별할 수 없습니다.
2. **하이브리드 접근 권고 (Option B: 소형 LLM 시맨틱 폴백)**:
   - **1차 결정 (안전 영역)**: 명확한 고빈도 영/한 키워드 확장을 통해 Stage 1(마이페이지, Settings, Billing, Subscription) 매칭률을 즉시 80% 이상으로 끌어올립니다.
   - **2차 판단 (위험 영역/Final/Retention)**: 화면에 "마지막 확인", "결제 해지", "만류" 버튼이 복합 노출될 때, 버튼 텍스트와 주변 DOM 문맥(제목, 경고 문구)을 소형 온디바이스/클라우드 LLM에게 판별 요청하여 최종 버튼 여부를 100% 안전하게 판정하고 수동 탭 전환을 유도해야 합니다.
