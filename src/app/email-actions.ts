'use server';

import { revalidatePath } from 'next/cache';
import { getDealAddresses, getMessages, type EmailMessage } from '@/lib/email-activity';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// Server actions for email activity. The tables are read-only to signed-in users, so the
// two writes (hide a message, answer a suggestion) check the login and then use the
// service role.

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return supabase;
}

export interface EmailTimelineData {
  messages: EmailMessage[];
  addressCount: number;
}

export async function getEmailTimeline(emails: string[]): Promise<EmailTimelineData> {
  const supabase = await requireUser();
  return { messages: await getMessages(supabase, emails), addressCount: emails.filter(Boolean).length };
}

export async function getDealEmailTimeline(dealId: string): Promise<EmailTimelineData> {
  const supabase = await requireUser();
  const addresses = await getDealAddresses(supabase, dealId);
  return { messages: await getMessages(supabase, addresses), addressCount: addresses.length };
}

export async function hideEmail(id: string) {
  await requireUser();
  const { error } = await createAdminClient().from('email_messages').update({ hidden: true }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}

// Accept: write the address onto the CRM record (only if it still has none), which also
// queues that address's past mail for import.
export async function resolveEmailSuggestion(id: string, accept: boolean) {
  const supabase = await requireUser();
  const admin = createAdminClient();
  const { data: suggestion } = await admin.from('email_suggestions').select('*').eq('id', id).maybeSingle();
  if (!suggestion || suggestion.status !== 'pending') return;

  if (accept) {
    const { error } = await supabase
      .from(suggestion.record_table)
      .update({ email: suggestion.email })
      .eq('id', suggestion.record_id)
      .or('email.is.null,email.eq.');
    if (error) throw new Error(error.message);
    // Any other suggestion for the same person is now moot.
    await admin
      .from('email_suggestions')
      .update({ status: 'dismissed' })
      .eq('record_id', suggestion.record_id)
      .eq('status', 'pending')
      .neq('id', id);
  }
  await admin
    .from('email_suggestions')
    .update({ status: accept ? 'accepted' : 'dismissed' })
    .eq('id', id);
  revalidatePath('/', 'layout');
}
