-- Run in Supabase SQL Editor.
--
-- Email activity from Gmail. A script in the connected Google account pushes
-- date, subject, preview and addresses for mail to or from people already in the CRM
-- (see "Claude outputs/email-sync/"). Message bodies and attachments are never stored.
--
-- Everything here is written by the server only (service role). Signed-in users can read.

create table email_messages (
  id uuid primary key default gen_random_uuid(),
  gmail_id text not null unique,
  thread_id text not null,
  mailbox text not null,
  direction text not null check (direction in ('in', 'out')),
  from_email text not null,
  from_name text,
  participants text[] not null default '{}',   -- outside addresses only, lowercase
  subject text,
  preview text,
  sent_at timestamptz not null,
  hidden boolean not null default false,       -- "Hide from CRM" / thread labelled No CRM
  created_at timestamptz not null default now()
);
create index email_messages_participants_idx on email_messages using gin (participants);
create index email_messages_sent_at_idx on email_messages (sent_at desc);
create index email_messages_thread_idx on email_messages (thread_id);

alter table email_messages enable row level security;
create policy "authenticated read" on email_messages for select using (auth.role() = 'authenticated');

-- People in the CRM with no email address who appear in the mailbox under the same name.
create table email_suggestions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text,
  record_table text not null check (record_table in ('website_leads', 'account_contacts')),
  record_id uuid not null,
  record_label text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (email, record_table, record_id)
);

alter table email_suggestions enable row level security;
create policy "authenticated read" on email_suggestions for select using (auth.role() = 'authenticated');

-- Addresses whose past mail still needs importing (filled by the triggers below).
create table email_backfill_queue (
  email text primary key,
  queued_at timestamptz not null default now()
);
alter table email_backfill_queue enable row level security;  -- no policies: server only

create or replace function queue_email_backfill() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is null or btrim(new.email) = '' then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if lower(btrim(coalesce(old.email, ''))) = lower(btrim(new.email)) then
      return new;
    end if;
  end if;
  insert into email_backfill_queue (email) values (lower(btrim(new.email)))
  on conflict (email) do update set queued_at = now();
  return new;
end $$;

create trigger website_leads_email_backfill
  after insert or update of email on website_leads
  for each row execute function queue_email_backfill();

create trigger account_contacts_email_backfill
  after insert or update of email on account_contacts
  for each row execute function queue_email_backfill();

-- When the mailbox last checked in.
create table sync_status (
  key text primary key,
  last_run_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);
alter table sync_status enable row level security;
create policy "authenticated read" on sync_status for select using (auth.role() = 'authenticated');

-- Which of these (lowercase) addresses belong to someone in the CRM.
create index if not exists website_leads_email_lower_idx on website_leads (lower(btrim(email)));
create index if not exists account_contacts_email_lower_idx on account_contacts (lower(btrim(email)));
create index if not exists instantly_leads_email_lower_idx on instantly_leads (lower(btrim(email)));
create index if not exists instantly_leads_alt_email_lower_idx on instantly_leads (lower(btrim(alternative_email)));
create index if not exists imported_contacts_email_lower_idx on imported_contacts (lower(btrim(email)));

create or replace function crm_known_emails(addresses text[]) returns setof text
language sql stable as $$
  select a from unnest(addresses) as a
  where exists (select 1 from website_leads where lower(btrim(email)) = a)
     or exists (select 1 from account_contacts where lower(btrim(email)) = a)
     or exists (select 1 from instantly_leads where lower(btrim(email)) = a)
     or exists (select 1 from instantly_leads where lower(btrim(alternative_email)) = a)
     or exists (select 1 from imported_contacts where lower(btrim(email)) = a)
$$;

-- Latest visible message per outside address.
create or replace view email_last_contact with (security_invoker = true) as
select distinct on (p.email)
  p.email, m.sent_at, m.direction, m.subject, m.thread_id, m.mailbox
from email_messages m
cross join lateral unnest(m.participants) as p(email)
where not m.hidden
order by p.email, m.sent_at desc;
