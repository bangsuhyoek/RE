-- Existing-subscriber partnership event lifecycle fields.
-- Legacy verified_status is preserved for backward compatibility.
-- New verification_status is intentionally strict: old seeded rows remain UNVERIFIED.

begin;

alter table public.benefits
  add column if not exists audience text not null default 'UNKNOWN',
  add column if not exists partner_type text,
  add column if not exists partner_id text,
  add column if not exists partner_name text,
  add column if not exists benefit_type text,
  add column if not exists benefit_amount integer,
  add column if not exists benefit_rate numeric,
  add column if not exists benefit_cap integer,
  add column if not exists saving_period text,
  add column if not exists eligibility_rules jsonb not null default '{}'::jsonb;
alter table public.benefits
  add column if not exists required_payment_method text,
  add column if not exists required_carrier text,
  add column if not exists required_membership text,
  add column if not exists required_plan text,
  add column if not exists required_cost integer,
  add column if not exists target_plan text,
  add column if not exists plan_change_required boolean not null default false,
  add column if not exists start_at timestamptz,
  add column if not exists end_at timestamptz,
  add column if not exists source_url text,
  add column if not exists source_list_url text,
  add column if not exists official_origin text;
alter table public.benefits
  add column if not exists discovered_at timestamptz,
  add column if not exists last_checked_at timestamptz,
  add column if not exists last_verified_at timestamptz,
  add column if not exists verification_status text not null default 'UNVERIFIED',
  add column if not exists verification_details jsonb not null default '{}'::jsonb,
  add column if not exists soft_degraded_since timestamptz,
  add column if not exists campaign_fingerprint text,
  add column if not exists exclusive_group text,
  add column if not exists stackable boolean not null default false;

update public.benefits
set source_url = coalesce(source_url, link)
where source_url is null and link is not null;
create index if not exists idx_benefits_verification_status
  on public.benefits(verification_status);

create index if not exists idx_benefits_end_at
  on public.benefits(end_at);

create index if not exists idx_benefits_campaign_fingerprint
  on public.benefits(campaign_fingerprint);

create index if not exists idx_benefits_partner
  on public.benefits(partner_type, partner_id);

create or replace function public.get_user_personalized_benefits(p_user_id uuid)
returns setof public.benefits
language sql
security invoker
set search_path = public
stable
as $$
  select distinct on (b.id) b.*
  from public.benefits b
  join public.service_benefits sb on sb.benefit_id = b.id
  join public.subscriptions s on s.service_id = sb.service_id
  where s.user_id = p_user_id
    and s.status = 'active'
    and b.verification_status = 'ACTIVE'
    and (b.start_at is null or b.start_at <= now())
    and (b.end_at is null or b.end_at >= now())
  order by b.id, b.last_verified_at desc nulls last;
$$;

comment on column public.benefits.verification_status is
  'Strict lifecycle state: UNVERIFIED, ACTIVE, SUSPICIOUS, EXPIRED.';

comment on column public.benefits.campaign_fingerprint is
  'Stable campaign identity independent from a changing source URL.';

commit;
