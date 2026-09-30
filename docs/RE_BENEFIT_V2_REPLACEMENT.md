# RE benefit pipeline replacement

Target: `bangsuhyoek/RE`, Supabase `ssukvsphufvdaanqlmgj` only.

## Product wiring

- `crawl:promotions` and `crawl:benefits:v2` run the RE-specific V2 collector.
- `crawl:schedule` retains the service-price crawler and replaces its benefit task with V2. It does not rewrite the static promotion catalog.
- `.github/workflows/benefit-v2.yml` schedules collection at 00:00 Korea time and allows manual active/shadow runs.
- Home, benefits, and subscription detail consume the same V2-enabled product list. Only the public projection is eligible, gated by the database flag.
- Failed/empty reads, expired re-verification deadlines, and hidden/ineligible recommendations preserve the existing catalog. V2 displaces only an identical official action URL; other benefits of the same service remain.
- V2 displays conditions, source links, verification date, and potential savings. Conditional amounts are not added to the old home/detail savings totals.

## Runtime requirements

The server needs `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and configured search-provider credentials. The workflow accepts Naver API Hub or legacy Naver credentials and Google Search credentials. Never put the admin key in browser variables.

For active publication set the repository variable `RE_BENEFIT_GOLD_SET_PATH` to a committed, current, independently adjudicated reference JSON. Local execution uses `BENEFIT_GOLD_SET_PATH`. The historical `tests/benefit-v2-independent-gold-20260922.json` is test material, not automatic production approval. The publication guard remains enforced; missing reference/configuration fails the run. Partial runs exit nonzero and cannot be reported as successful replacement.

```
pnpm run crawl:benefits:v2 -- --shadow
pnpm run crawl:benefits:v2 -- --active
```

The `benefits` row of `benefit_pipeline_flags` must use `active_version='v2', shadow_mode=false` for app consumption. This flag does not promote shadow rows. Only records independently accepted by the active publication guard become public.

## Rollback

Set the `benefits` flag to `active_version='v1', shadow_mode=true` to return product consumption to the existing catalog. Pause the V2 GitHub workflow if needed. `crawl:promotions:legacy` is retained for an explicit manual return to the old collector. No user subscriptions or unrelated project data are changed.

The original trial document describes the uploaded shadow package before the replacement wiring; this document describes the replacement code.
