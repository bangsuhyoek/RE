# SubMate 프로젝트 개선 진행 상황 및 향후 추진 계획

**문서 작성일:** 2026년 10월 20일  
**기준 커밋:** `271cdd2` (feat(discovery): 숨은 구독 탐지 모달·설치 앱/알림 스캔 및 결제 파서 확장)  
**환경:** Windows, pnpm, Capacitor Android, Vercel Serverless, Supabase

---

## 1. 개요 및 배경

프로젝트 전수 스캔(프런트엔드, 백엔드/API, Android 네이티브, 테스트/CI, 보안/개인정보, 문서/운영 위생)을 통해 보안 취약점, Play 스토어 정책 미준수, CI 실패, 데이터 정합성 결함 등 다수의 핵심 개선 과제를 도출했습니다. 

이를 효과적으로 해결하기 위해 독립된 11개 기능별 워크트리(`D:\SubMate-wt\*`)를 구성하여 병렬 작업을 착수했습니다. 본 문서는 현재까지 완료된 작업 내역과 잔여 과제, 향후 통합 및 배포 계획을 종합 정리합니다.

---

## 2. 스트림별 진행 상황 현황표

| 스트림명 | 담당 영역 | 현재 상태 | 주요 달성 및 커밋 내용 |
| :--- | :--- | :---: | :--- |
| **frontend_discovery_perf** | 구독 탐지 모달, 번들 최적화, a11y | **완료** (리뷰 통과) | - 일괄 등록 ID 충돌(`crypto.randomUUID`) 해결<br>- 45,000원 연간 결제 오분류 로직 제거<br>- `React.lazy` 도입으로 메인 청크 684kB → 379kB 축소<br>- ErrorBoundary 복구 화면 추가, 바텀시트 Esc/Tab 포커스 가두기 구현<br>- 미사용 `catalogService.js` 제거 (커밋 8건) |
| **ci_tooling** | CI 파이프라인, ESLint, 의존성 | **완료** (리뷰 통과) | - Android SDK 설치 `platform-tools` 복구로 CI 정상화<br>- PR/main 대상 통합 `ci.yml` 구축 (웹 테스트·린트·빌드 + Android 단위테스트)<br>- 빌드 도구 `devDependencies` 이동으로 취약점 0건 달성<br>- ESLint 10 flat config 도입<br>- 구현 복제 테스트를 실제 불변식 검증으로 교체 (커밋 4건) |
| **auth_deeplink** | 인증 흐름, 딥링크 세션 주입 차단 | 대기 중 (명세 완료) | - `flowType: 'pkce'` 전환 준비<br>- `submate://` 딥링크 해시 토큰 취약점 및 임의 로그인 차단 설계<br>- quick-add 단회성 nonce 검증 구조 명세화<br>- 로컬 평문 계정 제거 및 게스트 데이터 보존 설계 |
| **android_platform** | targetSdk 36 상향, R8, 불필요 권한 정리 | 대기 중 (명세 완료) | - Play 스토어 요구사항 준수를 위한 targetSdk 36 상향<br>- 미사용 오버레이(`SYSTEM_ALERT_WINDOW`, 특수 포그라운드) 정리<br>- R8 난독화/자원 축소 활성화 및 업로드 서명 환경변수화<br>- WebView destroy 및 썸네일 스트림 누수 방지 |
| **android_capture_agent** | 결제 알림 필터링, AI 자동화 안전장치 | 대기 중 (명세 완료) | - 키워드 기반 패키지 스캔 제거, 명시적 결제 앱 화이트리스트화<br>- 카카오톡/메일 알림에 대한 사용자 명시적 토글 분리<br>- 자동 탭 가드에 결제/구매/업그레이드 차단 키워드 추가 |
| **api_hardening** | Gemini API 보호, 사용량 한도, 프롬프트 안전 | 대기 중 (명세 완료) | - 공통 Gemini 클라이언트(`x-goog-api-key`, 재시도 상한) 설계<br>- `/api/ocr` 속도 제한 및 Vercel 413 조기 응답 규격화<br>- Gemini 유료 티어 대응 및 시스템 프롬프트 JSON 인코딩<br>- 프로젝트 일일 글로벌 비용 상한 DB RPC 명세 |
| **supabase_schema** | DB 무결성, 0원 구독, RLS | 대기 중 (명세 완료) | - 0원 무료체험 허용(`CHECK amount >= 0`)<br>- `is_pinned`, `updated_at` 트리거 보장<br>- 혜택 상태값 `confirmed/unverified/expired` 표준화<br>- 증빙 생성시각 서버 트리거 강제 및 RLS pgTAP 테스트 |
| **data_pipeline** | 크롤러 데이터 검증, GitHub Actions 예약 | 대기 중 (명세 완료) | - 실패 시 더미 데이터(10,000원) 덮어쓰기 방지<br>- 기존 카탈로그 급감(20% 이상) 차단 가드<br>- 주간 크롤러 스케줄 워크플로(`crawler-schedule.yml`) 설계 |
| **frontend_data** | 날짜 계산, 오프라인 동기화, 알림 기본값 | 대기 중 (명세 완료) | - 연간 구독 갱신 확인 시트 오작동 수정<br>- 온보딩 구독 결제 알림 기본값 일괄 활성화<br>- 수정 시각 기반 클라우드 양방향 동기화 및 툼스톤(삭제) 큐 설계<br>- 월/연 환산 계산 일원화 (`subscriptionMath.js`) |
| **account_deletion** | 회원 탈퇴, 데이터 내보내기 | 대기 중 (명세 완료) | - `POST /api/account-delete` 엔드포인트 명세<br>- 사용자 데이터 연쇄 삭제(Cascade) 및 계층형 데이터 내보내기(JSON)<br>- AccountModal 탈퇴 UI 연동 명세 |
| **docs_policy** | 약관/처리방침 정합성, 운영 런북 | 대기 중 (명세 완료) | - 개인정보처리방침 실제 처리와 일치화 (Google OAuth, Gemini 유료 티어 등)<br>- Play 스토어 Data Safety 신고 초안 작성<br>- 아키텍처, 배포, 장애 대응 런북(`RUNBOOK.md`) 수립 |

---

## 3. 이미 검증되어 완료된 주요 성과

1. **초기 로딩 성능 대폭 개선 (성공)**
   - 초기 진입에 필요 없는 모달/시트(14개 컴포넌트)를 `React.lazy` 및 `Suspense`로 분리하여 번들 사이즈를 45% 절감했습니다(684kB → 379kB).
   - 비정상 렌더링 시 앱 멈춤을 방지하는 `ErrorBoundary` 복구 뷰를 배치했습니다.
2. **접근성 및 포커스 트랩 강화 (성공)**
   - BottomSheet 열림 시 포커스 내부 진입, Tab 키 루프 가두기, 다중 모달(결제수단 선택 등) 내 Esc 순차 닫힘을 지원하도록 개선했습니다.
3. **CI/CD 파이프라인 및 코드 품질 체계 구축 (성공)**
   - Android SDK 설치 실패로 멈춰 있던 GitHub Actions 워크플로를 `platform-tools` 명시 및 최신 SHA 고정 액션으로 전면 재구성했습니다.
   - 빌드 도구 취약점을 완전히 해소하고 ESLint 10을 도입하여 린트 기반 품질 검증을 통과했습니다.
4. **모든 단위 테스트 통과 (418 passed)**
   - 숨은 구독 일괄 등록 및 결제 주기 추론 테스트가 추가된 상태에서 418개 JS 단위 테스트가 모두 통과되었습니다.

---

## 4. 앞으로 진행되어야 할 핵심 작업 (우선순위별)

### 1단계: 보안 및 출시 블로커 해결 (최우선)
- **딥링크 PKCE 전환 및 세션 주입 차단 (`auth_deeplink`)**
  - `submate://` 스킴을 통한 무검증 세션 주입 제거 및 PKCE 흐름 강제
  - 로컬 테스트 계정 평문 비밀번호 제거 및 게스트 모드 안전화
- **Android 플랫폼 현대화 (`android_platform`)**
  - `targetSdkVersion 36` 적용 (Play 스토어 11월 1일 최종 유예 시한 대응)
  - 미사용 오버레이 권한(`SYSTEM_ALERT_WINDOW`) 및 특수 포그라운드 서비스 완전 삭제
  - 릴리스 빌드 R8 활성화 및 업로드 서명 환경변수화

### 2단계: 데이터 신뢰성 및 안전성 확보
- **사용자 데이터 정합성 버그 수정 (`frontend_data`, `supabase_schema`)**
  - 연간 구독자가 매달 갱신 확인 팝업을 받는 버그 수정
  - 0원 무료체험 구독의 Supabase DB CHECK 제약 조건 완화 (`amount >= 0`)
  - 오프라인 수정 및 삭제(Tombstone) 양방향 동기화 대기열 구현
- **AI 비용 및 자동화 오조작 방지 (`api_hardening`, `android_capture_agent`)**
  - `/api/ocr` DB 기반 사용량 속도 제한 및 파일 크기 가드 적용
  - 해지 도우미 자동 클릭 대상에서 결제/구매/업그레이드 관련 버튼 원천 차단
  - 알림 수집 대상에서 개인 메신저 제외 및 결제 전용 앱 화이트리스트화

### 3단계: 규정 준수 및 파이프라인 자동화
- **회원 탈퇴 및 데이터 내보내기 구현 (`account_deletion`)**
  - 법적 필수 요건인 회원 탈퇴 API 및 클라이언트 UI 연동
  - 사용자 데이터 JSON 내보내기 기능 추가
- **크롤러 파이프라인 안정화 (`data_pipeline`)**
  - 실패 시 기본값 덮어쓰기 금지 및 카탈로그 급감 방지 가드
  - GitHub Actions 정기 예약 워크플로 구축
- **약관 및 운영 문서 최신화 (`docs_policy`)**
  - Gemini 유료 티어 데이터 미학습 고지 반영
  - Play Data Safety 신고서 및 배포/운영 런북 문서화

---

## 5. 브랜치 통합 및 배포 계획

1. **스트림별 순차 구현 및 검증**
   - 각 워크트리별로 명세서(`D:\SubMate-wt\_briefs\*.md`)에 맞춰 작업을 완료하고 로컬 테스트를 통과시킵니다.
2. **`codex/agent-approval-mvp`로 순차 머지**
   - 공통 계약(파일명, DB 마이그레이션 타임스탬프 등) 준수를 확인하며 충돌 없이 병합합니다.
3. **통합 리그레션 테스트**
   - 전체 JS 단위 테스트(`pnpm test`), 린트(`pnpm lint`), 웹 빌드(`pnpm build`), Android 단위테스트(`gradlew testDebugUnitTest`) 일괄 검증.
4. **main 브랜치 병합 및 배포**
   - Supabase 마이그레이션 원격 적용
   - Vercel 프로덕션 배포 트리거 및 환경변수 갱신
   - Play 스토어용 신규 APK/AAB 생성
5. **저장소 및 git 히스토리 위생 정리**
   - 작업 완료 후 루트의 잔여 디버그 APK/zip, 임시 텍스트 파일 정리
   - 원격 저장소 대용량 blob 정리 필요 여부 최종 검토

