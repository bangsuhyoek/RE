# SubMate 시스템 아키텍처 (System Architecture)

**버전: v1.3 (2026-10-19)**  
**적용 플랫폼: Web (React + Vite) & Android (Capacitor)**

---

## 1. 아키텍처 개요 (Overview)

SubMate는 웹 기술(React/Vite) 기반의 코어 비즈니스 로직과 UI를 유지하면서, Capacitor를 통해 Android 네이티브 기능(알림 감지, 인앱 해지 브라우저, 로컬 알림)을 결합한 하이브리드 아키텍처를 채택하고 있습니다.

```text
[ Android 단말기 (Capacitor) ]
  ├── React Webview (Vite 번들)
  │     ├── 온보딩 / 구독 관리 UI / 승인 카드
  │     ├── 챗봇 "꾸독" (Gemini / 온디바이스 간단 모드)
  │     └── 인앱 해지 가이드 UI
  ├── PaymentNotificationListener (온디바이스 파싱, 서버 미전송)
  ├── CancelBrowserActivity (인앱 해지 전용 웹뷰 브라우저)
  └── Local Notifications (결제일 D-3/D-1/당일 로컬 알림)
             │
             │ HTTPS / TLS (암호화 통신)
             ▼
[ 백엔드 인프라 (Serverless & DB) ]
  ├── Vercel Serverless Functions (api/*)
  │     ├── /api/chat (Gemini AI 대화 챗봇)
  │     ├── /api/agent (자연어 문장 구독 해석)
  │     ├── /api/ocr (영수증/캡처 AI OCR 분석)
  │     ├── /api/cancel-next-step (AI 해지 경로 탐색)
  │     └── /api/account-delete (회원 탈퇴 - *통합 후 확인 필요)
  ├── Supabase Cloud (AWS 리전)
  │     ├── PostgreSQL DB (Row Level Security, AES-256 저장 암호화)
  │     └── Supabase Auth (Google OAuth 2.0 간편 로그인 전용)
  └── Google Cloud / AI Services (외부 연동)
        ├── Google Gemini API (유료 등급, AI 모델 학습 미사용)
        └── Google Cloud Vision API (영수증 OCR 예비 연동)
```

---

## 2. 주요 시스템 구성 요소 (Components)

### 2.1 클라이언트 레이어 (Client)
- **React 18 & Vite SPA (`src/`)**: Tailwind CSS 기반 반응형 UI. 웹과 모바일 웹뷰 모두에서 100% 동일하게 렌더링.
- **플랫폼 어댑터 (`src/lib/platform.js`, `src/lib/apiBase.js`)**: 네이티브 환경(Capacitor)과 일반 웹 브라우저를 감지하여 알림 API, API 엔드포인트 URL 분기 처리.
- **인앱 해지 브라우저 (`android/app/src/main/java/com/submate/app/CancelBrowserActivity.java`)**:
  - 외부 오버레이 권한(`SYSTEM_ALERT_WINDOW`) 없이 안전하게 인앱 웹뷰 내에서 단계별 해지 팁 및 가이드 제공.
- **온디바이스 알림 감지 (`PaymentNotificationListener.java`, `PaymentParser.java`)**:
  - 사전 승인된 금융/결제/앱스토어 앱의 알림만 수신하여 단말기 내부 메모리에서 결제 요약 추출 후 즉시 폐기.

### 2.2 백엔드 API 레이어 (Vercel Serverless Functions)
- **`api/chat.js`**: Google Gemini API와 연동하여 챗봇 "꾸독" 대화 생성.
- **`api/agent.js`**: 사용자가 입력한 자연어 문장(300자 이내)에서 구독 서비스명, 요금제, 결제일 자동 추출 (`api/_lib/agentInterpretation.js`).
- **`api/ocr.js`**: 영수증/캡처 이미지에서 텍스트를 파싱하여 구독 정보 추출 (Gemini 우선, Cloud Vision 예비).
- **`api/cancel-next-step.js`**: 해지 브라우저 화면의 버튼 텍스트(마스킹 완료)를 분석하여 다음 단계 추천.
- **`api/account-delete.js`**: 회원 탈퇴 및 관련 데이터 연쇄 삭제 (*통합 후 확인 필요: `account_deletion` 스트림에서 구현 중).

### 2.3 데이터베이스 및 인증 레이어 (Supabase)
- **Google OAuth 단일화**: 자체 아이디/비밀번호 방식을 제거하고 Supabase Auth를 통한 Google OAuth 2.0 간편 로그인만 지원.
- **게스트 모드**: 로그인 없이 이용할 경우 모든 구독 데이터는 사용자 단말기 `localStorage`에만 안전하게 보관.
- **행 단위 보안 (RLS)**: PostgreSQL의 Row Level Security를 통해 사용자는 오직 본인의 `user_id` 데이터에만 접근 가능.
- **저장 시 암호화 (AES-256)**: 데이터베이스 블록 디스크 및 백업 볼륨은 업계 표준 AES-256으로 암호화.

---

## 3. 프라이버시 및 보안 아키텍처 원칙 (Privacy-by-Design)

1. **온디바이스 우선 (On-Device Ephemeral Processing)**:
   - 결제 알림 원문은 절대 서버로 전송하지 않으며, 단말기 메모리에서 결제 요약 추출 즉시 파기.
   - 온디바이스 인사이트(무료체험 만료, 연간 갱신 등)는 기기 로컬에서 연산되어 로컬 알림으로 발송.
2. **AI 데이터 보호 (Google Gemini Paid Services)**:
   - Google Gemini API 유료 등급을 사용하여 고객 데이터의 AI 모델 학습 활용을 원천 차단.
   - 해지 도우미 전송 시 이름, 이메일, 전화번호, 카드번호 등 개인식별정보 마스킹 처리.
   - AI 미동의 시 외부 전송이 없는 기기 로컬 기반 '간단 모드'(규칙 기반)로 완전 격리 동작.
3. **최소 권한의 원칙 (Least Privilege)**:
   - Android 시스템 오버레이(`SYSTEM_ALERT_WINDOW`) 및 특수 목적 포그라운드 서비스 요구 제거.
   - 사진 선택 시 전체 파일 접근 권한 대신 안드로이드 시스템 사진 선택기(Photo Picker) 활용.
