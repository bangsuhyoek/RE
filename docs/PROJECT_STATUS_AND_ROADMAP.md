# SubMate 프로젝트 개선 진행 상황 및 향후 추진 계획

**문서 작성일:** 2026년 10월 20일  
**기준 커밋:** `15d3e65` (fix(integration): 로그아웃 시 동기화 메타데이터 정리, 로컬 디버그 스크립트 린트 제외)  
**환경:** Windows, pnpm, Capacitor Android, Vercel Serverless, Supabase

---

## 1. 개요 및 배경

프로젝트 전수 스캔(프런트엔드, 백엔드/API, Android 네이티브, 테스트/CI, 보안/개인정보, 문서/운영 위생)을 통해 보안 취약점, Play 스토어 정책 미준수, CI 실패, 데이터 정합성 결함 등 다수의 핵심 개선 과제를 도출했습니다. 

이를 효과적으로 해결하기 위해 독립된 11개 기능별 워크트리(`D:\SubMate-wt\*`)를 구성하여 병렬 작업을 진행했고, 11개 스트림 모두 `codex/agent-approval-mvp` 브랜치에 통합되었습니다. 본 문서는 통합 완료 내역과 잔여 과제, 향후 출시 계획을 종합 정리합니다.

---

## 2. 스트림별 진행 상황 현황표

| 스트림명 | 담당 영역 | 현재 상태 | 주요 달성 및 커밋 내용 |
| :--- | :--- | :---: | :--- |
| **frontend_discovery_perf** | 구독 탐지 모달, 번들 최적화, a11y | **완료** (통합됨, `1d33e9a`) | - 일괄 등록 ID 충돌·중복 및 고액 월간 결제의 연간 오분류 수정<br>- `React.lazy` 지연 로딩으로 첫 화면 번들 축소<br>- 렌더링 예외 시 복구 화면(다시 시도·홈으로) 표시<br>- 바텀시트 포커스 이동·Tab 가두기·Esc 닫기·포커스 복귀<br>- 사용처 없는 `catalogService` 삭제 |
| **ci_tooling** | CI 파이프라인, ESLint, 의존성 | **완료** (통합됨, `7baee58`) | - PR·main 대상 웹 테스트·린트·빌드 및 Android 단위 테스트·APK 빌드 CI 구축<br>- pnpm·Node 버전 고정, 빌드 도구 `devDependencies` 이동, ESLint 도입<br>- 구현 복제 테스트를 실제 함수·불변 조건 검사로 교체 |
| **auth_deeplink** | 인증 흐름, 딥링크 세션 주입 차단 | **완료** (통합됨, `71c9b4a`) | - Supabase PKCE flow 적용 및 네이티브 인증 콜백 제약<br>- quick-add 일회용 nonce 발급·검증<br>- 기기 내 평문 아이디 로그인 제거 및 게스트 데이터 보존<br>- 사용자별 AI 동의 관리, 미동의 시 API 차단<br>- 로그아웃 시 웹뷰 세션/쿠키 정리 |
| **android_platform** | targetSdk 36 상향, R8, 불필요 권한 정리 | **완료** (통합됨, `e6f7797`) | - targetSdk 36 상향, R8 릴리스 최적화 및 환경변수 서명 설정<br>- 미사용 오버레이 서비스 및 `SYSTEM_ALERT_WINDOW` 권한 제거<br>- cleartext·mixedContent 비활성화<br>- 팝업 WebView 메모리 해제 및 썸네일 스트림 누수 방지<br>- `simulatePayment` 디버그 빌드 전용 가드 |
| **android_capture_agent** | 결제 알림 필터링, AI 자동화 안전장치 | **완료** (통합됨, `150a613`) | - 결제 앱 화이트리스트 및 수집 출처 동의 설정<br>- 자동 탭 결제 차단 강화<br>- AndroidManifest `<queries>` 미사용 패키지 제거 |
| **api_hardening** | Gemini API 보호, 사용량 한도, 프롬프트 안전 | **완료** (통합됨, `04dbb10`) | - Gemini 공통 클라이언트 및 모델 폴백·보안 헤더 일원화<br>- 엔드포인트별 RPC 할당량, fail-closed 503 및 전역/엔드포인트별 DB 한도 제어<br>- cancel-next-step 프롬프트 JSON 격리 및 차단어·마스킹 강화<br>- `vercel.json` 보안 헤더·함수 타임아웃 추가 |
| **supabase_schema** | DB 무결성, 0원 구독, RLS | **완료** (통합됨, `1e76483`) | - 0원 무료체험 허용(`amount_krw >= 0`), `is_pinned` 추가<br>- 혜택 상태값 `confirmed/unverified/expired` 통일<br>- 증빙 INSERT 시 생성·만료 시각 서버 강제 트리거<br>- 해지 난이도 공개 기준 강화(서로 다른 제보자 5명 이상)<br>- pgTAP 사용자 격리 검증 및 마이그레이션 계약 테스트 |
| **data_pipeline** | 크롤러 데이터 검증, GitHub Actions 예약 | **완료** (통합됨, `cb0850f`) | - 실패 항목의 기본값 덮어쓰기 경로 제거 및 unverified 유지<br>- 기존 카탈로그 파싱 실패 차단 및 20% 급감 가드<br>- DB 오류 시 비정상 종료 코드 반환<br>- 주간 크롤러 예약 워크플로 추가 |
| **frontend_data** | 날짜 계산, 오프라인 동기화, 알림 기본값 | **완료** (통합됨, `2d213a4`) | - 월·연 환산 모듈(`subscriptionMath`) 통합 및 ID 생성기 분리<br>- 로컬 날짜 파싱 및 캘린더 연간 구독 비교 보정<br>- 온보딩 알림 기본값 표준화 및 재실행 시 기존 목록 보존<br>- 시각 비교 병합·tombstone 삭제·재시도 큐 및 계정 전환 시 로컬 데이터 격리 |
| **account_deletion** | 회원 탈퇴, 데이터 내보내기 | **완료** (통합됨, `669aadb`) | - 회원 탈퇴·계정 데이터 삭제 서버리스 API 구현<br>- 외래키 ON DELETE CASCADE 보장 마이그레이션<br>- 데이터 내보내기 및 탈퇴 UI(AccountModal) 연동<br>- 해지 난이도 제보를 owner_hash로 식별해 탈퇴 시 완전 삭제 |
| **docs_policy** | 약관/처리방침 정합성, 운영 런북 | **완료** (통합됨, `866a3a2`, `6944540`) | - 개인정보처리방침·앱 권한 고지 현행화<br>- Play Data Safety 신고 명세서 작성<br>- 아키텍처·배포 가이드·운영 런북 신규 작성, README·문서 색인 현행화<br>- 오버레이 제거 잔여 문구 및 회원 탈퇴·제보 삭제 정책 반영 |

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
4. **통합 리그레션 검증 통과 (2026-10-20 기준)**
   - `pnpm test`: 457개 JS 단위 테스트 모두 통과 (실패 0)
   - `pnpm build`: 웹 빌드 성공
   - Android `gradlew testDebugUnitTest`: 성공
   - `pnpm lint`: 오류 0건, 경고 179건 (주로 미사용 변수·빈 catch 블록)
5. **구독 상세 화면 결함 수정 (작업 트리 반영, 미커밋)**
   - `SubscriptionDetailScreen.jsx`의 조건부 Hook 호출을 조기 return 앞으로 옮겨, 보던 구독이 사라질 때 화면이 오류로 넘어가는 문제를 해소했습니다.
   - 상세 화면에서 0원(무료체험) 구독도 수정·저장할 수 있게 했습니다.
   - `eslint.config.js`의 임시 예외 블록 2개를 제거했습니다.

---

## 4. 앞으로 진행되어야 할 핵심 작업 (우선순위별)

1. **구독 상세 화면 결함 수정 커밋** (수정 완료, 커밋 대기)
   - `SubscriptionDetailScreen.jsx` 조건부 Hook 호출 수정 및 0원 구독 수정 저장 허용
2. **린트 경고 정리**
   - 미사용 변수·빈 catch 블록·불필요한 대입 등 동작 영향이 없는 경고부터 정리
   - `react-hooks/exhaustive-deps` 경고 11건은 동작 영향 검토 후 개별 처리
3. **작업 환경 정리**
   - 머지 완료된 작업 워크트리 11개(`D:\SubMate-wt\*`) 및 `codex/<stream>` 브랜치 정리
4. **출시**
   - `codex/agent-approval-mvp` → `main` 병합 (현재 `main` 대비 101 커밋 앞섬)
   - Supabase 마이그레이션 원격 적용 → Vercel 프로덕션 배포 → Play 스토어용 AAB 생성
5. **저장소 위생**
   - 루트의 PRD 생성 스크립트(`build_prd_doc.py`, `build_prd_v2.py`) 보관 위치 정리 여부 검토

---

## 5. 브랜치 통합 및 배포 계획

1. **스트림별 순차 구현 및 검증** — 완료
   - 11개 워크트리 모두 명세서(`D:\SubMate-wt\_briefs\*.md`)에 맞춰 구현하고 로컬 테스트를 통과했습니다.
2. **`codex/agent-approval-mvp`로 순차 머지** — 완료
   - 11개 스트림 모두 병합되었습니다 (마지막 통합 `150a613`, 후속 수정 `15d3e65`).
3. **통합 리그레션 테스트** — 완료
   - `pnpm test` 457개 통과, `pnpm lint` 오류 0건, `pnpm build` 성공, `gradlew testDebugUnitTest` 성공.
4. **main 브랜치 병합 및 배포** — 남음
   - Supabase 마이그레이션 원격 적용
   - Vercel 프로덕션 배포 트리거 및 환경변수 갱신
   - Play 스토어용 신규 APK/AAB 생성
5. **저장소 및 git 히스토리 위생 정리** — 남음
   - 머지 완료된 작업 워크트리·브랜치 정리, 루트 PRD 생성 스크립트 보관 위치 검토
   - 원격 저장소 대용량 blob 정리 필요 여부 최종 검토

