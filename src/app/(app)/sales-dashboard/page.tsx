import { PageHeader } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import type { Account, Deal } from '@/lib/types';
import { SalesDashboardClient } from './sales-dashboard-client';

export default async function SalesDashboardPage() {
  const supabase = await createClient();

  const [{ data: deals }, { data: accounts }] = await Promise.all([
    supabase.from('deals').select('*').returns<Deal[]>(),
    supabase.from('accounts').select('*').returns<Account[]>()
  ]);

  return (
    <div>
      <PageHeader
        group="Sales"
        title="Sales Dashboard"
        description="Pipeline value, revenue, and breakdowns across the sales team. Built on our own deal data — see each component's title for exactly what it includes."
      />
      <SalesDashboardClient deals={deals ?? []} accounts={accounts ?? []} />
    </div>
  );
}
