alter table public.v7_published_offers enable row level security;
alter table public.v7_offer_service_links enable row level security;

drop policy if exists "V7 public offers are readable" on public.v7_published_offers;
create policy "V7 public offers are readable"
on public.v7_published_offers
for select
to anon, authenticated
using (publication_state = 'PUBLISHED');

drop policy if exists "V7 public service links are readable" on public.v7_offer_service_links;
create policy "V7 public service links are readable"
on public.v7_offer_service_links
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.v7_published_offers o
    where o.service_offer_id = v7_offer_service_links.service_offer_id
      and o.publication_state = 'PUBLISHED'
  )
);

grant select (
  service_offer_id,
  publication_state,
  service_name,
  partner,
  benefit_name,
  benefit_type,
  benefit_value,
  benefit_unit,
  benefit_base,
  minimum_purchase_value,
  minimum_purchase_unit,
  minimum_purchase_source_expression,
  maximum_benefit,
  frequency_family,
  frequency_count,
  frequency_source_expression,
  audience_condition,
  payment_condition,
  channel_condition,
  exclusions,
  selection_relation,
  lottery_award_mechanism,
  lottery_certainty,
  allocation_method,
  certainty,
  temporal_start,
  temporal_end,
  source_url,
  display_contract
) on public.v7_published_offers to anon, authenticated;

grant select (
  service_offer_id,
  service_id
) on public.v7_offer_service_links to anon, authenticated;

create or replace view public.v7_public_offers
with (security_barrier = true, security_invoker = true)
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
join public.v7_offer_service_links l
  on l.service_offer_id = o.service_offer_id
where o.publication_state = 'PUBLISHED';

grant select on public.v7_public_offers to anon, authenticated;
