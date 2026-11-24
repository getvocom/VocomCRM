import '@/components/opp/opp.css';
import { StatCard } from '@/components/ui';
import { formatCompact } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { DEAL_PIPELINE_STATUSES, type Account, type Deal, type Rep } from '@/lib/types';
import { AddDealForm } from './add-deal-form';
import { OpportunitiesWorkspace } from './opportunities-workspace';
import { StatusBreakdown } from './status-breakdown';
import { DealsTable } from './table';

export default async function DealsPage() {
  const supabase = await createClient();

  const [{ data: deals }, { data: reps }, { data: accounts }] = await Promise.all([
    supabase.from('deals').select('*').order('start_date', { ascending: true }).returns<Deal[]>(),
    supabase.from('reps').select('*').order('name').returns<Rep[]>(),
    supabase.from('accounts').select('*').order('name').returns<Account[]>()
  ]);

  const allDeals = deals ?? [];
  const openDeals = allDeals.filter((d) => d.status !== 'Won' && d.status !== 'Lost');
  const pipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);
  const wonValue = allDeals.filter((d) => d.status === 'Won').reduce((sum, d) => sum + d.value, 0);

  // The original editable table view (with its own totals, status breakdown and add form)
  // is kept as the "Table" tab of the opportunity workspace.
  const tableView = (
    <div>
      <p className="mb-4 text-sm text-ink-2">
        Customer info, deal value, PIC, and product/order — a full editable, sortable, filterable table.
      </p>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Open deals" value={openDeals.length.toLocaleString()} />
        <StatCard label="Open pipeline value" value={formatCompact(pipelineValue)} sub={`$${pipelineValue.toLocaleString()}`} />
        <StatCard label="Won value" value={formatCompact(wonValue)} sub={`$${wonValue.toLocaleString()}`} tone="good" />
        <StatCard label="Total deals" value={allDeals.length.toLocaleString()} />
      </div>
      <div className="mb-6">
        <StatusBreakdown deals={allDeals} />
      </div>
      <AddDealForm />
      <DealsTable deals={allDeals} reps={reps ?? []} accounts={accounts ?? []} statuses={DEAL_PIPELINE_STATUSES} />
    </div>
  );

  return (
    <div>
      <OpportunitiesWorkspace deals={allDeals} accounts={accounts ?? []} reps={reps ?? []} tableView={tableView} />
    </div>
  );
}
