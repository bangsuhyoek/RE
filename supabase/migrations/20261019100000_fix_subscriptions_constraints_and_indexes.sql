-- ==========================================================
-- Subscriptions: 0원 무료체험 허용, is_pinned 컬럼 추가, updated_at 갱신 트리거 보장, 과도한 유일 인덱스 완화
-- 파일: supabase/migrations/20261019100000_fix_subscriptions_constraints_and_indexes.sql
-- ==========================================================

begin;

-- 1. 금액 CHECK 0 이상 완화 (0원 무료 체험 지원)
-- 운영 DB 안전성: 음수 금액 데이터가 존재할 경우 0으로 보정한 후 제약조건 추가
update public.subscriptions
   set amount_krw = 0
 where amount_krw < 0;

alter table public.subscriptions
  drop constraint if exists subscriptions_positive_amount;

alter table public.subscriptions
  drop constraint if exists subscriptions_amount_krw_nonnegative;

alter table public.subscriptions
  add constraint subscriptions_amount_krw_nonnegative
  check (amount_krw >= 0);

-- 2. is_pinned 컬럼 추가 (홈 화면 상단 고정)
alter table public.subscriptions
  add column if not exists is_pinned boolean not null default false;

comment on column public.subscriptions.is_pinned is '홈 화면 구독 목록 최상단 고정 여부';

-- 3. updated_at 기본값 및 UPDATE 시 갱신 트리거 보장
alter table public.subscriptions
  alter column updated_at set default now();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_submate_updated_at();

-- 4. 유일 인덱스 완화:
-- 기존 subscriptions_user_service_plan_active_uidx는 동일 서비스·요금제에 대해 복수 계정/다회선 구독 등록을 차단하여 정당한 저장을 방해함.
-- SubMate의 동기화 및 식별 기준은 (user_id, subscription_id)이며, 해당 유일성은 subscriptions_user_subscription_id_uidx로 보장됨.
-- 따라서 과도한 유일 인덱스를 제거하고 조회 성능을 위한 일반 인덱스로 전환함.
drop index if exists public.subscriptions_user_service_plan_active_uidx;

create index if not exists idx_subscriptions_user_service_plan
  on public.subscriptions (user_id, lower(service_name), lower(plan_name))
  where status in ('active', 'trial', 'cancel_pending');

commit;
