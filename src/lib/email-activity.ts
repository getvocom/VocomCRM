import type { SupabaseClient } from '@supabase/supabase-js';
import { outsideAddresses } from './email-addresses';

// Reads the email activity pushed in by the Gmail sync (migration_023). Every function
// returns an empty result if the tables are missing or a query fails, so pages that show
// email activity keep working without it.

export interface EmailMessage {
  id: string;
  thread_id: string;
  mailbox: string;
  direction: 'in' | 'out';
  from_email: string;
  from_name: string | null;
  participants: string[];
  subject: string | null;
  preview: string | null;
  sent_at: string;
}

export interface LastContact {
  direction: 'in' | 'out';
  sentAt: string;
  subject: string | null;
  // Worked out on the server so the browser renders exactly the same text.
  ago: string;
}

export type LastContactMap = Record<string, LastContact>;

export function timeAgo(iso: string, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / (60 * 24))}d`;
}

// Latest message per address, keyed by lowercase address.
export async function getLastContacts(supabase: SupabaseClient, emails: (string | null | undefined)[]): Promise<LastContactMap> {
  const addresses = outsideAddresses(emails);
  const map: LastContactMap = {};
  for (let i = 0; i < addresses.length; i += 150) {
    const { data, error } = await supabase
      .from('email_last_contact')
      .select('email, sent_at, direction, subject')
      .in('email', addresses.slice(i, i + 150));
    if (error) return map;
    for (const row of data ?? []) {
      map[row.email] = { direction: row.direction, sentAt: row.sent_at, subject: row.subject, ago: timeAgo(row.sent_at) };
    }
  }
  return map;
}

// The most recent contact across several addresses (an account or deal has more than one).
export function latestContact(map: LastContactMap, emails: (string | null | undefined)[]): LastContact | null {
  let latest: LastContact | null = null;
  for (const email of outsideAddresses(emails)) {
    const c = map[email];
    if (c && (!latest || c.sentAt > latest.sentAt)) latest = c;
  }
  return latest;
}

export async function getMessages(
  supabase: SupabaseClient,
  emails: (string | null | undefined)[],
  limit = 30
): Promise<EmailMessage[]> {
  const addresses = outsideAddresses(emails).slice(0, 150);
  if (addresses.length === 0) return [];
  const { data, error } = await supabase
    .from('email_messages')
    .select('id, thread_id, mailbox, direction, from_email, from_name, participants, subject, preview, sent_at')
    .overlaps('participants', addresses)
    .eq('hidden', false)
    .order('sent_at', { ascending: false })
    .limit(limit);
  return error ? [] : ((data ?? []) as EmailMessage[]);
}

// A deal has no address of its own: use the leads linked to it and its account's contacts.
export async function getDealAddresses(supabase: SupabaseClient, dealId: string): Promise<string[]> {
  const [{ data: deal }, { data: leads }] = await Promise.all([
    supabase.from('deals').select('account_id').eq('id', dealId).maybeSingle(),
    supabase.from('website_leads').select('email').eq('deal_id', dealId)
  ]);
  let contacts: { email: string | null }[] = [];
  if (deal?.account_id) {
    const { data } = await supabase.from('account_contacts').select('email').eq('account_id', deal.account_id);
    contacts = data ?? [];
  }
  return outsideAddresses([...(leads ?? []), ...contacts].map((r) => r.email));
}
