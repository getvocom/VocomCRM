import Link from 'next/link';
import { EmailTimeline } from '@/components/email-timeline';
import { outsideAddresses } from '@/lib/email-addresses';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Account, AccountContact, Deal, Rep } from '@/lib/types';
import { AccountContactsTable } from './account-contacts-table';
import { AccountDealsTable } from './account-deals-table';
import { AccountFieldsForm } from './account-fields-form';

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: account }, { data: contacts }, { data: deals }, { data: reps }] = await Promise.all([
    supabase.from('accounts').select('*').eq('id', id).maybeSingle<Account>(),
    supabase.from('account_contacts').select('*').eq('account_id', id).order('created_at').returns<AccountContact[]>(),
    supabase.from('deals').select('*').eq('account_id', id).order('start_date', { ascending: false }).returns<Deal[]>(),
    supabase.from('reps').select('*').order('name').returns<Rep[]>()
  ]);

  if (!account) notFound();

  const dealIds = (deals ?? []).map((d) => d.id);
  const leadCountByDeal = new Map<string, number>();
  const leadEmails: (string | null)[] = [];
  if (dealIds.length > 0) {
    const { data: leads } = await supabase.from('website_leads').select('id, deal_id, email').in('deal_id', dealIds);
    leadEmails.push(...(leads ?? []).map((l) => l.email));
    (leads ?? []).forEach((l) => {
      if (l.deal_id) leadCountByDeal.set(l.deal_id, (leadCountByDeal.get(l.deal_id) ?? 0) + 1);
    });
  }

  // Mail is matched on the account's contacts and on leads linked to its deals.
  const emailAddresses = outsideAddresses([...(contacts ?? []).map((c) => c.email), ...leadEmails]);

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-1 text-[13px] text-ink-2">
        <Link href="/accounts" className="hover:text-ink hover:underline">
          Accounts
        </Link>{' '}
        / <span aria-current="page">{account.name}</span>
      </nav>
      <h1 className="mb-6 text-[32px] font-semibold leading-tight tracking-[-0.02em] text-ink">{account.name}</h1>

      <AccountFieldsForm account={account} reps={reps ?? []} />

      <h2 className="mb-3 mt-8 text-[15px] font-semibold text-ink">Contacts</h2>
      <AccountContactsTable accountId={account.id} contacts={contacts ?? []} />

      <h2 className="mb-3 mt-8 text-[15px] font-semibold text-ink">Deals</h2>
      <AccountDealsTable deals={deals ?? []} reps={reps ?? []} leadCountByDeal={leadCountByDeal} />

      <h2 className="mb-3 mt-8 text-[15px] font-semibold text-ink">Email activity</h2>
      <div className="card px-5 py-3">
        <EmailTimeline emails={emailAddresses} />
      </div>
    </div>
  );
}
