import { NextRequest, NextResponse } from 'next/server';
import { isInternal, normalizeEmail, outsideAddresses } from '@/lib/email-addresses';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifySignature } from '@/lib/webhook-signature';

// First half of the Gmail sync. The script sends the outside addresses (and display names)
// it found in new mail; we answer with the ones that belong to someone in the CRM, so only
// those messages are ever sent on. Names are used once, to suggest an address for a CRM
// person who has none, and are otherwise discarded.
//
// Body: { people: [{email, name}], backfilled?: string[], excludedThreads?: string[] }
// Reply: { known: string[], backfill: string[] }

const MAX_PEOPLE = 500;
const BACKFILL_PER_RUN = 10;

type Admin = ReturnType<typeof createAdminClient>;

const nameKey = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// Rows with no email, paged because Supabase returns at most 1000 at a time.
async function withoutEmail(supabase: Admin, table: 'website_leads' | 'account_contacts') {
  const rows: { id: string; name: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select('id, name')
      .or('email.is.null,email.eq.')
      .order('id')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

async function suggestAddresses(supabase: Admin, people: { email: string; name: string }[]) {
  // Full names only: a bare first name would match the wrong person.
  const byName = new Map<string, { email: string; name: string }>();
  for (const p of people) {
    const key = nameKey(p.name);
    if (key.split(' ').length >= 2) byName.set(key, p);
  }
  if (byName.size === 0) return;

  const suggestions: Record<string, unknown>[] = [];
  for (const table of ['website_leads', 'account_contacts'] as const) {
    for (const row of await withoutEmail(supabase, table)) {
      const match = row.name ? byName.get(nameKey(row.name)) : undefined;
      if (!match) continue;
      suggestions.push({
        email: match.email,
        display_name: match.name,
        record_table: table,
        record_id: row.id,
        record_label: row.name
      });
    }
  }
  if (suggestions.length === 0) return;
  // ignoreDuplicates keeps an earlier accept/dismiss decision.
  const { error } = await supabase
    .from('email_suggestions')
    .upsert(suggestions, { onConflict: 'email,record_table,record_id', ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function POST(request: NextRequest) {
  const secret = process.env.EMAIL_SYNC_SECRET;
  if (!secret) return NextResponse.json({ error: 'email sync not configured' }, { status: 500 });
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers, secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { people?: unknown; backfilled?: unknown; excludedThreads?: unknown };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const people: { email: string; name: string }[] = [];
  for (const p of Array.isArray(body.people) ? body.people.slice(0, MAX_PEOPLE) : []) {
    const email = normalizeEmail(p?.email);
    if (email && !isInternal(email)) people.push({ email, name: typeof p?.name === 'string' ? p.name.slice(0, 120) : '' });
  }

  try {
    const supabase = createAdminClient();

    // Threads labelled "No CRM" after they were synced get hidden.
    const excluded = (Array.isArray(body.excludedThreads) ? body.excludedThreads : [])
      .filter((t): t is string => typeof t === 'string')
      .slice(0, 500);
    if (excluded.length > 0) {
      const { error } = await supabase.from('email_messages').update({ hidden: true }).in('thread_id', excluded);
      if (error) throw new Error(error.message);
    }

    const done = outsideAddresses(Array.isArray(body.backfilled) ? body.backfilled : []);
    if (done.length > 0) {
      const { error } = await supabase.from('email_backfill_queue').delete().in('email', done);
      if (error) throw new Error(error.message);
    }

    let known: string[] = [];
    const emails = [...new Set(people.map((p) => p.email))];
    if (emails.length > 0) {
      const { data, error } = await supabase.rpc('crm_known_emails', { addresses: emails });
      if (error) throw new Error(error.message);
      known = (data ?? []) as string[];
      const knownSet = new Set(known);
      await suggestAddresses(supabase, people.filter((p) => !knownSet.has(p.email)));
    }

    const { data: queued, error: queueError } = await supabase
      .from('email_backfill_queue')
      .select('email')
      .order('queued_at')
      .limit(BACKFILL_PER_RUN * 3);
    if (queueError) throw new Error(queueError.message);
    const queuedEmails = (queued ?? []).map((q) => q.email as string);
    const backfill = outsideAddresses(queuedEmails).slice(0, BACKFILL_PER_RUN);
    // Our own or malformed addresses never need importing; drop them from the queue.
    const junk = queuedEmails.filter((e) => outsideAddresses([e]).length === 0);
    if (junk.length > 0) await supabase.from('email_backfill_queue').delete().in('email', junk);

    return NextResponse.json({ known, backfill });
  } catch (err) {
    console.error('Email match failed:', err);
    return NextResponse.json({ error: 'match failed' }, { status: 500 });
  }
}
