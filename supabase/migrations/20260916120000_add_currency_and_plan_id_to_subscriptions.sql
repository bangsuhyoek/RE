-- ==========================================================
-- subscriptions 테이블에 외화 결제 필드 및 공식 요금제 식별자 추가
-- 파일: supabase/migrations/20260916120000_add_currency_and_plan_id_to_subscriptions.sql
-- ==========================================================

begin;

-- 1. 외화 결제 필드 (기본 KRW, USD 등 지원) 및 외화 원금액 컬럼 추가
alter table public.subscriptions
  add column if not exists currency text not null default 'KRW',
  add column if not exists original_amount numeric null;

-- 2. 공식 요금제 연결 (service_plans 외래키, 수동 커스텀 플랜은 null)
alter table public.subscriptions
  add column if not exists plan_id text references public.service_plans(id) on delete set null;

create index if not exists idx_subscriptions_plan_id on public.subscriptions(plan_id);

-- 3. 컬럼 설명 추가
comment on column public.subscriptions.currency is '결제 통화 (기본 KRW, 달러 결제 시 USD 등)';
comment on column public.subscriptions.original_amount is '외화 원결제 금액 (예: 20.00 달러)';
comment on column public.subscriptions.plan_id is '공식 요금제 식별자 (service_plans.id 외래키, 커스텀 플랜 시 null)';

commit;

