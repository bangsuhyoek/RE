-- ==========================================================
-- Hardening: Approval requests mandate_id index & Cancel difficulty reports rate limiting
-- 파일: supabase/migrations/20261018120000_hardening_indexes_and_report_limits.sql
-- ==========================================================

begin;

-- (a) approval_requests.mandate_id 외래키 인덱스 생성
create index if not exists idx_approval_requests_mandate_id
  on public.approval_requests (mandate_id);

-- (b) cancel_difficulty_reports 테이블 익명 유지 및 사용자당 서비스별 1일 1회 제보 제한
create extension if not exists pgcrypto with schema extensions;

alter table public.cancel_difficulty_reports
  add column if not exists reporter_hash text;

comment on column public.cancel_difficulty_reports.reporter_hash is
  'auth.uid(), service_id, KST 제보 일자의 SHA-256 해시. user_id를 직접 저장하지 않고 1일 1회 중복 제보를 방지합니다.';

create unique index if not exists cancel_difficulty_reports_reporter_hash_uidx
  on public.cancel_difficulty_reports (reporter_hash)
  where reporter_hash is not null;

-- BEFORE INSERT 트리거 함수 (SECURITY DEFINER, search_path = '')
create or replace function public.set_cancel_difficulty_reporter_hash()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_date text;
begin
  -- 클라이언트가 보낸 created_on을 신뢰하지 않고 KST 기준 당일 날짜로 강제 지정
  new.created_on := (timezone('Asia/Seoul', now()))::date;

  if v_uid is not null then
    v_date := to_char(new.created_on, 'YYYY-MM-DD');
    new.reporter_hash := encode(
      extensions.digest(
        v_uid::text || ':' || new.service_id || ':' || v_date,
        'sha256'
      ),
      'hex'
    );
  else
    -- 인증되지 않은 호출 시 클라이언트가 제공한 해시를 신뢰하지 않고 명시적으로 null 설정
    new.reporter_hash := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_cancel_difficulty_reporter_hash on public.cancel_difficulty_reports;
create trigger trg_set_cancel_difficulty_reporter_hash
  before insert on public.cancel_difficulty_reports
  for each row
  execute function public.set_cancel_difficulty_reporter_hash();

commit;
