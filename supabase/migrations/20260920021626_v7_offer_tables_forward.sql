begin;

create table if not exists public.v7_published_offers (
  service_offer_id text primary key,
  source_candidate_id text not null,
  approval_id text not null,
  candidate_payload_sha256 text not null check (candidate_payload_sha256 ~ '^[0-9A-F]{64}$'),
  publication_payload_sha256 text not null check (publication_payload_sha256 ~ '^[0-9A-F]{64}$'),
  rc3_release_id text not null,
  service_name text not null,
  partner text,
  benefit_name text not null,
  benefit_type text not null,
  benefit_value text,
  benefit_unit text,
  benefit_base text,
  minimum_purchase_value numeric,
  minimum_purchase_unit text,
  minimum_purchase_source_expression text,
  maximum_benefit jsonb,
  frequency_family text,
  frequency_count integer,
  frequency_source_expression text,
  audience_condition jsonb,
  payment_condition jsonb,
  channel_condition text,
  exclusions jsonb not null default '[]'::jsonb,
  selection_relation jsonb,
  lottery_award_mechanism text,
  lottery_certainty text,
  allocation_method text,
  certainty text,
  temporal_start date,
  temporal_end date,
  source_url text not null,
  evidence_refs text[] not null,
  resolved_fact_refs text[] not null,
  constraint_graph_ref text not null,
  verification_state text not null,
  approved_at timestamptz not null,
  publication_state text not null check (publication_state in ('PUBLISHED','WITHDRAWN','STALE_BLOCKED','EXPIRED_BLOCKED')),
  display_contract jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(evidence_refs) > 0),
  check (cardinality(resolved_fact_refs) > 0),
  check (temporal_end is null or temporal_start is null or temporal_start <= temporal_end),
  unique (service_offer_id, publication_payload_sha256)
);

create index if not exists idx_v7_published_offers_state_end
  on public.v7_published_offers(publication_state, temporal_end);
create index if not exists idx_v7_published_offers_candidate
  on public.v7_published_offers(source_candidate_id);
create index if not exists idx_v7_published_offers_approval
  on public.v7_published_offers(approval_id);

create table if not exists public.v7_offer_service_links (
  service_offer_id text not null references public.v7_published_offers(service_offer_id) on delete cascade,
  service_id text not null references public.subscription_services(id) on delete restrict,
  role text not null default 'provider' check (role in ('provider','target','bundle_member')),
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (service_offer_id, service_id, role)
);

create index if not exists idx_v7_offer_service_links_service_id
  on public.v7_offer_service_links(service_id);

create table if not exists public.v7_offer_publication_events (
  event_id text primary key,
  service_offer_id text not null,
  source_candidate_id text not null,
  approval_id text not null,
  candidate_payload_sha256 text not null,
  publication_payload_sha256 text not null,
  rc3_release_id text not null,
  action text not null check (action in ('PUBLISH','WITHDRAW','STALE_BLOCK','EXPIRE_BLOCK')),
  previous_publication_state text,
  new_publication_state text not null,
  operator_reference text not null,
  idempotency_key text not null unique,
  reason text,
  event_payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_v7_offer_events_offer_created
  on public.v7_offer_publication_events(service_offer_id, created_at desc);

create or replace function public.v7_upsert_published_offer(
  p_offer jsonb,
  p_idempotency_key text,
  p_operator_reference text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.v7_published_offers%rowtype;
  v_event public.v7_offer_publication_events%rowtype;
  v_event_id text;
begin
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED';
  end if;
  if coalesce(p_offer->>'publication_state','') <> 'PUBLISHED' then
    raise exception 'PUBLISHED_STATE_REQUIRED';
  end if;

  select * into v_event
  from public.v7_offer_publication_events
  where idempotency_key = p_idempotency_key;
  if found then
    if v_event.service_offer_id <> p_offer->>'service_offer_id'
       or v_event.publication_payload_sha256 <> p_offer->>'publication_payload_sha256' then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT';
    end if;
    return jsonb_build_object('status','IDEMPOTENT_REPLAY','event_id',v_event.event_id,'service_offer_id',v_event.service_offer_id);
  end if;

  select * into v_existing
  from public.v7_published_offers
  where service_offer_id = p_offer->>'service_offer_id'
  for update;
  if found and v_existing.publication_payload_sha256 <> p_offer->>'publication_payload_sha256' then
    raise exception 'SERVICE_OFFER_PAYLOAD_CONFLICT';
  end if;

  insert into public.v7_published_offers (
    service_offer_id, source_candidate_id, approval_id, candidate_payload_sha256,
    publication_payload_sha256, rc3_release_id, service_name, partner,
    benefit_name, benefit_type, benefit_value, benefit_unit, benefit_base,
    minimum_purchase_value, minimum_purchase_unit, minimum_purchase_source_expression,
    maximum_benefit, frequency_family, frequency_count, frequency_source_expression,
    audience_condition, payment_condition, channel_condition, exclusions,
    selection_relation, lottery_award_mechanism, lottery_certainty, allocation_method,
    certainty, temporal_start, temporal_end, source_url, evidence_refs,
    resolved_fact_refs, constraint_graph_ref, verification_state, approved_at,
    publication_state, display_contract, updated_at
  ) values (
    p_offer->>'service_offer_id', p_offer->>'source_candidate_id', p_offer->>'approval_id', p_offer->>'candidate_payload_sha256',
    p_offer->>'publication_payload_sha256', p_offer->>'rc3_release_id', p_offer->>'service_name', p_offer->>'partner',
    p_offer->>'benefit_name', p_offer->>'benefit_type', p_offer->>'benefit_value', p_offer->>'benefit_unit', p_offer->>'benefit_base',
    nullif(p_offer->>'minimum_purchase_value','')::numeric, p_offer->>'minimum_purchase_unit', p_offer->>'minimum_purchase_source_expression',
    nullif(p_offer->'maximum_benefit','null'::jsonb), p_offer->>'frequency_family', nullif(p_offer->>'frequency_count','')::integer, p_offer->>'frequency_source_expression',
    nullif(p_offer->'audience_condition','null'::jsonb), nullif(p_offer->'payment_condition','null'::jsonb), p_offer->>'channel_condition', coalesce(p_offer->'exclusions','[]'::jsonb),
    nullif(p_offer->'selection_relation','null'::jsonb), p_offer->>'lottery_award_mechanism', p_offer->>'lottery_certainty', p_offer->>'allocation_method',
    p_offer->>'certainty', nullif(p_offer->>'temporal_start','')::date, nullif(p_offer->>'temporal_end','')::date, p_offer->>'source_url',
    array(select jsonb_array_elements_text(p_offer->'evidence_refs')),
    array(select jsonb_array_elements_text(p_offer->'resolved_fact_refs')),
    p_offer->>'constraint_graph_ref', p_offer->>'verification_state', (p_offer->>'approved_at')::timestamptz,
    'PUBLISHED', coalesce(p_offer->'display_contract','{}'::jsonb), now()
  )
  on conflict (service_offer_id) do update set
    publication_state = excluded.publication_state,
    updated_at = now()
  where public.v7_published_offers.publication_payload_sha256 = excluded.publication_payload_sha256;

  insert into public.v7_offer_service_links(service_offer_id, service_id, role, is_primary)
  values (p_offer->>'service_offer_id', p_offer->>'service_id', 'provider', true)
  on conflict do nothing;

  v_event_id := 'v7evt_' || md5(p_idempotency_key);
  insert into public.v7_offer_publication_events(
    event_id, service_offer_id, source_candidate_id, approval_id,
    candidate_payload_sha256, publication_payload_sha256, rc3_release_id,
    action, previous_publication_state, new_publication_state,
    operator_reference, idempotency_key, reason, event_payload
  ) values (
    v_event_id, p_offer->>'service_offer_id', p_offer->>'source_candidate_id', p_offer->>'approval_id',
    p_offer->>'candidate_payload_sha256', p_offer->>'publication_payload_sha256', p_offer->>'rc3_release_id',
    'PUBLISH', case when found then v_existing.publication_state else null end, 'PUBLISHED',
    p_operator_reference, p_idempotency_key, null, p_offer
  );

  return jsonb_build_object('status','PUBLISHED','event_id',v_event_id,'service_offer_id',p_offer->>'service_offer_id');
end;
$$;

create or replace function public.v7_withdraw_published_offer(
  p_service_offer_id text,
  p_idempotency_key text,
  p_reason text,
  p_operator_reference text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.v7_published_offers%rowtype;
  v_event public.v7_offer_publication_events%rowtype;
  v_event_id text;
begin
  select * into v_event from public.v7_offer_publication_events where idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('status','IDEMPOTENT_REPLAY','event_id',v_event.event_id,'service_offer_id',v_event.service_offer_id); end if;

  select * into v_offer from public.v7_published_offers where service_offer_id = p_service_offer_id for update;
  if not found then raise exception 'SERVICE_OFFER_NOT_FOUND'; end if;

  update public.v7_published_offers set publication_state='WITHDRAWN', updated_at=now() where service_offer_id=p_service_offer_id;
  v_event_id := 'v7evt_' || md5(p_idempotency_key);
  insert into public.v7_offer_publication_events(
    event_id, service_offer_id, source_candidate_id, approval_id, candidate_payload_sha256,
    publication_payload_sha256, rc3_release_id, action, previous_publication_state,
    new_publication_state, operator_reference, idempotency_key, reason, event_payload
  ) values (
    v_event_id, v_offer.service_offer_id, v_offer.source_candidate_id, v_offer.approval_id,
    v_offer.candidate_payload_sha256, v_offer.publication_payload_sha256, v_offer.rc3_release_id,
    'WITHDRAW', v_offer.publication_state, 'WITHDRAWN', p_operator_reference,
    p_idempotency_key, p_reason, jsonb_build_object('service_offer_id',p_service_offer_id,'reason',p_reason)
  );
  return jsonb_build_object('status','WITHDRAWN','event_id',v_event_id,'service_offer_id',p_service_offer_id);
end;
$$;

revoke all on function public.v7_upsert_published_offer(jsonb,text,text) from public, anon, authenticated;
revoke all on function public.v7_withdraw_published_offer(text,text,text,text) from public, anon, authenticated;
grant execute on function public.v7_upsert_published_offer(jsonb,text,text) to service_role;
grant execute on function public.v7_withdraw_published_offer(text,text,text,text) to service_role;
grant all on table public.v7_published_offers, public.v7_offer_service_links, public.v7_offer_publication_events to service_role;

commit;