-- ==========================================================
-- Cancel Difficulty: 회원 탈퇴 시 제보 데이터 삭제를 위한 owner_hash 추가
-- 파일: supabase/migrations/20261019121000_cancel_difficulty_owner_hash.sql
-- ==========================================================

begin;

-- 1. 회원 탈퇴 시 본인 제보 식별 및 일괄 삭제를 위한 owner_hash 컬럼 추가 (raw user_id 미저장)
alter table public.cancel_difficulty_reports
  add column if not exists owner_hash text;

comment on column public.cancel_difficulty_reports.owner_hash is
  'auth.uid()의 SHA-256 해시. 회원 탈퇴 시 본인의 해지 난이도 제보를 삭제하기 위해 활용되며 user_id는 직접 저장하지 않습니다.';

create index if not exists idx_cancel_difficulty_reports_owner_hash
  on public.cancel_difficulty_reports (owner_hash)
  where owner_hash is not null;

-- 2. INSERT 트리거 함수 갱신: owner_hash 추가 (기존 reporter_hash 및 user_hash 보존)
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
    -- 1일 1회 중복 제보 방지용 일자 포함 해시
    new.reporter_hash := encode(
      extensions.digest(
        v_uid::text || ':' || new.service_id || ':' || v_date,
        'sha256'
      ),
      'hex'
    );
    -- 서로 다른 제보자 수 집계용 해시 (일자 미포함, 서비스별 격리)
    new.user_hash := encode(
      extensions.digest(
        v_uid::text || ':' || new.service_id,
        'sha256'
      ),
      'hex'
    );
    -- 회원 탈퇴 시 본인 제보 일괄 삭제용 해시 (auth.uid() 단독 SHA-256)
    new.owner_hash := encode(
      extensions.digest(
        v_uid::text,
        'sha256'
      ),
      'hex'
    );
  else
    new.reporter_hash := null;
    new.user_hash := null;
    new.owner_hash := null;
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
