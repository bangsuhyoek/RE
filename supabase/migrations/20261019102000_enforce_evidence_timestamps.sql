-- ==========================================================
-- Evidence: 증빙 INSERT 시 created_at 및 만료 시각(expires_at) 서버 강제 트리거
-- 파일: supabase/migrations/20261019102000_enforce_evidence_timestamps.sql
-- ==========================================================

begin;

-- 1. evidence_cases INSERT 시 서버 시각 강제 트리거 함수
create or replace function public.set_evidence_case_timestamps()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 클라이언트가 보낸 시각을 신뢰하지 않고 서버 시각 기준 강제 설정
  new.created_at := now();
  new.expires_at := now() + interval '1 year';
  return new;
end;
$$;

revoke all on function public.set_evidence_case_timestamps() from public, anon;

drop trigger if exists trg_set_evidence_case_timestamps on public.evidence_cases;
create trigger trg_set_evidence_case_timestamps
  before insert on public.evidence_cases
  for each row
  execute function public.set_evidence_case_timestamps();

-- 2. evidence_items INSERT 시 created_at 서버 시각 강제 트리거 함수
create or replace function public.set_evidence_item_timestamps()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_at := now();
  return new;
end;
$$;

revoke all on function public.set_evidence_item_timestamps() from public, anon;

drop trigger if exists trg_set_evidence_item_timestamps on public.evidence_items;
create trigger trg_set_evidence_item_timestamps
  before insert on public.evidence_items
  for each row
  execute function public.set_evidence_item_timestamps();

commit;
