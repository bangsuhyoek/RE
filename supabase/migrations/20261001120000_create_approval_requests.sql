-- 꾸독 에이전트 승인 요청 기록
-- - 사용자는 자기 승인 요청만 읽고, 대기(pending) 상태로만 만들 수 있다.
-- - 결정은 decide_approval_request 함수로만 한 번 바꿀 수 있다. 직접 update/delete 권한은 주지 않는다.
-- - 꾸독은 결제를 막거나 실행하지 않는다. 이 표는 사용자의 결정 기록(증빙)이다.
begin;

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  idempotency_key text not null,
  subscription_id text not null,
  service_name text not null default '',
  kind text not null,
  amount_krw integer not null default 0,
  previous_amount_krw integer,
  due_at timestamptz not null,
  status text not null default 'pending',
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint approval_requests_user_key unique (user_id, idempotency_key),
  constraint approval_requests_key_length check (char_length(idempotency_key) between 1 and 200),
  constraint approval_requests_kind check (kind in ('renewal', 'trial_conversion', 'price_increase', 'cancel', 'refund', 'cancel_refund')),
  constraint approval_requests_status check (status in ('pending', 'approved', 'approved_once', 'approved_mandate', 'declined', 'expired')),
  constraint approval_requests_amount check (amount_krw >= 0 and (previous_amount_krw is null or previous_amount_krw >= 0)),
  constraint approval_requests_pending_undecided check (status <> 'pending' or decided_at is null)
);

comment on table public.approval_requests is
  '꾸독 에이전트 승인 요청과 사용자 결정 기록. 결정은 한 번만 가능하며 결제를 직접 막지 않는다.';

create index if not exists approval_requests_user_created_idx
  on public.approval_requests (user_id, created_at desc);

alter table public.approval_requests enable row level security;

drop policy if exists approval_requests_select_own on public.approval_requests;
create policy approval_requests_select_own on public.approval_requests
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists approval_requests_insert_pending_own on public.approval_requests;
create policy approval_requests_insert_pending_own on public.approval_requests
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and decided_at is null);

revoke all on table public.approval_requests from anon, authenticated;
grant select, insert on table public.approval_requests to authenticated;

create or replace function public.decide_approval_request(p_idempotency_key text, p_decision text)
returns public.approval_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_row public.approval_requests;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  v_status := case p_decision
    when 'allow' then 'approved'
    when 'allow_once' then 'approved_once'
    when 'deny' then 'declined'
    else null
  end;
  if v_status is null then
    raise exception 'invalid decision' using errcode = '22023';
  end if;

  -- 대기 중이고 기한이 남은 요청만 바꾼다. 동시에 두 번 눌러도 한 번만 반영된다.
  update public.approval_requests
     set status = v_status,
         decided_at = now()
   where user_id = v_uid
     and idempotency_key = p_idempotency_key
     and status = 'pending'
     and due_at >= now()
  returning * into v_row;

  if found then
    return v_row;
  end if;

  -- 이미 결정됐거나 만료된 요청은 현재 상태를 그대로 돌려준다.
  select * into v_row
    from public.approval_requests
   where user_id = v_uid
     and idempotency_key = p_idempotency_key;
  return v_row;
end;
$$;

revoke all on function public.decide_approval_request(text, text) from public, anon;
grant execute on function public.decide_approval_request(text, text) to authenticated;

commit;
