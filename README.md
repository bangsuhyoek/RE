# SubMate (웹 & Android 하이브리드 앱)

SubMate는 **React + Vite** 웹 기술을 기반으로 개발되며, **Capacitor**를 통해 Android 네이티브 앱으로 패키징 및 배포할 수 있는 **하이브리드 아키텍처**를 채택하고 있습니다.

---

## 📌 핵심 개발 원칙 (웹 ↔ 앱 호환성 유지 규칙)

중간중간 웹에서 배포하여 기능을 확인하고 최종적으로 앱으로 패키징하는 과정에서 오류가 발생하지 않도록 다음 규칙을 반드시 준수합니다.

### 1. API 호출 규칙 (`src/lib/apiBase.js` 사용)
- **금지**: `fetch("/api/ocr")` 와 같은 하드코딩된 상대 경로 직접 호출
  - *이유*: 웹에서는 동일 도메인(Same-origin)으로 잘 동작하지만, 모바일 앱(`capacitor://localhost`)에서는 로컬 호스트로 요청이 전달되어 연결 실패(404 / Connection Refused)가 발생합니다.
- **권장**: `getApiEndpoint("/api/ocr")` 유틸리티 사용
  - 웹 빌드 시: 상대 경로 (`/api/ocr`)로 자동 동작
  - 모바일 앱 빌드 시: `.env.local`의 `VITE_API_BASE_URL`(배포된 Vercel 도메인)을 결합하여 절대 URL로 호출

### 2. 플랫폼 분기 어댑터 패턴 (`src/lib/platform.js` 사용)
- 웹 브라우저 전용 API(`window.Notification`, Web Push 등)를 컴포넌트에서 직접 호출하지 않습니다.
- `src/lib/platform.js`의 `isNativePlatform()`을 사용하여 웹과 네이티브(Capacitor 플러그인) 동작을 분기합니다.
  ```javascript
  import { isNativePlatform } from './lib/platform';
  import { LocalNotifications } from '@capacitor/local-notifications';
  import { sendBrowserNotification } from './lib/notifications';

  export async function notify(title, message) {
    if (isNativePlatform()) {
      await LocalNotifications.schedule({ ... });
    } else {
      sendBrowserNotification(title, { body: message });
    }
  }
  ```

### 3. 백엔드 API CORS 유지 (`api/`)
- 모바일 웹뷰의 Origin(`capacitor://localhost`, `http://localhost`, `https://localhost`)에서 오는 요청을 허용하도록 `OPTIONS` Preflight 및 `Access-Control-Allow-Origin: *` 헤더를 유지해야 합니다.

### 4. 네이티브 UI / UX 고려사항
- **Safe Area Insets**: 스마트폰 노치 및 하단 제스처 바에 의해 UI가 가려지지 않도록 `index.html`의 `viewport-fit=cover` 및 `index.css`의 `.pt-safe`, `.pb-safe` 클래스를 활용합니다.
- **뒤로가기 제어**: 안드로이드 하드웨어 뒤로가기 시 앱이 갑자기 꺼지지 않고, 열린 모달/바텀시트가 먼저 닫히도록 `CapApp.addListener('backButton')` 핸들러를 유지합니다.

---

## 🛠️ 개발 환경 및 명령어

### 1. 사전 요구사항 및 설치
- Node.js 24 이상 권장
- 패키지 관리자: `pnpm` (Corepack 권장)
```bash
# 의존성 설치 (잠금 파일 기준)
corepack pnpm install --frozen-lockfile
```

### 2. 주요 실행 스크립트
| 명령어 | 설명 |
| :--- | :--- |
| `pnpm dev` | Vite 로컬 웹 개발 서버 실행 (`http://localhost:5173`) |
| `pnpm test` | 단위 및 회귀 테스트 전체 실행 (`node --test tests/*.test.js`) |
| `pnpm build` | 정적 웹 번들 빌드 (`dist/`) |
| `pnpm preview` | 빌드된 정적 웹 번들 로컬 미리보기 |
| `pnpm run cap:sync` | 웹 빌드 산출물을 Android 네이티브 프로젝트로 동기화 |
| `pnpm run cap:build` | 웹 빌드와 Capacitor 동기화를 연속 수행 (`pnpm build && cap sync`) |
| `pnpm run cap:open:android` | Android Studio에서 `android/` 프로젝트 열기 |
| `pnpm run build:apk` | Gradle을 이용한 Android 디버그 APK 빌드 스크립트 실행 |
| `pnpm crawl` | 전체 카탈로그 크롤링 파이프라인 실행 |
| `pnpm crawl:promotions` | 프로모션 정보 수집 및 검증 파이프라인 실행 |
| `pnpm crawl:refunds` | 서비스별 환불/해지 정책 검증 실행 |
| `pnpm crawl:schedule` | 주기적 크롤러 스케줄러 실행 |

---

## ⚙️ 환경 변수 설정 (.env)

로컬 개발 시 루트 디렉터리의 `.env.example`을 복사하여 `.env` 또는 `.env.local`을 생성합니다.

```env
# AI 엔진 (Google Gemini API 키 - 유료 등급 권장)
GEMINI_API_KEY=your_gemini_api_key

# Supabase 클라이언트 연동 (웹 & 모바일 공통)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Supabase 서버 연동 (Vercel Serverless Functions)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# 모바일 앱 빌드 시 배포된 백엔드 API 주소 (웹 로컬 개발 시에는 빈 값)
VITE_API_BASE_URL=https://submate.vercel.app

# (선택) 디스코드 크롤러 알림 웹훅
# DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## 🚀 배포 및 Android 빌드 요약

### 1. 웹 및 서버리스 API 배포 (Vercel)
- **배포 순서 대원칙**: **Supabase DB 마이그레이션이 Vercel API 배포보다 먼저** 완료되어야 합니다.
- Vercel 프로젝트 환경 변수에 `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`가 올바르게 등록되어 있는지 확인합니다.
- 자세한 절차는 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)를 참조하십시오.

### 2. Android 패키징 및 서명
- **디버그 빌드**:
  ```bash
  pnpm run build:apk
  ```
  빌드 완료 후 `android/app/build/outputs/apk/debug/app-debug.apk` 생성.
- **릴리스 AAB 서명 및 Play Console 업로드**:
  - 서명 환경 변수: `SUBMATE_UPLOAD_STORE_FILE`, `SUBMATE_UPLOAD_STORE_PASSWORD`, `SUBMATE_UPLOAD_KEY_ALIAS`, `SUBMATE_UPLOAD_KEY_PASSWORD`
  - Play Store Data Safety 질의서는 [docs/terms/PLAY_DATA_SAFETY.md](docs/terms/PLAY_DATA_SAFETY.md)에 따라 입력합니다.

---

## 📚 프로젝트 문서 색인

| 문서 분류 | 파일 링크 | 설명 |
| :--- | :--- | :--- |
| **문서 색인 총괄** | [docs/README.md](docs/README.md) | 전체 개발·운영·리서치 문서 목록 및 해지 연구 위치 안내 |
| **시스템 아키텍처** | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 웹/Capacitor/Vercel/Supabase 구조 및 온디바이스 데이터 흐름 |
| **배포 및 운영 가이드** | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | 배포 순서, 환경 변수, Android 서명, Gemini 키 교체 절차 |
| **운영 런북** | [docs/RUNBOOK.md](docs/RUNBOOK.md) | 정기 크롤러 점검, 장애 대응 절차, 사용량 한도 관리 |
| **서비스 이용약관** | [docs/terms/01_TERMS_OF_SERVICE.md](docs/terms/01_TERMS_OF_SERVICE.md) | 이용자 권리 의무 및 면책 조항 |
| **개인정보 처리방침** | [docs/terms/02_PRIVACY_POLICY.md](docs/terms/02_PRIVACY_POLICY.md) | 수집 항목, Gemini 유료 등급, AES-256 저장 암호화 |
| **앱 접근 권한 고지** | [docs/terms/03_APP_PERMISSIONS_AND_CONSENTS.md](docs/terms/03_APP_PERMISSIONS_AND_CONSENTS.md) | targetSdk 36 기준 최소 권한 및 눈에 띄는 고지 전문 |
| **Play Data Safety** | [docs/terms/PLAY_DATA_SAFETY.md](docs/terms/PLAY_DATA_SAFETY.md) | 구글 플레이 콘솔 데이터 보안 항목별 공식 제출 명세 |
| **에이전트 기획서** | [docs/PRD_SUBSCRIPTION_APPROVAL_AGENT.md](docs/PRD_SUBSCRIPTION_APPROVAL_AGENT.md) | 구독 승인 에이전트 제품 요구사항 및 상태 정의서 |


