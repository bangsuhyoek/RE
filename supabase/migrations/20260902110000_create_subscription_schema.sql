begin;

create extension if not exists pgcrypto;

create table if not exists public.subscription_services (
  id text primary key,
  name text not null,
  aliases jsonb not null default '[]'::jsonb,
  category text not null default '기타',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_services_aliases_array check (jsonb_typeof(aliases) = 'array')
);

create table if not exists public.service_plans (
  id text primary key,
  service_id text not null references public.subscription_services(id) on delete cascade,
  name text not null,
  aliases jsonb not null default '[]'::jsonb,
  amount_krw integer not null,
  billing_cycle text not null,
  catalog_version text not null,
  verified_at date,
  source_note text not null default '기존 프로젝트 기준값; 공식 가격 검증 필요',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_plans_aliases_array check (jsonb_typeof(aliases) = 'array'),
  constraint service_plans_positive_amount check (amount_krw > 0),
  constraint service_plans_billing_cycle check (billing_cycle in ('매월', '매년')),
  unique (service_id, name, billing_cycle)
);

create table if not exists public.receipt_recognitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  provider text not null,
  status text not null,
  catalog_version text,
  extracted_fields jsonb not null default '{}'::jsonb,
  field_sources jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  image_mime_type text,
  created_at timestamptz not null default now(),
  constraint receipt_recognitions_source_type check (source_type in ('image', 'sms')),
  constraint receipt_recognitions_status check (status in ('success', 'needs_review', 'failed')),
  constraint receipt_recognitions_extracted_fields_object check (jsonb_typeof(extracted_fields) = 'object'),
  constraint receipt_recognitions_field_sources_object check (jsonb_typeof(field_sources) = 'object'),
  constraint receipt_recognitions_warnings_array check (jsonb_typeof(warnings) = 'array'),
  constraint receipt_recognitions_image_mime check (
    image_mime_type is null or image_mime_type in ('image/jpeg', 'image/png', 'image/webp')
  )
);

comment on table public.receipt_recognitions is
  '영수증 인식 결과 메타데이터. 이미지 원본과 OCR 원문은 저장하지 않는다.';

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recognition_id uuid references public.receipt_recognitions(id) on delete set null,
  service_id text references public.subscription_services(id) on delete set null,
  service_name text not null,
  plan_name text not null,
  category text not null default '기타',
  amount_krw integer not null,
  due_day smallint not null,
  billing_cycle text not null,
  payment_method text not null default '',
  cancel_url text not null default '',
  status text not null default 'active',
  source_type text not null default 'manual',
  alert_d3 boolean not null default true,
  alert_d1 boolean not null default false,
  renewal_pending boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_positive_amount check (amount_krw > 0),
  constraint subscriptions_due_day_range check (due_day between 1 and 31),
  constraint subscriptions_billing_cycle check (billing_cycle in ('매월', '매년')),
  constraint subscriptions_status check (status in ('active', 'trial', 'cancel_pending', 'cancelled')),
  constraint subscriptions_source_type check (source_type in ('onboarding', 'manual', 'image', 'sms'))
);

create index if not exists receipt_recognitions_user_created_idx
  on public.receipt_recognitions (user_id, created_at desc);

create index if not exists subscriptions_user_status_due_idx
  on public.subscriptions (user_id, status, due_day);

create index if not exists subscriptions_recognition_idx
  on public.subscriptions (recognition_id)
  where recognition_id is not null;

create unique index if not exists subscriptions_user_service_plan_active_uidx
  on public.subscriptions (user_id, lower(service_name), lower(plan_name))
  where status in ('active', 'trial', 'cancel_pending');

create or replace function public.set_submate_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_submate_updated_at() from public, anon, authenticated;

drop trigger if exists subscription_services_set_updated_at on public.subscription_services;
create trigger subscription_services_set_updated_at
before update on public.subscription_services
for each row execute function public.set_submate_updated_at();

drop trigger if exists service_plans_set_updated_at on public.service_plans;
create trigger service_plans_set_updated_at
before update on public.service_plans
for each row execute function public.set_submate_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_submate_updated_at();

alter table public.subscription_services enable row level security;
alter table public.service_plans enable row level security;
alter table public.receipt_recognitions enable row level security;
alter table public.subscriptions enable row level security;

revoke all on table public.subscription_services from anon, authenticated;
revoke all on table public.service_plans from anon, authenticated;
revoke all on table public.receipt_recognitions from anon, authenticated;
revoke all on table public.subscriptions from anon, authenticated;

grant select on table public.subscription_services to anon, authenticated;
grant select on table public.service_plans to anon, authenticated;
grant select, insert, update, delete on table public.receipt_recognitions to authenticated;
grant select, insert, update, delete on table public.subscriptions to authenticated;

drop policy if exists "Anyone can read active subscription services" on public.subscription_services;
create policy "Anyone can read active subscription services"
on public.subscription_services for select
to anon, authenticated
using (active = true);

drop policy if exists "Anyone can read active service plans" on public.service_plans;
create policy "Anyone can read active service plans"
on public.service_plans for select
to anon, authenticated
using (active = true);

drop policy if exists "Users can read own receipt recognitions" on public.receipt_recognitions;
create policy "Users can read own receipt recognitions"
on public.receipt_recognitions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own receipt recognitions" on public.receipt_recognitions;
create policy "Users can insert own receipt recognitions"
on public.receipt_recognitions for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own receipt recognitions" on public.receipt_recognitions;
create policy "Users can update own receipt recognitions"
on public.receipt_recognitions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own receipt recognitions" on public.receipt_recognitions;
create policy "Users can delete own receipt recognitions"
on public.receipt_recognitions for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own subscriptions" on public.subscriptions;
create policy "Users can read own subscriptions"
on public.subscriptions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own subscriptions" on public.subscriptions;
create policy "Users can insert own subscriptions"
on public.subscriptions for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own subscriptions" on public.subscriptions;
create policy "Users can update own subscriptions"
on public.subscriptions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own subscriptions" on public.subscriptions;
create policy "Users can delete own subscriptions"
on public.subscriptions for delete
to authenticated
using ((select auth.uid()) = user_id);

insert into public.subscription_services (id, name, aliases, category)
values
  ('netflix', 'Netflix', '["netflix", "넷플릭스", "netflix.com"]'::jsonb, 'OTT'),
  ('youtube', 'YouTube Premium', '["youtube premium", "youtube", "유튜브 프리미엄", "유튜브"]'::jsonb, 'OTT'),
  ('coupang', '쿠팡 와우', '["coupang wow", "coupang", "쿠팡 와우", "쿠팡와우", "쿠팡"]'::jsonb, '쇼핑'),
  ('spotify', 'Spotify', '["spotify", "스포티파이"]'::jsonb, '음악'),
  ('chatgpt', 'ChatGPT Plus', '["chatgpt plus", "chatgpt", "openai", "챗지피티"]'::jsonb, '생산성'),
  ('tving', '티빙', '["tving", "티빙", "cj enm tving"]'::jsonb, 'OTT'),
  ('disney', 'Disney+', '["disney+", "disney plus", "disneyplus", "디즈니+", "디즈니 플러스"]'::jsonb, 'OTT')
on conflict (id) do update
set name = excluded.name,
    aliases = excluded.aliases,
    category = excluded.category,
    active = true;

insert into public.service_plans
  (id, service_id, name, aliases, amount_krw, billing_cycle, catalog_version, verified_at, source_note)
values
  ('netflix-premium-monthly', 'netflix', '프리미엄', '["premium", "프리미엄"]'::jsonb, 17000, '매월', 'submate-project-2026-09-02', null, '기존 프로젝트 기준값; 공식 가격 검증 필요'),
  ('youtube-individual-monthly', 'youtube', '개인 멤버십', '["individual", "개인 멤버십", "개인"]'::jsonb, 14900, '매월', 'submate-project-2026-09-02', null, '기존 프로젝트 기준값; 공식 가격 검증 필요'),
  ('coupang-wow-monthly', 'coupang', '와우 멤버십', '["wow membership", "와우 멤버십", "와우"]'::jsonb, 7890, '매월', 'submate-project-2026-09-02', null, '기존 프로젝트 기준값; 공식 가격 검증 필요'),
  ('spotify-individual-monthly', 'spotify', '개인', '["premium individual", "individual", "개인"]'::jsonb, 10900, '매월', 'submate-project-2026-09-02', null, '기존 프로젝트 기준값; 공식 가격 검증 필요'),
  ('chatgpt-plus-monthly', 'chatgpt', 'Plus', '["chatgpt plus", "plus", "플러스"]'::jsonb, 29000, '매월', 'submate-project-2026-09-02', null, '기존 프로젝트 기준값; 공식 가격 검증 필요'),
  ('tving-standard-monthly', 'tving', '스탠다드', '["standard", "스탠다드"]'::jsonb, 13500, '매월', 'submate-project-2026-09-02', null, '기존 프로젝트 기준값; 공식 가격 검증 필요'),
  ('disney-standard-monthly', 'disney', '스탠다드', '["standard", "스탠다드"]'::jsonb, 9900, '매월', 'submate-project-2026-09-02', null, '기존 프로젝트 기준값; 공식 가격 검증 필요')
on conflict (id) do update
set service_id = excluded.service_id,
    name = excluded.name,
    aliases = excluded.aliases,
    amount_krw = excluded.amount_krw,
    billing_cycle = excluded.billing_cycle,
    catalog_version = excluded.catalog_version,
    verified_at = excluded.verified_at,
    source_note = excluded.source_note,
    active = true;

commit;
