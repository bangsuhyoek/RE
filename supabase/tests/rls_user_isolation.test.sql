-- ==========================================================
-- SubMate RLS Isolation & Schema Security pgTAP Tests
-- File: supabase/tests/rls_user_isolation.test.sql
-- ==========================================================

begin;
select plan(32);

-- ----------------------------------------------------------
-- 1. Setup Mock Auth Users
-- ----------------------------------------------------------
insert into auth.users (id, email)
values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'user_a@submate.test'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'user_b@submate.test')
on conflict (id) do nothing;

-- ----------------------------------------------------------
-- 2. Subscriptions Table RLS & Contract Tests
-- ----------------------------------------------------------

-- User A inserts a subscription (including 0-KRW trial and is_pinned)
set local role authenticated;
set local "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';
set local "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$insert into public.subscriptions (
      id, user_id, subscription_id, service_name, plan_name, amount_krw, due_day, billing_cycle, status, is_pinned
    ) values (
      '00000000-0000-0000-0000-000000000001'::uuid,
      'a0000000-0000-0000-0000-000000000001'::uuid,
      'sub-a-netflix-1',
      'Netflix',
      '프리미엄',
      0,
      15,
      '매월',
      'trial',
      true
    )$$,
  'User A can insert 0-KRW free trial subscription with is_pinned = true'
);

-- Contract: duplicate service_name and plan_name should be allowed (relaxed unique index)
select lives_ok(
  $$insert into public.subscriptions (
      id, user_id, subscription_id, service_name, plan_name, amount_krw, due_day, billing_cycle, status, is_pinned
    ) values (
      '00000000-0000-0000-0000-000000000002'::uuid,
      'a0000000-0000-0000-0000-000000000001'::uuid,
      'sub-a-netflix-2',
      'Netflix',
      '프리미엄',
      17000,
      20,
      '매월',
      'active',
      false
    )$$,
  'User A can add multiple subscriptions for same service and plan (relaxed unique index)'
);

-- Switch context to User B
set local role authenticated;
set local "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000002';
set local "request.jwt.claims" = '{"sub": "b0000000-0000-0000-0000-000000000002", "role": "authenticated"}';

-- User B cannot select User A subscriptions
select is_empty(
  $$select * from public.subscriptions where user_id = 'a0000000-0000-0000-0000-000000000001'::uuid$$,
  'User B cannot SELECT User A subscriptions'
);

-- User B cannot insert a subscription under User A user_id
select throws_ok(
  $$insert into public.subscriptions (
      user_id, subscription_id, service_name, plan_name, amount_krw, due_day, billing_cycle
    ) values (
      'a0000000-0000-0000-0000-000000000001'::uuid,
      'sub-b-attack',
      'HackedService',
      'Default',
      1000,
      1,
      '매월'
    )$$,
  '42501',
  null,
  'User B cannot INSERT subscriptions for User A'
);

-- User B cannot update User A subscriptions (updates 0 rows)
update public.subscriptions
   set amount_krw = 99999
 where user_id = 'a0000000-0000-0000-0000-000000000001'::uuid;

select results_eq(
  $$select count(*)::integer from public.subscriptions where amount_krw = 99999$$,
  $$values(0)$$,
  'User B cannot UPDATE User A subscriptions'
);

-- User B cannot delete User A subscriptions (deletes 0 rows)
delete from public.subscriptions
 where user_id = 'a0000000-0000-0000-0000-000000000001'::uuid;

set local role postgres;
select results_eq(
  $$select count(*)::integer from public.subscriptions where user_id = 'a0000000-0000-0000-0000-000000000001'::uuid$$,
  $$values(2)$$,
  'User B cannot DELETE User A subscriptions'
);

-- ----------------------------------------------------------
-- 3. Receipt Recognitions Table RLS Tests
-- ----------------------------------------------------------

-- User A inserts receipt recognition
set local role authenticated;
set local "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';
set local "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$insert into public.receipt_recognitions (
      id, user_id, raw_vendor, parsed_service_name, amount_krw, status
    ) values (
      '10000000-0000-0000-0000-000000000001'::uuid,
      'a0000000-0000-0000-0000-000000000001'::uuid,
      'Netflix Inc',
      'Netflix',
      17000,
      'success'
    )$$,
  'User A can insert own receipt recognition'
);

-- Switch to User B
set local role authenticated;
set local "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000002';
set local "request.jwt.claims" = '{"sub": "b0000000-0000-0000-0000-000000000002", "role": "authenticated"}';

select is_empty(
  $$select * from public.receipt_recognitions where user_id = 'a0000000-0000-0000-0000-000000000001'::uuid$$,
  'User B cannot SELECT User A receipt recognitions'
);

select throws_ok(
  $$insert into public.receipt_recognitions (
      user_id, raw_vendor, parsed_service_name, amount_krw, status
    ) values (
      'a0000000-0000-0000-0000-000000000001'::uuid,
      'Attack Vendor',
      'Attack',
      5000,
      'success'
    )$$,
  '42501',
  null,
  'User B cannot INSERT receipt recognitions for User A'
);

update public.receipt_recognitions
   set amount_krw = 55555
 where user_id = 'a0000000-0000-0000-0000-000000000001'::uuid;

select results_eq(
  $$select count(*)::integer from public.receipt_recognitions where amount_krw = 55555$$,
  $$values(0)$$,
  'User B cannot UPDATE User A receipt recognitions'
);

delete from public.receipt_recognitions
 where user_id = 'a0000000-0000-0000-0000-000000000001'::uuid;

set local role postgres;
select results_eq(
  $$select count(*)::integer from public.receipt_recognitions where user_id = 'a0000000-0000-0000-0000-000000000001'::uuid$$,
  $$values(1)$$,
  'User B cannot DELETE User A receipt recognitions'
);

-- ----------------------------------------------------------
-- 4. Evidence Cases & Items RLS & Trigger Tests
-- ----------------------------------------------------------

-- User A inserts an evidence case with spoofed future dates
set local role authenticated;
set local "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';
set local "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$insert into public.evidence_cases (
      id, user_id, case_key, kind, service_name, created_at, expires_at
    ) values (
      '20000000-0000-0000-0000-000000000001'::uuid,
      'a0000000-0000-0000-0000-000000000001'::uuid,
      'case-spoofed-a',
      'price_increase',
      'Spotify',
      '2030-01-01 00:00:00+00'::timestamptz,
      '2031-01-01 00:00:00+00'::timestamptz
    )$$,
  'User A can insert evidence case'
);

-- Server-enforced timestamp verification: trigger must override spoofed future dates to now()
set local role postgres;
select results_eq(
  $$select (created_at < now() + interval '1 minute' and expires_at <= created_at + interval '1 year' and expires_at >= created_at + interval '364 days')
      from public.evidence_cases
     where id = '20000000-0000-0000-0000-000000000001'::uuid$$,
  $$values(true)$$,
  'Evidence case INSERT trigger server-forces created_at and expires_at (preventing spoofing)'
);

-- User A inserts evidence item
set local role authenticated;
set local "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';
set local "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$insert into public.evidence_items (
      id, case_id, user_id, item_key, type, captured_at, detail
    ) values (
      '20000000-0000-0000-0000-000000000002'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      'a0000000-0000-0000-0000-000000000001'::uuid,
      'item-1',
      'payment_message',
      now(),
      'Spotify 10900 KRW charge'
    )$$,
  'User A can insert evidence item under own case'
);

-- Switch to User B
set local role authenticated;
set local "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000002';
set local "request.jwt.claims" = '{"sub": "b0000000-0000-0000-0000-000000000002", "role": "authenticated"}';

select is_empty(
  $$select * from public.evidence_cases where user_id = 'a0000000-0000-0000-0000-000000000001'::uuid$$,
  'User B cannot SELECT User A evidence cases'
);

select throws_ok(
  $$insert into public.evidence_cases (
      user_id, case_key, kind, service_name
    ) values (
      'a0000000-0000-0000-0000-000000000001'::uuid,
      'case-b-attack',
      'price_increase',
      'Spotify'
    )$$,
  '42501',
  null,
  'User B cannot INSERT evidence cases for User A'
);

select is_empty(
  $$select * from public.evidence_items where user_id = 'a0000000-0000-0000-0000-000000000001'::uuid$$,
  'User B cannot SELECT User A evidence items'
);

select throws_ok(
  $$insert into public.evidence_items (
      case_id, user_id, item_key, type, captured_at, detail
    ) values (
      '20000000-0000-0000-0000-000000000001'::uuid,
      'b0000000-0000-0000-0000-000000000002'::uuid,
      'item-b-attack',
      'payment_message',
      now(),
      'Tampered item'
    )$$,
  '42501',
  null,
  'User B cannot INSERT evidence items into User A case'
);

delete from public.evidence_cases
 where user_id = 'a0000000-0000-0000-0000-000000000001'::uuid;

delete from public.evidence_items
 where user_id = 'a0000000-0000-0000-0000-000000000001'::uuid;

set local role postgres;
select results_eq(
  $$select count(*)::integer from public.evidence_cases where user_id = 'a0000000-0000-0000-0000-000000000001'::uuid$$,
  $$values(1)$$,
  'User B cannot DELETE User A evidence cases'
);

select results_eq(
  $$select count(*)::integer from public.evidence_items where user_id = 'a0000000-0000-0000-0000-000000000001'::uuid$$,
  $$values(1)$$,
  'User B cannot DELETE User A evidence items'
);

-- ----------------------------------------------------------
-- 5. Approval Requests & Agent Mandates RLS Tests
-- ----------------------------------------------------------

-- User A creates approval request and mandate
set local role authenticated;
set local "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';
set local "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$insert into public.approval_requests (
      id, user_id, idempotency_key, subscription_id, service_name, kind, amount_krw, due_at, status
    ) values (
      '30000000-0000-0000-0000-000000000001'::uuid,
      'a0000000-0000-0000-0000-000000000001'::uuid,
      'req-a-netflix-1',
      'sub-a-netflix-1',
      'Netflix',
      'renewal',
      17000,
      now() + interval '1 day',
      'pending'
    )$$,
  'User A can insert pending approval request'
);

select lives_ok(
  $$select public.create_agent_mandate('sub-a-netflix-1', 'Netflix', 20000, 'biometric')$$,
  'User A can create agent mandate via security definer function'
);

-- Switch to User B
set local role authenticated;
set local "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000002';
set local "request.jwt.claims" = '{"sub": "b0000000-0000-0000-0000-000000000002", "role": "authenticated"}';

select is_empty(
  $$select * from public.approval_requests where user_id = 'a0000000-0000-0000-0000-000000000001'::uuid$$,
  'User B cannot SELECT User A approval requests'
);

select throws_ok(
  $$insert into public.approval_requests (
      user_id, idempotency_key, subscription_id, service_name, kind, amount_krw, due_at, status
    ) values (
      'a0000000-0000-0000-0000-000000000001'::uuid,
      'req-b-attack',
      'sub-a-netflix-1',
      'Netflix',
      'renewal',
      17000,
      now() + interval '1 day',
      'pending'
    )$$,
  '42501',
  null,
  'User B cannot INSERT approval requests for User A'
);

-- User B cannot decide User A's approval request
select is(
  (select status from public.decide_approval_request('req-a-netflix-1', 'allow')),
  null,
  'User B cannot decide User A approval request'
);

select is_empty(
  $$select * from public.agent_mandates where user_id = 'a0000000-0000-0000-0000-000000000001'::uuid$$,
  'User B cannot SELECT User A agent mandates'
);

-- User B cannot revoke User A's mandate
select results_eq(
  $$select public.revoke_agent_mandate('sub-a-netflix-1')$$,
  $$values(0)$$,
  'User B revoke_agent_mandate returns 0 for User A mandate'
);

-- ----------------------------------------------------------
-- 6. Agent Chat Usage Table Isolation Tests
-- ----------------------------------------------------------

set local role authenticated;
set local "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';
set local "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$select public.consume_agent_chat_quota()$$,
  'User A can consume agent chat quota'
);

set local role authenticated;
set local "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000002';
set local "request.jwt.claims" = '{"sub": "b0000000-0000-0000-0000-000000000002", "role": "authenticated"}';

-- Client cannot directly SELECT or INSERT agent_chat_usage (no client policies)
select is_empty(
  $$select * from public.agent_chat_usage where user_id = 'a0000000-0000-0000-0000-000000000001'::uuid$$,
  'User B cannot SELECT agent_chat_usage rows'
);

-- ----------------------------------------------------------
-- 7. Cancel Difficulty Reports Isolation & K-Anonymity Tests
-- ----------------------------------------------------------

set local role authenticated;
set local "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000002';
set local "request.jwt.claims" = '{"sub": "b0000000-0000-0000-0000-000000000002", "role": "authenticated"}';

-- Raw reports have no SELECT grant to authenticated
select throws_ok(
  $$select * from public.cancel_difficulty_reports$$,
  '42501',
  null,
  'Authenticated users cannot SELECT raw cancel_difficulty_reports (privacy protected)'
);

-- ----------------------------------------------------------
-- 8. Benefits Verified Status CHECK Constraint Tests
-- ----------------------------------------------------------

set local role postgres;

select lives_ok(
  $$insert into public.benefits (id, title, kind, verified_status) values ('b-test-valid-1', 'Valid Confirmed', '할인', 'confirmed')$$,
  'benefits allows confirmed status'
);

select lives_ok(
  $$insert into public.benefits (id, title, kind, verified_status) values ('b-test-valid-2', 'Valid Unverified', '할인', 'unverified')$$,
  'benefits allows unverified status'
);

select lives_ok(
  $$insert into public.benefits (id, title, kind, verified_status) values ('b-test-valid-3', 'Valid Expired', '할인', 'expired')$$,
  'benefits allows expired status'
);

select throws_ok(
  $$insert into public.benefits (id, title, kind, verified_status) values ('b-test-invalid', 'Invalid Active', '할인', 'active')$$,
  '23514',
  null,
  'benefits rejects active status (CHECK constraint enforced)'
);

select * from finish();
rollback;
