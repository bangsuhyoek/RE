-- ==========================================================
-- Cancel Difficulty: 해지 난이도 점수 공개 기준을 서로 다른 제보자 5명 이상으로 강화
-- 파일: supabase/migrations/20261019103000_k_anonymous_cancel_difficulty.sql
-- ==========================================================

begin;

-- 1. 서로 다른 제보자 식별을 위한 user_hash 컬럼 추가 (auth.uid()와 service_id의 단방향 해시, raw user_id 미저장)
alter table public.cancel_difficulty_reports
  add column if not exists user_hash text;

comment on column public.cancel_difficulty_reports.user_hash is
  'auth.uid()와 service_id의 SHA-256 해시. k-익명성(서로 다른 제보자 5명 이상) 집계를 위해 활용되며 user_id는 저장하지 않습니다.';

create index if not exists idx_cancel_difficulty_reports_service_user_hash
  on public.cancel_difficulty_reports (service_id, user_hash);

-- 2. INSERT 트리거 함수 갱신: reporter_hash(1일 1회 제보 제한) 및 user_hash(고유 제보자 식별) 계산
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
  else
    new.reporter_hash := null;
    new.user_hash := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_cancel_difficulty_reporter_hash on public.cancel_difficulty_reports;
create trigger trg_set_cancel_difficulty_reporter_hash
  before insert on public.cancel_difficulty_reports
  for each row
  execute function public.set_cancel_difficulty_reporter_hash();

-- 3. get_cancel_difficulty_scores 함수 갱신: 서로 다른 제보자 5명 이상(count(distinct r.user_hash) >= 5)만 공개
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
    having pg_catalog.count(distinct r.user_hash) >= 5
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

-- 4. 뷰 정의 갱신 및 권한 유지
create or replace view public.cancel_difficulty_scores as
  select * from public.get_cancel_difficulty_scores();

alter view if exists public.cancel_difficulty_scores set (security_invoker = true);

grant execute on function public.get_cancel_difficulty_scores() to anon, authenticated;
grant select on public.cancel_difficulty_scores to anon, authenticated;

commit;
