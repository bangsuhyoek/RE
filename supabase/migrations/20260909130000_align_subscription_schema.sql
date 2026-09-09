begin;

-- subscriptions 테이블에 클라이언트 필요 컬럼 추가
alter table public.subscriptions
  add column if not exists subscription_id text,
  add column if not exists monogram text not null default '',
  add column if not exists mark_tone text,
  add column if not exists next_billing_date date,
  add column if not exists renewal_reviewed_for text;

-- 기존 데이터가 있다면 id(uuid)를 subscription_id로 초기화
update public.subscriptions
set subscription_id = id::text
where subscription_id is null;

-- user_id와 subscription_id 복합 유니크 인덱스 생성 (upsert onConflict 지원)
create unique index if not exists subscriptions_user_subscription_id_uidx
  on public.subscriptions (user_id, subscription_id);

commit;
