-- ==========================================================
-- Security Hardening: Restrict Quota RPC Execution to service_role
-- File: supabase/migrations/20261021090000_quota_rpc_service_role_only.sql
--
-- Why execution is service_role only:
-- Any logged-in user could previously call consume_global_gemini_quota or
-- consume_endpoint_quota directly from the browser in a loop, artificially
-- exhausting project-wide daily limits or polluting endpoint usage metrics.
-- Restricting execution to service_role ensures quota consumption is only
-- performed by trusted backend serverless functions after server-side verification.
-- ==========================================================

-- 1. Drop old function signatures
drop function if exists public.consume_endpoint_quota(text, int, int);
drop function if exists public.consume_global_gemini_quota(int);

-- 2. Recreate consume_endpoint_quota with verified p_user_id and endpoint allowlist
create or replace function public.consume_endpoint_quota(
  p_user_id uuid,
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
  v_now timestamptz := clock_timestamp();
  v_window_10m timestamptz;
  v_window_daily timestamptz;
  v_count_10m int;
  v_count_daily int;
  v_limit_10m int := coalesce(p_max_10m, 20);
  v_limit_daily int := coalesce(p_max_daily, 150);
  v_retry_after int;
begin
  if p_user_id is null then
    return json_build_object('allowed', false, 'retry_after_seconds', 60);
  end if;

  if p_endpoint is null or p_endpoint not in ('chat', 'agent', 'ocr', 'cancel_next_step', 'cancel', 'account_delete') then
    return json_build_object('allowed', false, 'retry_after_seconds', 60);
  end if;

  v_window_10m := to_timestamp(floor(extract(epoch from v_now) / 600) * 600);
  v_window_daily := (timezone('Asia/Seoul', v_now))::date::timestamp at time zone 'Asia/Seoul';

  insert into public.api_endpoint_usage (user_id, endpoint, kind, window_start, count)
  values (p_user_id, p_endpoint, '10m', v_window_10m, 1)
  on conflict (user_id, endpoint, kind, window_start)
  do update set count = public.api_endpoint_usage.count + 1
  returning count into v_count_10m;

  insert into public.api_endpoint_usage (user_id, endpoint, kind, window_start, count)
  values (p_user_id, p_endpoint, 'daily', v_window_daily, 1)
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

-- 3. Recreate consume_global_gemini_quota (server-invoked only via service_role)
create or replace function public.consume_global_gemini_quota(
  p_max_daily int default 10000
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_day date;
  v_count int;
  v_limit int := coalesce(p_max_daily, 10000);
  v_next_midnight timestamptz;
  v_retry_after int;
begin
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

-- 4. Restrict execution permissions strictly to service_role
revoke all on function public.consume_endpoint_quota(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.consume_endpoint_quota(uuid, text, int, int) to service_role;

revoke all on function public.consume_global_gemini_quota(int) from public, anon, authenticated;
grant execute on function public.consume_global_gemini_quota(int) to service_role;

-- 5. Tighten usage tables against direct write / tampering from anon or authenticated
alter table public.api_endpoint_usage enable row level security;
alter table public.gemini_global_usage enable row level security;

revoke all on table public.api_endpoint_usage from anon, authenticated;
revoke all on table public.gemini_global_usage from anon, authenticated;

grant all on table public.api_endpoint_usage to service_role;
grant all on table public.gemini_global_usage to service_role;

