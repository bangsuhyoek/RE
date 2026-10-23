# SubMate 운영 런북 (Operations Runbook)

**버전: v1.3 (2026-10-19)**

---

## 1. 정기 운영 작업 (Routine Operations)

### 1.1 크롤러 주간 예약 워크플로 및 PR 검토
- **스케줄 워크플로**: `.github/workflows/crawler-schedule.yml` (정기 크롤러 및 프로모션 파이프라인 자동화)
- **동작 주기**: 매주 월요일 03:00 UTC (12:00 KST) 자동 실행(`cron: '0 3 * * 1'`) 및 필요 시 수동 트리거(`workflow_dispatch`). 전체 카탈로그 크롤링(`pnpm crawl`), 프로모션 파이프라인(`pnpm crawl:promotions`), 환불 정책 검증(`pnpm crawl:refunds`), 검증 테스트(`pnpm test`)를 수행하고, 데이터 변경 발생 시 `data-update/crawler-scheduled` 브랜치로 PR 자동 생성.
- **운영자 PR 검토 절차**:
  1. 자동 생성된 PR의 diff를 확인하여 가격 변동, 폐지된 요금제, 신규 서비스 검토.
  2. 로컬에서 환불 정책 유효성 검증 스크립트 실행:
     ```bash
     pnpm crawl:refunds
     ```
  3. 테스트 통과 및 이상이 없을 경우 PR 승인 후 `main` 브랜치에 머지.

### 1.2 데이터 보존 주기 및 정기 정리 점검
개인정보 보호방침 및 정책에 따라 아래 주기로 데이터가 자동 정리되는지 모니터링합니다:
- **AI 일일 호출량 카운터**: 90일 보관 후 자동 삭제 (어뷰징 감지용, 대화 내용 없음).
- **결제 경고 증빙 요약**: 생성일로부터 1년 후 자동 영구 삭제.
- **해지 난이도 통계 제보**: 2년 보관 후 자동 삭제 (식별자 없는 익명 데이터).

---

## 2. 장애 대응 절차 (Incident Response)

### 2.1 Supabase 연결 실패 또는 장애 (503 / Connection Timeout)
- **증상**: 앱 로그인 불가, 구독 동기화 실패, 클라이언트에서 Supabase 요청 실패.
- **대응 절차**:
  1. [status.supabase.com](https://status.supabase.com)에서 Supabase 클라우드 전체 인프라 상태 확인.
  2. Supabase 대시보드에서 데이터베이스 Connection Pooler 사용량(풀 고갈 여부) 확인.
  3. 로그인 불가 시 사용자에게 "게스트 모드(단말기 로컬 보관)"로 임시 사용할 수 있음을 공지.

### 2.2 Vercel Serverless Function 5xx 에러
- **증상**: `/api/chat`, `/api/agent`, `/api/ocr` 호출 시 500/504 에러 발생.
- **대응 절차**:
  1. Vercel 대시보드 [Logs] 탭에서 실시간 에러 스택 트레이스 확인.
  2. 환경 변수(`GEMINI_API_KEY`, `SUPABASE_URL` 등) 누락 또는 잘못된 키 설정 여부 점검.
  3. 신규 배포 코드의 결함인 경우 Vercel 대시보드에서 직전 안정 배포로 즉시 롤백 (Instant Rollback).

### 2.3 Gemini API Rate Limit / Quota 초과 (429 Too Many Requests)
- **증상**: 챗봇 대화 지연, 문장 해석 시 429 에러 반환.
- **대응 절차**:
  1. 클라이언트가 온디바이스 규칙 기반 **'간단 모드'**로 자동 폴백되는지 확인.
  2. Google Cloud Console / AI Studio에서 Gemini API 일일 할당량(Quota) 및 유료 결제 계정 청구 상태 확인.
  3. 필요 시 Google Cloud 할당량 상향 요청 접수.

---

## 3. 사용량 한도 및 비용 관리 (Quota & Budget Management)

1. **Google Cloud 예산 알림 (Budget Alerts)**:
   - Gemini API 유료 등급 프로젝트에 대해 월간 목표 예산(예: $100, $500)을 설정하고 50%, 80%, 100% 도달 시 이메일 알림 수신.
2. **API Rate Limiter 파라미터 조정**:
   - `api/_lib/rateLimit.js`의 사용자 IP / 회원 ID별 분당/일일 허용 호출 수 임계치를 모니터링하여 어뷰징 증가 시 강화.

---

## 4. 보안 비상 조치 및 키 교체 (Security Emergency)

- **API 키 유출 또는 보안 사고 시**:
  - 즉시 [docs/DEPLOYMENT.md](DEPLOYMENT.md)의 **"5. Gemini API 키 무중단 교체 절차"**에 따라 Gemini 키 교체 및 재배포 수행.
  - Supabase Database 비밀번호 및 Anon/Service Role 키 재발급: Supabase 대시보드 [Settings > API]에서 Re-generate 후 Vercel 환경 변수 동시 갱신.
- **비상 연락망**:
  - 개인정보 및 보안 지원팀: `privacy@submate.app` / `support@submate.app`
