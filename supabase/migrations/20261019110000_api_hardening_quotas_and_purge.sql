-- ==========================================================
-- API Hardening: Endpoint Quotas, Global Quota, and 90-Day Purge
-- File: supabase/migrations/20261019110000_api_hardening_quotas_and_purge.sql
-- ==========================================================

create table if not exists public.api_endpoint_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  kind text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (user_id, endpoint, kind, window_start)
);

alter table public.api_endpoint_usage enable row level security;

-- Global Gemini usage counter (not user-scoped, exception to user_id on delete cascade)
create table if not exists public.gemini_global_usage (
  day date not null primary key,
  count int not null default 0
);

alter table public.gemini_global_usage enable row level security;

-- Atomic endpoint-specific quota consumption
create or replace function public.consume_endpoint_quota(
  p_endpoint text,
  p_max_10m int default 20,
  p_max_daily int default 150
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_window_10m timestamptz;
  v_window_daily timestamptz;
  v_count_10m int;
  v_count_daily int;
  v_limit_10m int := coalesce(p_max_10m, 20);
  v_limit_daily int := coalesce(p_max_daily, 150);
  v_retry_after int;
begin
  if v_uid is null then
    return json_build_object('allowed', false, 'retry_after_seconds', 60);
  end if;

  v_window_10m := to_timestamp(floor(extract(epoch from v_now) / 600) * 600);
  v_window_daily := (timezone('Asia/Seoul', v_now))::date::timestamp at time zone 'Asia/Seoul';

  insert into public.api_endpoint_usage (user_id, endpoint, kind, window_start, count)
  values (v_uid, p_endpoint, '10m', v_window_10m, 1)
  on conflict (user_id, endpoint, kind, window_start)
  do update set count = public.api_endpoint_usage.count + 1
  returning count into v_count_10m;

  insert into public.api_endpoint_usage (user_id, endpoint, kind, window_start, count)
  values (v_uid, p_endpoint, 'daily', v_window_daily, 1)
  on conflict (user_id, endpoint, kind, window_start)
  do update set count = public.api_endpoint_usage.count + 1
  returning count into v_count_daily;

  if v_count_10m > v_limit_10m then
    v_retry_after := greatest(1, ceil(extract(epoch from (v_window_10m + interval '10 minutes' - v_now))));
    return json_build_object('allowed', false, 'retry_after_seconds', v_retry_after);
  end if;

  if v_count_daily > v_limit_daily then
    v_retry_after := greatest(1, ceil(extract(epoch from (v_window_daily + interval '1 day' - v_now))));
    return json_build_object('allowed', false, 'retry_after_seconds', v_retry_after);
  end if;

  return json_build_object('allowed', true, 'retry_after_seconds', 0);
end;
$$;

revoke execute on function public.consume_endpoint_quota(text, int, int) from public, anon;
grant execute on function public.consume_endpoint_quota(text, int, int) to authenticated;

-- Project-wide global daily Gemini quota check & increment
create or replace function public.consume_global_gemini_quota(
  p_max_daily int default 10000
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_day date;
  v_count int;
  v_limit int := coalesce(p_max_daily, 10000);
  v_next_midnight timestamptz;
  v_retry_after int;
begin
  if v_uid is null then
    return json_build_object('allowed', false, 'retry_after_seconds', 60);
  end if;

  v_day := (timezone('Asia/Seoul', v_now))::date;

  insert into public.gemini_global_usage (day, count)
  values (v_day, 1)
  on conflict (day)
  do update set count = public.gemini_global_usage.count + 1
  returning count into v_count;

  if v_count > v_limit then
    v_next_midnight := (v_day + 1)::timestamp at time zone 'Asia/Seoul';
    v_retry_after := greatest(1, ceil(extract(epoch from (v_next_midnight - v_now))));
    return json_build_object('allowed', false, 'retry_after_seconds', v_retry_after);
  end if;

  return json_build_object('allowed', true, 'retry_after_seconds', 0);
end;
$$;

revoke execute on function public.consume_global_gemini_quota(int) from public, anon;
grant execute on function public.consume_global_gemini_quota(int) to authenticated;

-- Scheduled 90-day retention purge for usage tables
create extension if not exists pg_cron;

create or replace function public.purge_expired_agent_usage()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count_chat integer;
  v_count_ep integer;
begin
  delete from public.agent_chat_usage where window_start < (clock_timestamp() - interval '90 days');
  get diagnostics v_count_chat = row_count;

  delete from public.api_endpoint_usage where window_start < (clock_timestamp() - interval '90 days');
  get diagnostics v_count_ep = row_count;

  delete from public.gemini_global_usage where day < (timezone('Asia/Seoul', clock_timestamp()))::date - 90;

  return coalesce(v_count_chat, 0) + coalesce(v_count_ep, 0);
end;
$$;

revoke all on function public.purge_expired_agent_usage() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'purge-expired-agent-usage';
select cron.schedule('purge-expired-agent-usage', '23 3 * * *', 'select public.purge_expired_agent_usage()');
