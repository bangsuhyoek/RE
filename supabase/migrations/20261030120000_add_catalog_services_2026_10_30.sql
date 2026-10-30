-- ==========================================================
-- 신규 구독 서비스 5종 시드 (2026-10-30 카탈로그 확장)
-- 파일: supabase/migrations/20261030120000_add_catalog_services_2026_10_30.sql
-- ==========================================================

begin;

insert into public.subscription_services (id, name, aliases, category, active)
values
  ('apple-one', 'Apple One', '["애플원","애플 원","Apple One","apple one","애플 구독"]'::jsonb, 'OTT', true),
  ('google-ai', 'Google AI Pro', '["구글 AI","구글 AI 프로","제미나이","Gemini","Google AI Pro","구글 AI 플랜"]'::jsonb, 'SaaS', true),
  ('ssg7club', '쓱7클럽', '["쓱7클럽","쓱세븐클럽","SSG7","ssg7club","쓱클럽","SSG 멤버십"]'::jsonb, '쇼핑', true),
  ('kakao-membership', '카카오멤버십', '["카카오멤버십","카카오 멤버십","kakao membership","카카오 통합멤버십","카카오 구독"]'::jsonb, '생활/모빌리티', true),
  ('lg-udok', 'LG유플러스 유독', '["유독","LG유플러스 유독","U+ 유독","유플러스 유독","udok"]'::jsonb, '생활/모빌리티', true)
on conflict (id) do update set
  name = excluded.name,
  aliases = excluded.aliases,
  category = excluded.category,
  active = true,
  updated_at = now();

delete from public.service_plans where service_id in ('apple-one', 'google-ai', 'ssg7club', 'kakao-membership', 'lg-udok');

insert into public.service_plans (id, service_id, name, aliases, amount_krw, billing_cycle, catalog_version, verified_at, source_note, active)
values
  ('apple-one-individual-monthly', 'apple-one', '개인', '["애플원","애플 원","Apple One","apple one","애플 구독"]'::jsonb, 14900, '매월', '2026.10.30', current_date, '공식 요금 페이지 검증', true),
  ('apple-one-family-monthly', 'apple-one', '가족', '["애플원","애플 원","Apple One","apple one","애플 구독"]'::jsonb, 20900, '매월', '2026.10.30', current_date, '공식 요금 페이지 검증', true),
  ('google-ai-pro-monthly', 'google-ai', 'Google AI Pro', '["구글 AI","구글 AI 프로","제미나이","Gemini","Google AI Pro","구글 AI 플랜"]'::jsonb, 29000, '매월', '2026.10.30', current_date, '공식 요금 페이지 검증', true),
  ('ssg7club-base-monthly', 'ssg7club', '쓱7클럽', '["쓱7클럽","쓱세븐클럽","SSG7","ssg7club","쓱클럽","SSG 멤버십"]'::jsonb, 2900, '매월', '2026.10.30', current_date, '공식 요금 페이지 검증', true),
  ('ssg7club-tving-monthly', 'ssg7club', '쓱7클럽+TVING', '["쓱7클럽","쓱세븐클럽","SSG7","ssg7club","쓱클럽","SSG 멤버십"]'::jsonb, 3900, '매월', '2026.10.30', current_date, '공식 요금 페이지 검증', true),
  ('kakao-membership-default-monthly-monthly', 'kakao-membership', '카카오멤버십', '["카카오멤버십","카카오 멤버십","kakao membership","카카오 통합멤버십","카카오 구독"]'::jsonb, 4900, '매월', '2026.10.30', current_date, '공식 요금 페이지 검증', true),
  ('lg-udok-pack-monthly', 'lg-udok', '유독 Pack', '["유독","LG유플러스 유독","U+ 유독","유플러스 유독","udok"]'::jsonb, 9900, '매월', '2026.10.30', current_date, '공식 요금 페이지 검증', true);

commit;
