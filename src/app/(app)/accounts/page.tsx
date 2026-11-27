import { getLastContacts, latestContact, type LastContact } from '@/lib/email-activity';
import { createClient } from '@/lib/supabase/server';
import { isOpen } from '@/lib/opportunities';
import type { Account, AccountContact, Deal, Rep } from '@/lib/types';
import { PageHeaderPanels } from '@/components/page-header-panels';
import { StatCard } from '@/components/ui';
import { AddAccountForm } from './add-account-form';
import { AccountsTable } from './table';

export default async function AccountsPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: reps }, { data: contacts }, { data: deals }] = await Promise.all([
    supabase.from('accounts').select('*').order('name').returns<Account[]>(),
    supabase.from('reps').select('*').order('name').returns<Rep[]>(),
    supabase
      .from('account_contacts')
      .select('id, account_id, email')
      .returns<Pick<AccountContact, 'id' | 'account_id' | 'email'>[]>(),
    supabase
      .from('deals')
      .select('id, account_id, value, stage, status')
      .returns<Pick<Deal, 'id' | 'account_id' | 'value' | 'stage' | 'status'>[]>()
  ]);

  const allAccounts = accounts ?? [];

  const contactCounts: Record<string, number> = {};
  (contacts ?? []).forEach((c) => {
    contactCounts[c.account_id] = (contactCounts[c.account_id] ?? 0) + 1;
  });

  const dealCounts: Record<string, number> = {};
  (deals ?? []).forEach((d) => {
    if (d.account_id) dealCounts[d.account_id] = (dealCounts[d.account_id] ?? 0) + 1;
  });

  // Per-account open opportunity count/value and a stage tally, shown in the table.
  const dealSummary: Record<string, { open: number; openValue: number; stages: Record<string, number> }> = {};
  (deals ?? []).forEach((d) => {
    if (!d.account_id) return;
    const row = (dealSummary[d.account_id] ??= { open: 0, openValue: 0, stages: {} });
    const stage = d.stage ?? d.status;
    row.stages[stage] = (row.stages[stage] ?? 0) + 1;
    if (isOpen(d as Deal)) {
      row.open += 1;
      row.openValue += d.value;
    }
  });

  // Latest synced email per account, from its contacts and the leads linked to its deals.
  const { data: linkedLeads } = await supabase
    .from('website_leads')
    .select('email, deals!inner(account_id)')
    .not('deal_id', 'is', null)
    .not('email', 'is', null)
    .returns<{ email: string; deals: { account_id: string | null } }[]>();
  const accountEmails: Record<string, (string | null)[]> = {};
  (contacts ?? []).forEach((c) => (accountEmails[c.account_id] ??= []).push(c.email));
  (linkedLeads ?? []).forEach((l) => {
    if (l.deals.account_id) (accountEmails[l.deals.account_id] ??= []).push(l.email);
  });
  const lastContactMap = await getLastContacts(supabase, Object.values(accountEmails).flat());
  const lastContactByAccount: Record<string, { contact: LastContact | null; emails: string[] }> = {};
  Object.entries(accountEmails).forEach(([id, emails]) => {
    lastContactByAccount[id] = {
      contact: latestContact(lastContactMap, emails),
      emails: emails.filter((e): e is string => !!e)
    };
  });

  const linkedDeals = (deals ?? []).filter((d) => d.account_id).length;

  return (
    <div>
      <PageHeaderPanels
        group="Sales"
        title="Accounts"
        description="Company-level records. Each account can have its own contacts and deals — link deals and leads to an account as you work them."
        panels={[{ key: 'add', label: '+ Add account', content: <AddAccountForm reps={reps ?? []} /> }]}
      />

      <div className="mb-6 mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total accounts" value={allAccounts.length.toLocaleString()} />
        <StatCard label="Linked deals" value={linkedDeals.toLocaleString()} />
      </div>

      <AccountsTable
        accounts={allAccounts}
        reps={reps ?? []}
        contactCounts={contactCounts}
        dealCounts={dealCounts}
        dealSummary={dealSummary}
        lastContacts={lastContactByAccount}
      />
    </div>
  );
}
