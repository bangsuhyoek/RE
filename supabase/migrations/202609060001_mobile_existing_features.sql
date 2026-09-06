-- RE. Android 전환용 DB 스키마 (기존 팀 Supabase 프로젝트 호환)
-- 기존 subscription_services / service_plans / subscriptions 구조와 데이터를 보존합니다.
-- 현재 구현된 프로필/구독/해지 이력/알림 데이터만 추가 저장합니다.
-- 결제, 둘러보기, 프로모션 수집, 소셜 로그인 같은 미구현 기능은 새로 만들지 않습니다.

create extension if not exists pgcrypto;

create or replace function public.re_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 팀 프로젝트에 이미 존재하는 subscriptions 테이블의 의미를 유지하고,
-- 모바일 앱 동기화에 필요한 클라이언트 메타데이터만 추가합니다.
alter table public.subscriptions
  add column if not exists subscription_id text,
  add column if not exists monogram text,
  add column if not exists mark_tone text,
  add column if not exists next_billing_date date,
  add column if not exists renewal_reviewed_for text;

update public.subscriptions
set subscription_id = 'legacy-' || id::text
where subscription_id is null;

alter table public.subscriptions
  alter column subscription_id set not null;

create unique index if not exists subscriptions_user_subscription_id_uidx
  on public.subscriptions(user_id, subscription_id);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '',
  provider text not null default 'RE.',
  notifications_allowed boolean not null default true,
  onboarding_complete boolean not null default false,
  intro_seen boolean not null default false,
  saved_amount numeric(14,2) not null default 0 check (saved_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cancellation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  history_id text not null,
  subscription_id text,
  service_id text,
  name text not null,
  monogram text,
  plan text,
  category text,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  billing_cycle text not null default '매월',
  cancelled_at timestamptz not null default now(),
  source text not null default 'guide',
  unique (user_id, history_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id text not null,
  subscription_id text,
  service_name text,
  amount numeric(14,2),
  plan text,
  monogram text,
  category text,
  type text not null default 'system',
  badge text,
  title text not null,
  message text not null default '',
  occurred_at timestamptz not null default now(),
  days_until integer,
  is_read boolean not null default false,
  unique (user_id, notification_id)
);

create index if not exists subscriptions_user_due_idx
  on public.subscriptions(user_id, due_day);
create index if not exists cancellation_history_user_date_idx
  on public.cancellation_history(user_id, cancelled_at desc);
create index if not exists notifications_user_date_idx
  on public.notifications(user_id, occurred_at desc);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.cancellation_history enable row level security;
alter table public.notifications enable row level security;

-- 기존 subscriptions RLS 정책은 그대로 유지합니다.
drop policy if exists re_profiles_owner_all on public.profiles;
create policy re_profiles_owner_all on public.profiles
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists re_cancellation_history_owner_all on public.cancellation_history;
create policy re_cancellation_history_owner_all on public.cancellation_history
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists re_notifications_owner_all on public.notifications;
create policy re_notifications_owner_all on public.notifications
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop trigger if exists re_profiles_set_updated_at on public.profiles;
create trigger re_profiles_set_updated_at
before update on public.profiles
for each row execute function public.re_set_updated_at();

drop trigger if exists re_subscriptions_set_updated_at on public.subscriptions;
create trigger re_subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.re_set_updated_at();

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update, delete on public.cancellation_history to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
