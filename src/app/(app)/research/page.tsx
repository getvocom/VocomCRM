import { AddLeadForm } from '@/components/add-lead-form';
import { BarTrend } from '@/components/bar-trend';
import { BreakdownBars } from '@/components/breakdown-bars';
import { LeadsUploadForm } from '@/components/leads-upload-form';
import { PageHeaderPanels } from '@/components/page-header-panels';
import { chartClass } from '@/lib/pill-colors';
import { createClient } from '@/lib/supabase/server';
import { LEAD_STATUSES, type Deal, type Lead, type Rep } from '@/lib/types';
import { LeadsTable } from '../leads/table';

export default async function ResearchPage() {
  const supabase = await createClient();

  const [{ data: leads }, { data: reps }, { data: deals }] = await Promise.all([
    supabase
      .from('website_leads')
      .select('*')
      .eq('source', 'Research')
      .order('created_at', { ascending: false })
      .returns<Lead[]>(),
    supabase.from('reps').select('*').order('name').returns<Rep[]>(),
    supabase.from('deals').select('*').order('start_date', { ascending: false }).returns<Deal[]>()
  ]);

  const allLeads = leads ?? [];
  const dailyPoints = allLeads.map((l) => ({ date: l.created_at, value: 1 }));
  const statusBreakdown = LEAD_STATUSES.map((status) => ({
    label: status,
    count: allLeads.filter((l) => l.status === status).length,
    colorClass: chartClass(status)
  }));

  return (
    <div>
      <PageHeaderPanels
        group="Sales"
        title="Research"
        description={
          <>
            Leads worth a manual cold outreach pass when there&apos;s time — not actively
            worked yet. Changing a lead&apos;s source away from Research moves it off this
            page.
          </>
        }
        panels={[
          { key: 'upload', label: 'Import CSV', content: <LeadsUploadForm source="Research" /> },
          { key: 'add', label: '+ Add lead', content: <AddLeadForm source="Research" /> }
        ]}
      />

      <div className="mb-6 mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <BarTrend title="New leads" data={dailyPoints} colorClass="bg-accent" />
        <BreakdownBars title="By status" items={statusBreakdown} />
      </div>

      <LeadsTable
        leads={allLeads}
        reps={reps ?? []}
        deals={deals ?? []}
        statuses={LEAD_STATUSES}
        visibleSources={['Research']}
      />
    </div>
  );
}
