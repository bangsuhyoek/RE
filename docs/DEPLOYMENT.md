# SubMate 배포 가이드 (Deployment Guide)

**버전: v1.3 (2026-10-19)**

---

## 1. 배포 대원칙 (Core Principle)

> ⚠️ **중요: 데이터베이스 마이그레이션 우선 원칙**  
> **Supabase DB 마이그레이션은 Vercel API 배포보다 반드시 먼저 적용되어야 합니다.**  
> 구버전 모바일 앱과 신버전 API가 공존하는 환경에서 하위 호환성을 유지하고 스키마 불일치로 인한 런타임 오류를 방지하기 위함입니다.

---

## 2. Supabase 데이터베이스 마이그레이션

1. **마이그레이션 파일 확인**:
   - 위치: `supabase/migrations/*.sql`
   - 신규 스키마, 테이블 생성, RLS 정책 및 트리거 포함.
2. **마이그레이션 적용**:
   - Supabase CLI를 사용하는 경우:
     ```bash
     supabase db push
     ```
   - 또는 Supabase 관리자 대시보드 > SQL Editor에서 대상 마이그레이션 SQL을 직접 실행합니다.
3. **적용 검증**:
   - 대시보드 Table Editor에서 신규 컬럼, 인덱스 및 RLS 활성화 여부를 확인합니다.

---

## 3. Vercel 웹 & 서버리스 API 배포

### 3.1 필수 환경 변수 설정 (Vercel Project Settings)
Vercel 대시보드 [Settings > Environment Variables]에 아래 변수들을 등록합니다:

| 환경 변수명 | 설명 및 용도 |
| :--- | :--- |
| `GEMINI_API_KEY` | Google AI Studio에서 발급받은 Gemini API 키 (**유료 등급** 프로젝트) |
| `SUPABASE_URL` | Supabase 프로젝트 URL (예: `https://xyzcompany.supabase.co`) |
| `SUPABASE_ANON_KEY` | Supabase 공개 anon API 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 롤 비밀 키 (*통합 후 확인 필요: 회원 탈퇴 관리자 작업용) |
| `DISCORD_WEBHOOK_URL` | (선택) 크롤러 파이프라인 검수 알림용 디스코드 웹훅 |
| `GOOGLE_APPLICATION_CREDENTIALS` | (선택) Google Cloud Vision OCR 예비 연동용 서비스 계정 JSON |

### 3.2 배포 실행
- `main` 브랜치에 푸시하거나 Vercel CLI로 배포를 실행합니다:
  ```bash
  # 로컬 빌드 검증 후 배포
  pnpm build
  vercel --prod
  ```
- 배포 완료 후 `https://<your-domain>.vercel.app/api/chat` 등 주요 엔드포인트 응답 상태(200 또는 기대 상태코드)를 확인합니다.

---

## 4. Android 릴리스 패키징 및 Play Console 배포

### 4.1 릴리스 서명 환경 변수 설정
릴리스 AAB(Android App Bundle) 빌드 시 아래 4개의 서명 환경 변수가 시스템 환경에 등록되어 있어야 합니다:

```bash
# Windows PowerShell 예시
$env:SUBMATE_UPLOAD_STORE_FILE="D:\secure\submate-upload-key.jks"
$env:SUBMATE_UPLOAD_STORE_PASSWORD="your-store-password"
$env:SUBMATE_UPLOAD_KEY_ALIAS="submate-upload"
$env:SUBMATE_UPLOAD_KEY_PASSWORD="your-key-password"
```

### 4.2 AAB 패키징 빌드
```bash
# 1. 웹 프론트엔드 빌드 및 Capacitor 네이티브 동기화
corepack pnpm run cap:build

# 2. Android 릴리스 번들 빌드
cd android
./gradlew bundleRelease
```
- 생성 산출물: `android/app/build/outputs/bundle/release/app-release.aab`

### 4.3 Google Play Console 업로드
1. Google Play Console 로그인 > SubMate 앱 선택.
2. [출시 > 프로덕션] (또는 내부 테스트 트랙) > [새 버전 만들기].
3. 빌드된 `app-release.aab` 파일을 업로드.
4. **데이터 보안(Data Safety)** 섹션 검토:
   - 반드시 [docs/terms/PLAY_DATA_SAFETY.md](terms/PLAY_DATA_SAFETY.md)에 기술된 공식 신고 명세와 100% 일치하도록 입력.
5. 버전 검토 후 출시 제출.

---

## 5. Gemini API 키 무중단 교체 절차 (Zero-Downtime Key Rotation)

API 키 유출 의심 또는 정기 보안 갱신 시 아래 절차를 통해 서비스 중단 없이 교체합니다:

1. **신규 키 발급**:
   - Google Cloud Console / Google AI Studio에서 동일한 유료 등급 결제 프로젝트에 신규 Gemini API 키를 생성합니다.
2. **Vercel 환경 변수 업데이트**:
   - Vercel 대시보드 [Settings > Environment Variables]에서 `GEMINI_API_KEY` 값을 새로 발급한 키로 수정하고 저장합니다.
3. **새 배포 적용 (Redeploy)**:
   - 최신 프로덕션 배포에서 [Redeploy]를 클릭하여 신규 환경 변수를 서버리스 함수에 즉시 반영합니다.
4. **동작 검증**:
   - 앱 내 챗봇 대화 및 AI 영수증 분석을 호출하여 200 OK 응답 및 신규 키 사용을 확인합니다.
5. **구버전 키 폐기 (Revoke)**:
   - Google Cloud Console에서 기존 구버전 API 키를 비활성화 또는 영구 삭제합니다.
