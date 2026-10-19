-- ==========================================================
-- Benefits: 혜택 상태값 confirmed | unverified | expired 통일 및 미사용 함수 정리
-- 파일: supabase/migrations/20261019101000_unify_benefit_verified_status.sql
-- ==========================================================

begin;

-- 1. 기존 'active' 상태값 및 비표준 상태값을 'confirmed'로 데이터 마이그레이션
update public.benefits
   set verified_status = 'confirmed'
 where verified_status = 'active'
    or verified_status not in ('confirmed', 'unverified', 'expired');

-- 2. verified_status 컬럼 기본값을 'confirmed'로 변경
alter table public.benefits
  alter column verified_status set default 'confirmed';

-- 3. verified_status 허용값 CHECK 제약조건 추가
alter table public.benefits
  drop constraint if exists benefits_verified_status_check;

alter table public.benefits
  add constraint benefits_verified_status_check
  check (verified_status in ('confirmed', 'unverified', 'expired'));

comment on column public.benefits.verified_status is '혜택 검증 상태: confirmed(확인됨), unverified(미검증), expired(만료됨)';

-- 4. 미사용 get_user_personalized_benefits 함수 제거 (클라이언트 및 API 어디서도 호출되지 않음)
drop function if exists public.get_user_personalized_benefits(uuid);

commit;
