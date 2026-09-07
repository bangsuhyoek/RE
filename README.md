# SubMate (웹 & 모바일 하이브리드 앱)

SubMate는 **React + Vite** 웹 기술을 기반으로 개발되며, **Capacitor**를 통해 Android 및 iOS 네이티브 앱으로 원활하게 변환·배포할 수 있는 **하이브리드 아키텍처**를 채택하고 있습니다.

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

## 🛠️ 개발 및 빌드 명령어

### 1. 로컬 웹 개발
```bash
# 의존성 설치
pnpm install

# 웹 로컬 개발 서버 실행 (localhost:5173)
pnpm dev

# 단위 및 회귀 테스트 실행
pnpm test
```

### 2. 웹 배포 (Vercel)
```bash
# 정적 웹 번들 빌드
pnpm build
```

### 3. 모바일 앱(Android) 빌드 및 동기화
1. `.env.local` 파일에 배포된 백엔드 API 주소 설정:
   ```env
   VITE_API_BASE_URL=https://submate.vercel.app
   ```
2. 웹 빌드 및 Capacitor 네이티브 프로젝트 동기화:
   ```bash
   pnpm run cap:build
   ```
3. Android Studio 열기:
   ```bash
   pnpm run cap:open:android
   ```

