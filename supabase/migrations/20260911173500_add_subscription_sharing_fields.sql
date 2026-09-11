begin;

alter table public.subscriptions
  add column if not exists gross_amount_krw integer,
  add column if not exists sharing_enabled boolean not null default false,
  add column if not exists share_count smallint;

-- 기존 구독은 현재 amount_krw를 전체 구독료로 간주한다.
update public.subscriptions
set gross_amount_krw = amount_krw
where gross_amount_krw is null;

alter table public.subscriptions
  drop constraint if exists subscriptions_gross_amount_nonnegative;

alter table public.subscriptions
  add constraint subscriptions_gross_amount_nonnegative
  check (gross_amount_krw is null or gross_amount_krw >= 0);

alter table public.subscriptions
  drop constraint if exists subscriptions_sharing_state_valid;

alter table public.subscriptions
  add constraint subscriptions_sharing_state_valid
  check (
    (sharing_enabled = false and share_count is null)
    or
    (sharing_enabled = true and share_count is not null and share_count >= 2)
  );

comment on column public.subscriptions.gross_amount_krw is
  '서비스 전체 구독료. 공동 이용 시 amount_krw와 분리하여 원래 가격을 보존한다.';

comment on column public.subscriptions.amount_krw is
  '사용자가 실제로 부담하는 금액. 공동 이용이 아니면 gross_amount_krw와 동일하다.';

comment on column public.subscriptions.sharing_enabled is
  '다른 사람과 함께 이용하는 구독인지 여부.';

comment on column public.subscriptions.share_count is
  '공동 이용 총 인원. sharing_enabled=true일 때 2 이상.';

commit;
