-- 꾸독 증빙 사건 서버 보관(선택 동의)
-- - 사용자가 "증빙을 계정에 보관"에 동의한 경우에만 앱이 기록한다. 동의하지 않으면 기기에만 남는다.
-- - 보관 항목: 서비스명, 결제 금액, 결제 일시, 결제수단 이름과 카드 끝 4자리, 해지 처리 일시, 꾸독 승인 결정.
-- - 보관 기간: 사건을 만든 날부터 1년. 지난 사건은 읽을 수 없고, 매일 자동 삭제한다. 사용자는 언제든 직접 삭제할 수 있다.
-- - 기록은 수정하지 않는다(증빙 무결성). 같은 항목은 item_key로 한 번만 쌓인다.
begin;

create table if not exists public.evidence_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  case_key text not null,
  kind text not null,
  subscription_id text,
  service_name text not null default '',
  amount_krw integer not null default 0,
  previous_amount_krw integer,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '1 year'),
  constraint evidence_cases_user_key unique (user_id, case_key),
  constraint evidence_cases_key_length check (char_length(case_key) between 1 and 200),
  constraint evidence_cases_kind check (kind in ('price_increase', 'trial_conversion', 'charged_after_cancel')),
  constraint evidence_cases_amount check (amount_krw >= 0 and (previous_amount_krw is null or previous_amount_krw >= 0)),
  constraint evidence_cases_expiry check (expires_at > created_at and expires_at <= created_at + interval '1 year')
);

create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.evidence_cases(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_key text not null,
  type text not null,
  captured_at timestamptz not null,
  detail text not null default '',
  approval_key text,
  created_at timestamptz not null default now(),
  constraint evidence_items_case_key unique (case_id, item_key),
  constraint evidence_items_key_length check (char_length(item_key) between 1 and 300),
  constraint evidence_items_type check (type in ('payment_message', 'cancel_record', 'decision_log')),
  constraint evidence_items_detail_length check (char_length(detail) <= 500)
);

comment on table public.evidence_cases is
  '요금 인상·유료 전환·해지 후 결제 증빙 사건. 사용자가 동의한 경우에만 저장하며 1년 뒤 자동 삭제한다.';
comment on table public.evidence_items is
  '증빙 사건의 항목(결제 알림 요약, 해지 기록, 승인 결정). 카드번호는 끝 4자리만 담는다.';

create index if not exists evidence_cases_user_created_idx on public.evidence_cases (user_id, created_at desc);
create index if not exists evidence_cases_expires_idx on public.evidence_cases (expires_at);
create index if not exists evidence_items_case_idx on public.evidence_items (case_id);
create index if not exists evidence_items_user_idx on public.evidence_items (user_id);

alter table public.evidence_cases enable row level security;
alter table public.evidence_items enable row level security;

drop policy if exists evidence_cases_select_own on public.evidence_cases;
create policy evidence_cases_select_own on public.evidence_cases
  for select to authenticated
  using (user_id = (select auth.uid()) and expires_at > now());

drop policy if exists evidence_cases_insert_own on public.evidence_cases;
create policy evidence_cases_insert_own on public.evidence_cases
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists evidence_cases_delete_own on public.evidence_cases;
create policy evidence_cases_delete_own on public.evidence_cases
  for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists evidence_items_select_own on public.evidence_items;
create policy evidence_items_select_own on public.evidence_items
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.evidence_cases c
       where c.id = case_id and c.user_id = (select auth.uid()) and c.expires_at > now()
    )
  );

drop policy if exists evidence_items_insert_own on public.evidence_items;
create policy evidence_items_insert_own on public.evidence_items
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.evidence_cases c
       where c.id = case_id and c.user_id = (select auth.uid()) and c.expires_at > now()
    )
  );

drop policy if exists evidence_items_delete_own on public.evidence_items;
create policy evidence_items_delete_own on public.evidence_items
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.evidence_cases from anon, authenticated;
revoke all on table public.evidence_items from anon, authenticated;
grant select, insert, delete on table public.evidence_cases to authenticated;
grant select, insert, delete on table public.evidence_items to authenticated;

-- 보관 기간이 지난 사건은 매일 지운다. 항목은 사건과 함께 지워진다.
create extension if not exists pg_cron;

create or replace function public.purge_expired_evidence()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.evidence_cases where expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.purge_expired_evidence() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'purge-expired-evidence';
select cron.schedule('purge-expired-evidence', '17 3 * * *', 'select public.purge_expired_evidence()');

commit;
