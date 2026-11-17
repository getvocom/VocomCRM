-- Run in Supabase SQL Editor.
-- Merges the standalone "Vocom CRM" opportunity-tracker artifact into the CRM by
-- extending Deals and Accounts (nothing existing is changed or dropped):
--
--   deals     -> detailed stage, priority, type/track, cost, next action, plus the
--                tracker's per-deal lists (vendor quotes, open questions, specs,
--                contacts, activity log, file metadata) stored as jsonb arrays.
--   accounts  -> kind, status, location, supporters, economic buyer, champions, info.
--   account_contacts -> role.
--   vendors   -> new table (manufacturers, trading companies, optics makers, ...).
--
-- deals.status (the 5-value enum used by the Sales Dashboard etc.) stays the source of
-- truth for existing reports; the app derives it from deals.stage when stage changes
-- (see STAGE_TO_STATUS in src/lib/types.ts). deals.value is the quoted price to the
-- customer (0 = not yet priced); deals.cost is what Vocom pays.
--
-- All new columns are plain nullable text/numeric/jsonb, with the allowed values enforced
-- only in the app (same convention as migration_018), so no RLS changes are needed for
-- deals/accounts/account_contacts. The new vendors table gets the standard policy.

alter table deals
  add column title text,
  add column stage text,
  add column priority text,
  add column deal_type text,
  add column track text,
  add column cost numeric,
  add column quote_basis text,
  add column cost_basis text,
  add column summary text,
  add column next_action text,
  add column next_action_date date,
  add column vendor_quotes jsonb not null default '[]'::jsonb,
  add column questions jsonb not null default '[]'::jsonb,
  add column specs jsonb not null default '[]'::jsonb,
  add column deal_contacts jsonb not null default '[]'::jsonb,
  add column activity jsonb not null default '[]'::jsonb,
  add column files jsonb not null default '[]'::jsonb;

-- Backfill stage for existing deals from their current pipeline status.
update deals set stage = case status::text
  when 'Prospecting' then 'Lead'
  when 'Proposal' then 'Quoted'
  when 'Negotiation' then 'Negotiating'
  when 'Won' then 'Won'
  when 'Lost' then 'Lost'
end
where stage is null;

create index deals_stage_idx on deals(stage);

alter table accounts
  add column kind text,
  add column account_status text,
  add column location text,
  add column supporters jsonb not null default '[]'::jsonb,
  add column economic_buyer text,
  add column champions text,
  add column info jsonb not null default '[]'::jsonb;

alter table account_contacts add column role text;

create table vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text,
  relationship text,
  location text,
  products text,
  terms text,
  notes text,
  aliases jsonb not null default '[]'::jsonb,
  contacts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table vendors enable row level security;
create policy "authenticated read/write" on vendors
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Owners in the tracker map to existing reps by first name (Kevin Huang -> Kevin, Cynthia
-- Wu -> Cynthia, John Perez -> John, David Wang -> David, Eric Chung -> Eric). Vincent is the
-- only owner without a rep yet. (Not Victor, who already exists.)
insert into reps (name)
select 'Vincent'
where not exists (select 1 from reps r where lower(r.name) = 'vincent');
