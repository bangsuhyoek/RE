-- ==========================================================
-- Agent Chat Usage Rate Limiting
-- File: supabase/migrations/20261018130000_create_agent_usage.sql
-- ==========================================================

create table if not exists public.agent_chat_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  kind text not null,
  count int not null default 0,
  primary key (user_id, kind, window_start)
);

alter table public.agent_chat_usage enable row level security;

-- RLS enabled with no client policies (only accessed via security definer function)

create or replace function public.consume_agent_chat_quota()
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
  v_retry_after int;
begin
  if v_uid is null then
    return json_build_object('allowed', false, 'retry_after_seconds', 60);
  end if;

  -- 개인정보 처리방침 준수: 90일(약 3개월)이 지난 호출 사용자 레코드 정리
  delete from public.agent_chat_usage
  where user_id = v_uid and window_start < (v_now - interval '90 days');

  -- 10-minute window aligned to epoch: floor(epoch / 600) * 600
  v_window_10m := to_timestamp(floor(extract(epoch from v_now) / 600) * 600);
  
  -- Daily window aligned to midnight KST (UTC+9)
  v_window_daily := (timezone('Asia/Seoul', v_now))::date::timestamp at time zone 'Asia/Seoul';

  -- 원자적 10분 창 카운터 upsert & increment (returning count)
  insert into public.agent_chat_usage (user_id, kind, window_start, count)
  values (v_uid, '10m', v_window_10m, 1)
  on conflict (user_id, kind, window_start)
  do update set count = public.agent_chat_usage.count + 1
  returning count into v_count_10m;

  -- 원자적 일일 창 카운터 upsert & increment (returning count)
  insert into public.agent_chat_usage (user_id, kind, window_start, count)
  values (v_uid, 'daily', v_window_daily, 1)
  on conflict (user_id, kind, window_start)
  do update set count = public.agent_chat_usage.count + 1
  returning count into v_count_daily;

  -- 10분 창 제한(20회) 초과 여부 확인
  if v_count_10m > 20 then
    v_retry_after := greatest(1, ceil(extract(epoch from (v_window_10m + interval '10 minutes' - v_now))));
    return json_build_object('allowed', false, 'retry_after_seconds', v_retry_after);
  end if;

  -- 일일 창 제한(150회) 초과 여부 확인
  if v_count_daily > 150 then
    v_retry_after := greatest(1, ceil(extract(epoch from (v_window_daily + interval '1 day' - v_now))));
    return json_build_object('allowed', false, 'retry_after_seconds', v_retry_after);
  end if;

  return json_build_object('allowed', true, 'retry_after_seconds', 0);
end;
$$;

revoke execute on function public.consume_agent_chat_quota() from public, anon;
grant execute on function public.consume_agent_chat_quota() to authenticated;
