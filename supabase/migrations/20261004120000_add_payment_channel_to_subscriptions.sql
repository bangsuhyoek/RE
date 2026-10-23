-- 구독별 "결제한 곳"(해지 경로) 서버 동기화
-- - 해지 시트에서 사용자가 고른 결제 경로를 저장해 다른 기기에서도 같은 해지 화면을 연다.
-- - 값이 없으면(null) 앱이 결제수단으로 추정한다. 기존 행은 null로 남는다.
-- - 허용 값: web(서비스 웹·앱), google_play, app_store, card_autopay(카드 자동납부·어카운트인포), carrier(휴대폰 요금)
begin;

alter table public.subscriptions
  add column if not exists payment_channel text;

alter table public.subscriptions
  drop constraint if exists subscriptions_payment_channel_check;

alter table public.subscriptions
  add constraint subscriptions_payment_channel_check
  check (payment_channel is null or payment_channel in ('web', 'google_play', 'app_store', 'card_autopay', 'carrier'));

comment on column public.subscriptions.payment_channel is '사용자가 고른 결제 경로(해지 이동 위치). null이면 결제수단으로 추정';

commit;

