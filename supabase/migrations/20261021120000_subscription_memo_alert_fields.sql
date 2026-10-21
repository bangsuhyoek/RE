-- ==========================================================
-- Subscriptions: 메모 및 사전 알림 시점/시간(D-day, hour, ampm) 컬럼 추가
-- 파일: supabase/migrations/20261021120000_subscription_memo_alert_fields.sql
-- ==========================================================

begin;

-- 1. memo 컬럼 추가 (사용자 메모)
alter table public.subscriptions
  add column if not exists memo text;

comment on column public.subscriptions.memo is '사용자 작성 구독 메모';

-- 2. alert_dday 컬럼 추가 (결제일 D-Day 알림 시점, 1~31)
alter table public.subscriptions
  add column if not exists alert_dday smallint;

alter table public.subscriptions
  drop constraint if exists subscriptions_alert_dday_check;

alter table public.subscriptions
  add constraint subscriptions_alert_dday_check
  check (alert_dday is null or (alert_dday between 1 and 31));

comment on column public.subscriptions.alert_dday is '사전 결제 알림 D-day 시점 (기본 D-3 또는 D-1 등)';

-- 3. alert_hour 컬럼 추가 (알림 시간, 1~12시)
alter table public.subscriptions
  add column if not exists alert_hour smallint;

alter table public.subscriptions
  drop constraint if exists subscriptions_alert_hour_check;

alter table public.subscriptions
  add constraint subscriptions_alert_hour_check
  check (alert_hour is null or (alert_hour between 1 and 12));

comment on column public.subscriptions.alert_hour is '사전 결제 알림 발송 시간(1~12)';

-- 4. alert_ampm 컬럼 추가 (오전/오후)
alter table public.subscriptions
  add column if not exists alert_ampm text;

alter table public.subscriptions
  drop constraint if exists subscriptions_alert_ampm_check;

alter table public.subscriptions
  add constraint subscriptions_alert_ampm_check
  check (alert_ampm is null or alert_ampm in ('오전', '오후'));

comment on column public.subscriptions.alert_ampm is '사전 결제 알림 오전/오후 구분';

commit;

