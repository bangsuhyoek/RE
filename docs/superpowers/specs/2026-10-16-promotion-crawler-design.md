# SubMate 프로모션 크롤링 및 동기화 파이프라인 개선 설계서 (Phase 1: 방안 A+B → Phase 2: 방안 C)

- **작성일**: 2026-10-16
- **대상 프로젝트**: `D:\SubMate`
- **목표**: 단방향 삭제(One-Way Pruning) 및 하드코딩된 숫자 대조 한계를 극복하기 위해 Master/Live 카탈로그 분리, 48시간 유예 기간(`SOFT_DEGRADED`), Gemini 하이브리드 추출기(방안 A+B)를 먼저 구축하고, 이어서 Supabase `benefits` / `service_benefits` 연동 및 앱 런타임 Stale-While-Revalidate 동기화(방안 C)를 완성한다.

---

## 1. 현황 진단 및 해결 과제

1. **Master 카탈로그와 Live 카탈로그 미분리로 인한 영구 유실**:
   - `scripts/crawler/runPromotionPipeline.js --apply`가 `public/catalog/promotions.json`을 읽고 `LIVE_CONFIRMED`만 덮어써서, 일시적 네트워크 장애나 조건 변경 시 후보군 자체가 영구 삭제됨 (83개 → 34개로 축소, `sources.js` 내 40여 개 룰 고립).
2. **단순 일치 대조(`matchClaim`)로 인한 혜택 변경 대응 불가**:
   - 공식 페이지의 혜택이 `3개월 무료 → 1개월 무료` 또는 할인가 변경 시 `Verdict.CHANGED`를 반환하지만, 업데이트 대신 삭제 처리됨.
3. **검증 URL(`sources.js`)과 앱 노출 링크(`promotion.link`) 불일치**:
   - `appletv-promo`, `applemusic-promo`, `apple-arcade-promo` 등의 `link`가 `https://support.apple.com` 등 일반 고객센터로 되어 있음에도 보조 URL 검증 통과로 인해 잘못된 링크가 앱에 노출됨.
4. **중복 데이터 및 상시 무료 요금제(Free Tier) 혼재**:
   - 현재 34개 항목 중 5쌍(10개)이 동일 서비스 중복 프로모션이며, 3개(`framer-promo`, `zoom-pro-promo`, `naver-mybox-promo`)는 기간 제한 없는 기본 무료 플랜임.
5. **검증 엔진 이원화**:
   - `scripts/crawler/promotionValidator.js`(JSON-LD, `__NEXT_DATA__`, OpenGraph 파싱 및 48시간 유예 기간 보유)가 실제 파이프라인(`runPromotionPipeline.js`)에 연결되지 않음.
6. **정적 번들 의존**:
   - Supabase에 `benefits` 및 `service_benefits` 스키마(`supabase/migrations/20260916100000_create_benefits_and_service_benefits_schema.sql`)가 준비되어 있으나 크롤러 및 프론트엔드 런타임과 연결되지 않음.

---

## 2. Phase 1 설계: 크롤러 아키텍처 개편 및 하이브리드 AI 추출 (방안 A + B)

### 2.1 Master / Live 카탈로그 분리 및 데이터 정제
- **Master 카탈로그 (`public/catalog/promotions-master.json`)**:
  - 크롤러가 매 주기 탐색하는 전체 프로모션 후보군 SSOT.
  - 기존 `public/catalog/promotions.json` 및 `public/catalog/verified_promotions_94.backup.json`을 병합·정제하여 생성.
  - **중복 5쌍 통합**:
    - `youtube-1m-free` + `youtube-promo` → `youtube-promo`
    - `millie-1plus1` + `millie-promo` → `millie-promo`
    - `genie-110won` + `genie-promo` → `genie-promo`
    - `appletv-7d-free` + `appletv-promo` → `appletv-promo`
    - `github-student-pack` + `github-copilot-promo` → `github-copilot-promo`
  - **상시 무료 요금제 3종 분리**:
    - `framer-promo`, `zoom-pro-promo`, `naver-mybox-promo`는 `kind: "free_tier"`로 분류하여 마스터 카탈로그에만 보존하고, 라이브 프로모션 노출(`promotions.json` / `subscriptionData.js`)에서는 제외.
  - **링크(`link`) 정합성 교정**:
    - `support.apple.com` 등 제네릭 URL을 `sources.js`의 공식 프로모션 랜딩 URL로 교정하고, 파이프라인 검증 시 `promotion.link`의 유효성을 우선 확인.
- **Live 카탈로그 (`public/catalog/promotions.json` & `src/data/subscriptionData.js`)**:
  - `LIVE_CONFIRMED`, `AUTO_UPDATED`, `SOFT_DEGRADED` 상태이면서 만료일(`dday`/`deadline`)이 지나지 않았고 `kind !== 'free_tier'`인 프로모션만 수록.

### 2.2 메타데이터 추출 통합 및 48시간 Soft Degradation
- `scripts/crawler/promotions/pageFetcher.js`에서 HTML 수집 시 `promotionValidator.js`의 구조화 메타데이터 추출(JSON-LD, `__NEXT_DATA__`, OpenGraph `og:title`/`og:description`/`meta[name="description"]`)을 결합하여 본문 텍스트와 함께 반환.
- **48시간 유예 기간 (`SOFT_DEGRADED`)**:
  - 페이지 수집 결과가 일시적 장애(`TIMEOUT`, `NETWORK_ERROR`, `BOT_WALL`, `EMPTY`, `HTTP_ERROR(5xx/429)`)일 때, 기존 항목의 `lastVerifiedAt`(또는 직전 검증 성공 시각)이 현재 시각 기준 **48시간 이내**라면 즉시 탈락시키지 않고 `verifiedStatus: "soft_degraded"`로 유지하여 라이브 카탈로그에 보존.

### 2.3 Gemini 하이브리드 추출기 (`scripts/crawler/promotions/aiExtractor.js`)
- **1차 (규칙 기반 `matchClaim`)**:
  - 기존 `offerExtractor.js`의 정규식/키워드 매칭으로 `Verdict.CONFIRMED` 판정 시 LLM 호출 없이 즉시 확정.
- **2차 (AI 추출 폴백)**:
  - 페이지가 정상 수집(`PageState.OK`)되었으나 1차 판정이 `CHANGED` 또는 `NOT_FOUND`인 경우 호출 (또는 정규식 `CHANGED` 추출기가 새 가격/기간과 원문 인용구를 명확히 찾은 경우 활용).
  - Gemini REST API (`gemini-2.5-flash` → `gemini-3.5-flash-lite` 폴백)를 호출하여 아래 JSON 스키마를 추출:
    ```json
    {
      "isActive": true,
      "kind": "free_trial | discount | bundle | card_promo | student | annual | gift",
      "subtitle": "1개월 무료 체험",
      "offerPrice": 0,
      "originalPrice": 14900,
      "benefitPeriod": "1개월",
      "deadline": "2026-12-31",
      "evidenceQuote": "페이지 본문에 실제로 존재하는 정확한 원문 문장"
    }
    ```
- **환각 방지 및 안전 조건 기반 자동 업데이트 정책**:
  1. **원문 인용구 대조 (`verifyEvidenceQuote`)**: 반환된 `evidenceQuote`(최소 6자 이상)가 정규화된 페이지 원문(`normalizedPageText`)의 부분 문자열인지 검증. 불일치 시 즉시 기각.
  2. **안전 조건 검증 (`validateUpdatedOffer`)**:
     - `isActive === true`
     - `offerPrice >= 0` 이고 `originalPrice > 0` 이며 `offerPrice < originalPrice` (`saving = originalPrice - offerPrice > 0`)
     - `deadline`이 존재할 경우 현재 시각(`now`) 이후일 것
  3. **반영 방식**:
     - 안전 조건을 모두 통과한 변경 건(`CHANGED` / AI 추출)은 마스터 및 라이브 카탈로그에 **자동 업데이트(`AUTO_UPDATED`, `verifiedStatus: "confirmed"`)** 반영.
     - 기준 미달이거나 모호한 변경 건은 `public/catalog/promotions-review.json`에 분리 저장하여 수동 검토 지원.

---

## 3. Phase 2 설계: Supabase DB 연동 및 런타임 동기화 (방안 C)

### 3.1 크롤러 → Supabase DB 동기화 모듈 (`scripts/crawler/promotions/supabaseSync.js`)
- **대상 테이블**:
  - `public.benefits` (`id, title, subtitle, kind, category, description, saving, original_price, offer_price, dday, link, benefit_period, campaign_period, monogram, verified_status, updated_at`)
  - `public.service_benefits` (`service_id, benefit_id, role, is_primary`)
- **동작**:
  - `runPromotionPipeline.js --apply` (또는 `--sync-db`) 실행 시 환경변수(`SUPABASE_URL`/`VITE_SUPABASE_URL` 및 `SUPABASE_SERVICE_ROLE_KEY` 또는 설정된 키)가 존재하면 검증된 프로모션을 `public.benefits` 및 `public.service_benefits`에 Upsert.
  - 마스터 카탈로그에서 만료(`EXPIRED`)되거나 미검증된 항목은 DB에서 `verified_status = 'expired'` 또는 `'unverified'`로 상태 업데이트.
  - 로컬/오프라인 환경을 위해 SQL 시드/동기화 스냅샷 생성 함수(`buildBenefitsUpsertPayload`)도 함께 모듈화하여 단위 테스트 보장.

### 3.2 프론트엔드 런타임 Stale-While-Revalidate (`src/lib/promotionsSync.js` & `src/App.jsx`)
- **클라이언트 만료일 필터링 (`filterActivePromotions`)**:
  - 번들 또는 원격에서 로드한 프로모션 중 `dday`(`YYYY-MM-DD`)가 오늘 날짜보다 과거인 항목과 `kind === 'free_tier'`, `verifiedStatus === 'expired'`인 항목을 클라이언트 런타임에서 자동 제외.
- **SWR 동기화 흐름**:
  1. 앱 초기 마운트 시 `localStorage` 캐시(유효 시) 또는 정적 번들(`promotionCatalog`)을 즉시 렌더링하여 지연 시간 0ms 유지.
  2. 백그라운드에서 Supabase `public.benefits` + `public.service_benefits` (Supabase 미설정 시 `/catalog/promotions.json`)를 비동기 조회.
  3. 최신 데이터가 수신되면 앱 상태 및 `localStorage` 캐시를 갱신하여 앱 재빌드 없이도 최신 프로모션 및 마감일이 반영되도록 구성.
