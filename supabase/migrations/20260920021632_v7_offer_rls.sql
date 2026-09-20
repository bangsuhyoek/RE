begin;

alter table public.v7_published_offers enable row level security;
alter table public.v7_offer_service_links enable row level security;
alter table public.v7_offer_publication_events enable row level security;

-- Defense in depth: client roles receive no direct table SELECT/WRITE grants.
revoke all on table public.v7_published_offers from anon, authenticated;
revoke all on table public.v7_offer_service_links from anon, authenticated;
revoke all on table public.v7_offer_publication_events from anon, authenticated;

-- Public projection intentionally excludes approval IDs, hashes, evidence refs,
-- resolved-fact refs, constraint graph refs, and internal event/provenance data.
create or replace view public.v7_public_offers
with (security_barrier = true)
as
select
  o.service_offer_id,
  l.service_id,
  o.service_name,
  o.partner,
  o.benefit_name,
  o.benefit_type,
  o.benefit_value,
  o.benefit_unit,
  o.benefit_base,
  o.minimum_purchase_value,
  o.minimum_purchase_unit,
  o.minimum_purchase_source_expression,
  o.maximum_benefit,
  o.frequency_family,
  o.frequency_count,
  o.frequency_source_expression,
  o.audience_condition,
  o.payment_condition,
  o.channel_condition,
  o.exclusions,
  o.selection_relation,
  o.lottery_award_mechanism,
  o.lottery_certainty,
  o.allocation_method,
  o.certainty,
  o.temporal_start,
  o.temporal_end,
  o.source_url,
  o.display_contract
from public.v7_published_offers o
join public.v7_offer_service_links l on l.service_offer_id = o.service_offer_id
where o.publication_state = 'PUBLISHED';

grant select on public.v7_public_offers to anon, authenticated;

commit;