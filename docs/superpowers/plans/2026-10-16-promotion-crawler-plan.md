# Promotion Crawler Phase 1 (A+B) & Phase 2 (C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the SubMate promotion crawling pipeline in two stages: Stage 1 (Approach A+B) splits Master vs. Live catalogs, cleanses duplicates/free-tiers/links, adds 48h soft degradation and structured metadata parsing, and introduces a Gemini LLM Hybrid Extractor with verbatim quote verification; Stage 2 (Approach C) connects the crawler and frontend runtime to Supabase (`benefits` & `service_benefits`) with Stale-While-Revalidate (SWR) and client-side deadline filtering.

**Architecture:**
- **Stage 1 (A+B)**: `public/catalog/promotions-master.json` serves as the non-destructive SSOT input to `runPromotionPipeline.js`. `pageFetcher.js` extracts both rendered text and structured metadata (`JSON-LD`, `__NEXT_DATA__`, `OpenGraph`). `aiExtractor.js` provides a Gemini fallback for `CHANGED`/`NOT_FOUND` pages with mandatory verbatim quote substring verification and safety checks (`offerPrice < originalPrice`). `runPromotionPipeline.js --apply` updates `promotions-master.json`, writes live items (`LIVE_CONFIRMED`, including 48h soft-degraded and safe auto-updated items, excluding `free_tier`) to `public/catalog/promotions.json` and `src/data/subscriptionData.js`, and writes unconfirmed/unsafe changes to `public/catalog/promotions-review.json`.
- **Stage 2 (C)**: `scripts/crawler/promotions/supabaseSync.js` maps master/live promotions into `public.benefits` and `public.service_benefits` rows and upserts them to Supabase when credentials are provided. On the client, `src/lib/promotionsSync.js` and `src/App.jsx` filter out expired/free-tier items at runtime and perform Stale-While-Revalidate syncing against Supabase `benefits` + `service_benefits` (falling back to `/catalog/promotions.json` and bundled `promotionCatalog`).

**Tech Stack:** Node.js (ESM, `node:test`), Cheerio, Playwright Core, Gemini REST API (`gemini-2.5-flash` / `gemini-3.5-flash-lite`), Supabase (`@supabase/supabase-js`), React 19, Vite.

## Global Constraints

- Preserve all existing unit tests in `tests/promotionCrawler.test.js`, `tests/benefits.test.js`, and `tests/personaFeedbackFixes.test.js`.
- Keep required home banner IDs (`naverplus-netflix`, `youtube-promo`, `disney-bundle-37`) in the live catalog.
- Never allow LLM hallucinated offers: `evidenceQuote` must be a verbatim substring of normalized page text (`normalizedPageText.includes(normalizedQuote)`), and `offerPrice < originalPrice` must hold for auto-updates.
- Free-tier permanent plans (`framer-promo`, `zoom-pro-promo`, `naver-mybox-promo`) must be tagged `isFreeTier: true` in `promotions-master.json` and excluded from live `promotions.json` and `subscriptionData.js`.

---

### Task 1: Master/Live Catalog Split & Data Cleansing (Stage 1 - Approach A)

**Files:**
- Create: `public/catalog/promotions-master.json`
- Modify: `public/catalog/promotions.json`
- Modify: `src/data/subscriptionData.js`
- Modify: `scripts/crawler/promotions/sources.js`
- Test: `tests/benefits.test.js`

**Interfaces:**
- Produces:
  - `public/catalog/promotions-master.json`: Deduplicated master catalog restoring pruned candidates from git `f804d46` + current verified items, with `isFreeTier: true` on `framer-promo`, `zoom-pro-promo`, `naver-mybox-promo`, and canonical official `link` URLs.
  - Cleaned `public/catalog/promotions.json` & `src/data/subscriptionData.js`: Deduplicated live confirmed promotions (removing the 5 duplicate pairs `youtube-1m-free`, `millie-1plus1`, `genie-110won`, `appletv-7d-free`, `github-student-pack` in favor of their canonical counterparts `youtube-promo`, `millie-promo`, `genie-promo`, `appletv-promo`, `github-copilot-promo`, and excluding the 3 `isFreeTier: true` items).

- [ ] **Step 1: Write failing tests in `tests/benefits.test.js` for Master/Live catalog hygiene**
- [ ] **Step 2: Run `node --test tests/benefits.test.js` to verify failure**
- [ ] **Step 3: Build `public/catalog/promotions-master.json` and update `public/catalog/promotions.json`, `src/data/subscriptionData.js`, and `scripts/crawler/promotions/sources.js`**
- [ ] **Step 4: Run `node --test tests/benefits.test.js tests/personaFeedbackFixes.test.js` to verify pass**

---

### Task 2: Structured Metadata Extraction in `pageFetcher.js` & 48h Soft Degradation (Stage 1 - Approach A)

**Files:**
- Modify: `scripts/crawler/promotions/pageFetcher.js`
- Modify: `scripts/crawler/runPromotionPipeline.js`
- Test: `tests/promotionCrawler.test.js`

**Interfaces:**
- Produces:
  - `extractStructuredMetadataText(html)` in `scripts/crawler/promotions/pageFetcher.js`: Extracts `og:title`, `og:description`, `meta[name="description"]`, and `application/ld+json` text via `inspectCampaignHTML` from `promotionValidator.js` and appends to page text when not already present.
  - `SOFT_DEGRADATION_MS = 48 * 3600 * 1000` in `scripts/crawler/runPromotionPipeline.js`: In `applyResult(item, result, checkedAt)`, when `result.verdict === Verdict.UNREACHABLE` and `item.verifiedStatus === "LIVE_CONFIRMED"` and `item.lastVerifiedAt` is within 48 hours of `checkedAt`, keeps `verifiedStatus: "LIVE_CONFIRMED"` and sets `softDegradedSince: item.softDegradedSince ?? checkedAt`.

- [ ] **Step 1: Write failing unit tests in `tests/promotionCrawler.test.js` for structured metadata extraction and 48h soft degradation**
- [ ] **Step 2: Run `node --test tests/promotionCrawler.test.js` to verify failure**
- [ ] **Step 3: Implement `extractStructuredMetadataText` in `pageFetcher.js` and 48h soft degradation in `runPromotionPipeline.js`**
- [ ] **Step 4: Run `node --test tests/promotionCrawler.test.js` to verify pass**

---

### Task 3: Gemini Hybrid Offer Extractor & Safe Auto-Update / Review Queue (Stage 1 - Approach B)

**Files:**
- Create: `scripts/crawler/promotions/aiExtractor.js`
- Modify: `scripts/crawler/runPromotionPipeline.js`
- Test: `tests/promotionCrawler.test.js`

**Interfaces:**
- Produces in `scripts/crawler/promotions/aiExtractor.js`:
  - `verifyEvidenceQuote(pageText, evidenceQuote)`: Normalizes whitespace and verifies `evidenceQuote` (>= 6 chars) is a verbatim substring of `pageText`.
  - `validateUpdatedOffer(candidate, promotion, { now })`: Validates safety bounds (`isActive === true`, `offerPrice >= 0`, `originalPrice > 0`, `offerPrice < originalPrice`, `saving === originalPrice - offerPrice`, non-expired `deadline`).
  - `extractChangedOfferFromVariant(promotion, variantText, { now })`: Deterministic rule-based extractor that parses a `CHANGED` variant sentence (e.g., `"₩0에 1개월 동안 Premium 개인 요금제를 이용해 보세요."`) into a candidate offer update with verbatim `evidenceQuote`.
  - `extractOfferWithAi(promotion, pageText, { apiKey, fetchImpl, now })`: Calls Gemini (`gemini-2.5-flash` -> `gemini-3.5-flash-lite`) with `responseMimeType: "application/json"` when regex fails or needs disambiguation, then validates via `verifyEvidenceQuote` and `validateUpdatedOffer`.
- Produces in `scripts/crawler/runPromotionPipeline.js`:
  - `verifyPromotion(promotion, { loadPage, aiExtract, now })`: Uses deterministic variant extraction and optional `aiExtract` fallback when `CHANGED` or `NOT_FOUND` on readable pages; attaches `updatedOffer` and `autoUpdated: true` when safety checks pass, or keeps `CHANGED` for review staging.
  - `planCatalogUpdate(masterItems, byId, checkedAt, options)`: Returns `{ masterUpdated, kept, removed, review }` where `kept` excludes `isFreeTier` items, and `review` contains `CHANGED` items that require manual review (`public/catalog/promotions-review.json`).

- [ ] **Step 1: Write failing tests in `tests/promotionCrawler.test.js` for `verifyEvidenceQuote`, `validateUpdatedOffer`, `extractOfferWithAi`, and `verifyPromotion` + `planCatalogUpdate` auto-update/review staging**
- [ ] **Step 2: Run `node --test tests/promotionCrawler.test.js` to verify failure**
- [ ] **Step 3: Implement `scripts/crawler/promotions/aiExtractor.js` and integrate into `scripts/crawler/runPromotionPipeline.js`**
- [ ] **Step 4: Run `node --test tests/promotionCrawler.test.js` to verify pass**

---

### Task 4: Supabase DB Sync & Frontend Runtime Stale-While-Revalidate (Stage 2 - Approach C)

**Files:**
- Create: `scripts/crawler/promotions/supabaseSync.js`
- Create: `src/lib/promotionsSync.js`
- Modify: `scripts/crawler/runPromotionPipeline.js`
- Modify: `src/lib/supabase.js`
- Modify: `src/App.jsx`
- Test: `tests/promotionsSync.test.js`

**Interfaces:**
- Produces in `scripts/crawler/promotions/supabaseSync.js`:
  - `mapPromotionToBenefitRow(promotion, updatedAt)` and `mapPromotionToServiceBenefitRows(promotion)` matching `supabase/migrations/20260916100000_create_benefits_and_service_benefits_schema.sql`.
  - `syncPromotionsToSupabase(promotions, { supabaseUrl, supabaseKey, supabaseClient })`: Upserts `public.benefits` and `public.service_benefits`.
- Produces in `src/lib/promotionsSync.js`:
  - `isPromotionExpired(promotion, now)`: Checks ISO/YYYY-MM-DD deadline or `verifiedStatus === "EXPIRED"`.
  - `filterActivePromotions(promotions, { now })`: Filters out expired items and `isFreeTier === true` items, deduplicating by `id`.
  - `mapDbBenefitToPromotion(row)`: Maps Supabase `benefits` + `service_benefits` rows back to client promotion schema.
  - `loadLivePromotions({ fallbackPromotions, supabaseClient, fetchImpl, storage, now })`: Implements Stale-While-Revalidate (reads cached/fallback filtered promotions immediately, fetches from Supabase `benefits` or `/catalog/promotions.json`, updates cache).

- [ ] **Step 1: Write failing tests in `tests/promotionsSync.test.js` for DB row mapping, deadline/free-tier filtering, and SWR promotion loading**
- [ ] **Step 2: Run `node --test tests/promotionsSync.test.js` to verify failure**
- [ ] **Step 3: Implement `scripts/crawler/promotions/supabaseSync.js`, `src/lib/promotionsSync.js`, and wire into `runPromotionPipeline.js`, `src/lib/supabase.js`, and `src/App.jsx`**
- [ ] **Step 4: Run full test suite (`npm test`) and production build (`npm run build`) to verify everything passes**
