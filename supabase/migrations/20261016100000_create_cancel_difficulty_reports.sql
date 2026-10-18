-- 해지 난이도 및 다크패턴 지수 (cancel_difficulty_reports)
-- - 로그인 사용자가 명시적 동의(opt-in)한 경우에만 익명으로 해지 경험을 수집합니다.
-- - user_id 및 개인 식별 정보는 일체 저장하지 않습니다.
-- - k-익명성(k=5): 서비스별 5건 이상 모인 경우에만 집계 점수를 공개합니다.
-- - 악용 방지: authenticated 사용자만 insert 가능, check 제약 조건 적용.
-- - 보관 기간: 제보는 2년 동안 보관한 뒤 매일 자동 삭제합니다.
begin;

create table if not exists public.cancel_difficulty_reports (
  id uuid primary key default gen_random_uuid(),
  service_id text not null,
  steps_count integer not null,
  duration_sec integer not null,
  phone_only boolean not null default false,
  retention_offer_shown boolean not null default false,
  hidden_menu boolean not null default false,
  forced_survey_or_chat boolean not null default false,
  difficulty integer not null,
  outcome text not null,
  app_version text not null default '1.0.0',
  created_on date not null default current_date,

  constraint cancel_difficulty_reports_service_id check (char_length(service_id) between 1 and 64),
  constraint cancel_difficulty_reports_steps check (steps_count between 0 and 50),
  constraint cancel_difficulty_reports_duration check (duration_sec between 0 and 7200 and duration_sec % 10 = 0),
  constraint cancel_difficulty_reports_difficulty check (difficulty between 1 and 5),
  constraint cancel_difficulty_reports_outcome check (outcome in ('cancelled', 'gave_up')),
  constraint cancel_difficulty_reports_app_version check (char_length(app_version) between 1 and 20)
);

comment on table public.cancel_difficulty_reports is
  '익명 해지 난이도 및 다크패턴 제보. user_id 없이 저장되며 2년간 보관 후 삭제되고 최소 5건 이상 집계 시에만 공개 통계로 활용됩니다.';

create index if not exists cancel_difficulty_reports_service_created_idx
  on public.cancel_difficulty_reports (service_id, created_on desc);

alter table public.cancel_difficulty_reports enable row level security;

-- 원본 테이블에는 누구에게도 SELECT 권한을 부여하지 않습니다 (k-익명성 및 프라이버시 보호).
revoke all on public.cancel_difficulty_reports from anon, authenticated;

-- 로그인된(authenticated) 사용자만 INSERT 허용
grant insert on public.cancel_difficulty_reports to authenticated;

drop policy if exists cancel_difficulty_reports_insert_auth on public.cancel_difficulty_reports;
create policy cancel_difficulty_reports_insert_auth on public.cancel_difficulty_reports
  for insert to authenticated
  with check (true);

-- 집계 함수 (SECURITY DEFINER, search_path = ''): 최근 2년 데이터만 집계하며 5건 이상 모인 서비스만 반환
create or replace function public.get_cancel_difficulty_scores()
returns table (
  service_id text,
  report_count bigint,
  avg_difficulty numeric,
  phone_only_rate numeric,
  hidden_menu_rate numeric,
  retention_offer_rate numeric,
  forced_survey_rate numeric,
  gave_up_rate numeric,
  median_steps integer,
  median_duration_sec integer,
  difficulty_score integer
)
language sql
security definer
set search_path = ''
stable
as $$
  with aggregated as (
    select
      r.service_id,
      pg_catalog.count(*)::bigint as report_count,
      pg_catalog.round(pg_catalog.avg(r.difficulty)::numeric, 2) as avg_difficulty,
      pg_catalog.round(pg_catalog.count(*) filter (where r.phone_only)::numeric / pg_catalog.count(*)::numeric, 4) as phone_only_rate,
      pg_catalog.round(pg_catalog.count(*) filter (where r.hidden_menu)::numeric / pg_catalog.count(*)::numeric, 4) as hidden_menu_rate,
      pg_catalog.round(pg_catalog.count(*) filter (where r.retention_offer_shown)::numeric / pg_catalog.count(*)::numeric, 4) as retention_offer_rate,
      pg_catalog.round(pg_catalog.count(*) filter (where r.forced_survey_or_chat)::numeric / pg_catalog.count(*)::numeric, 4) as forced_survey_rate,
      pg_catalog.round(pg_catalog.count(*) filter (where r.outcome = 'gave_up')::numeric / pg_catalog.count(*)::numeric, 4) as gave_up_rate,
      pg_catalog.percentile_cont(0.5) within group (order by r.steps_count)::integer as median_steps,
      pg_catalog.percentile_cont(0.5) within group (order by r.duration_sec)::integer as median_duration_sec
    from public.cancel_difficulty_reports r
  where r.created_on >= (current_date - interval '2 years')::date
    group by r.service_id
    having pg_catalog.count(*) >= 5
  )
  select
    service_id,
    report_count,
    avg_difficulty,
    phone_only_rate,
    hidden_menu_rate,
    retention_offer_rate,
    forced_survey_rate,
    gave_up_rate,
    median_steps,
    median_duration_sec,
    pg_catalog.round(
      greatest(0, least(100,
        (avg_difficulty - 1.0) * 10.0
        + phone_only_rate * 20.0
        + hidden_menu_rate * 15.0
        + retention_offer_rate * 10.0
        + forced_survey_rate * 15.0
        + gave_up_rate * 10.0
        + (greatest(0, least(10, median_steps - 3)) / 7.0) * 5.0
        + (greatest(0, least(600, median_duration_sec - 60)) / 540.0) * 5.0
      ))
    )::integer as difficulty_score
  from aggregated;
$$;

-- 보안 정의자 뷰 (cancel_difficulty_scores)
create or replace view public.cancel_difficulty_scores as
  select * from public.get_cancel_difficulty_scores();

grant execute on function public.get_cancel_difficulty_scores() to anon, authenticated;
grant select on public.cancel_difficulty_scores to anon, authenticated;

-- 2년 지난 제보 데이터 자동 삭제 함수
create or replace function public.purge_old_cancel_difficulty_reports()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.cancel_difficulty_reports
  where created_on < (current_date - interval '2 years')::date;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.purge_old_cancel_difficulty_reports() from public, anon, authenticated;

-- pg_cron이 활성화되어 있으므로 매일 새벽 자동 실행 스케줄 등록
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'purge-old-cancel-difficulty-reports';
select cron.schedule('purge-old-cancel-difficulty-reports', '25 3 * * *', 'select public.purge_old_cancel_difficulty_reports()');

commit;
