import '@/components/opp/opp.css';
import { formatCompact } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { oppFontClasses } from '@/lib/opp-fonts';
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
      <p className="mb-4 text-sm text-neutral-500">
        Customer info, deal value, PIC, and product/order — a full editable, sortable, filterable table.
      </p>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Open deals</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 sm:text-3xl">{openDeals.length}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Open pipeline value</p>
          <p
            className="mt-1 truncate text-2xl font-semibold text-neutral-900 sm:text-3xl"
            title={`$${pipelineValue.toLocaleString()}`}
          >
            {formatCompact(pipelineValue)}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Won value</p>
          <p
            className="mt-1 truncate text-2xl font-semibold text-green-700 sm:text-3xl"
            title={`$${wonValue.toLocaleString()}`}
          >
            {formatCompact(wonValue)}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-neutral-500">Total deals</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 sm:text-3xl">{allDeals.length}</p>
        </div>
      </div>
      <div className="mb-6">
        <StatusBreakdown deals={allDeals} />
      </div>
      <AddDealForm />
      <DealsTable deals={allDeals} reps={reps ?? []} accounts={accounts ?? []} statuses={DEAL_PIPELINE_STATUSES} />
    </div>
  );

  return (
    <div className={oppFontClasses}>
      <OpportunitiesWorkspace deals={allDeals} accounts={accounts ?? []} reps={reps ?? []} tableView={tableView} />
    </div>
  );
}
