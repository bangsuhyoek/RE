-- 꾸독 에이전트 "항상 허용" 권한 범위
-- - 사용자가 생체인증(또는 기기 잠금)을 통과한 뒤 구독 하나에 대해 "이 금액 이하면 항상 허용" 범위를 만든다.
-- - 범위는 구독마다 하나만 살아 있고, 만들기·해제는 함수로만 한다. 직접 insert/update/delete 권한은 주지 않는다.
-- - 자동 허용은 갱신(renewal) 결제이고 금액이 한도 이하일 때만 된다. 요금 인상·유료 전환은 범위가 있어도 자동 허용하지 않는다.
-- - 꾸독은 결제를 막거나 실행하지 않는다. 이 범위는 승인 카드에 대한 사용자의 결정 기록이다.
begin;

create table if not exists public.agent_mandates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subscription_id text not null,
  service_name text not null default '',
  max_amount_krw integer not null,
  verified_with text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '1 year'),
  revoked_at timestamptz,
  constraint agent_mandates_subscription_length check (char_length(subscription_id) between 1 and 200),
  constraint agent_mandates_amount check (max_amount_krw > 0 and max_amount_krw <= 10000000),
  constraint agent_mandates_verified_with check (verified_with in ('biometric', 'device_credential', 'web_confirm')),
  constraint agent_mandates_expiry check (expires_at > created_at)
);

comment on table public.agent_mandates is
  '꾸독 에이전트 "항상 허용" 범위. 구독마다 하나만 유효하며 갱신 결제가 한도 이하일 때만 승인 카드를 자동 허용한다.';

create unique index if not exists agent_mandates_one_active_idx
  on public.agent_mandates (user_id, subscription_id)
  where revoked_at is null;

alter table public.agent_mandates enable row level security;

drop policy if exists agent_mandates_select_own on public.agent_mandates;
create policy agent_mandates_select_own on public.agent_mandates
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.agent_mandates from anon, authenticated;
grant select on table public.agent_mandates to authenticated;

alter table public.approval_requests
  add column if not exists mandate_id uuid references public.agent_mandates(id) on delete set null;

create or replace function public.create_agent_mandate(
  p_subscription_id text,
  p_service_name text,
  p_max_amount_krw integer,
  p_verified_with text
)
returns public.agent_mandates
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.agent_mandates;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  -- 같은 구독의 기존 범위는 해제하고 새 범위 하나만 남긴다.
  update public.agent_mandates
     set revoked_at = now()
   where user_id = v_uid
     and subscription_id = p_subscription_id
     and revoked_at is null;

  insert into public.agent_mandates (user_id, subscription_id, service_name, max_amount_krw, verified_with)
  values (v_uid, p_subscription_id, coalesce(p_service_name, ''), p_max_amount_krw, p_verified_with)
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.revoke_agent_mandate(p_subscription_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  update public.agent_mandates
     set revoked_at = now()
   where user_id = v_uid
     and subscription_id = p_subscription_id
     and revoked_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

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
    when 'allow_mandate' then 'approved_mandate'
    when 'deny' then 'declined'
    else null
  end;
  if v_status is null then
    raise exception 'invalid decision' using errcode = '22023';
  end if;

  if p_decision = 'allow_mandate' then
    -- 갱신 결제이고, 살아 있는 범위가 있고, 금액이 한도 이하일 때만 자동 허용한다.
    update public.approval_requests r
       set status = v_status,
           decided_at = now(),
           mandate_id = m.id
      from public.agent_mandates m
     where r.user_id = v_uid
       and r.idempotency_key = p_idempotency_key
       and r.status = 'pending'
       and r.due_at >= now()
       and r.kind = 'renewal'
       and m.user_id = v_uid
       and m.subscription_id = r.subscription_id
       and m.revoked_at is null
       and m.expires_at > now()
       and m.max_amount_krw >= r.amount_krw
    returning r.* into v_row;
  else
    -- 대기 중이고 기한이 남은 요청만 바꾼다. 동시에 두 번 눌러도 한 번만 반영된다.
    update public.approval_requests
       set status = v_status,
           decided_at = now()
     where user_id = v_uid
       and idempotency_key = p_idempotency_key
       and status = 'pending'
       and due_at >= now()
    returning * into v_row;
  end if;

  if found then
    return v_row;
  end if;

  -- 이미 결정됐거나, 만료됐거나, 범위 조건이 맞지 않은 요청은 현재 상태를 그대로 돌려준다.
  select * into v_row
    from public.approval_requests
   where user_id = v_uid
     and idempotency_key = p_idempotency_key;
  return v_row;
end;
$$;

revoke all on function public.create_agent_mandate(text, text, integer, text) from public, anon;
revoke all on function public.revoke_agent_mandate(text) from public, anon;
revoke all on function public.decide_approval_request(text, text) from public, anon;
grant execute on function public.create_agent_mandate(text, text, integer, text) to authenticated;
grant execute on function public.revoke_agent_mandate(text) to authenticated;
grant execute on function public.decide_approval_request(text, text) to authenticated;

commit;
