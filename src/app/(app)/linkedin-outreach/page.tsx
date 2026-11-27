import { BarTrend } from '@/components/bar-trend';
import { PageHeaderPanels } from '@/components/page-header-panels';
import { chartClass } from '@/lib/pill-colors';
import { BreakdownBars } from '@/components/breakdown-bars';
import { getLastContacts } from '@/lib/email-activity';
import { createClient } from '@/lib/supabase/server';
import { LEAD_STATUSES, type Deal, type Lead, type Rep } from '@/lib/types';
import { LeadsTable } from '../leads/table';
import { LinkedInUploadForm } from './upload-form';

export default async function LinkedInOutreachPage() {
  const supabase = await createClient();

  const [{ data: leads }, { data: reps }, { data: deals }] = await Promise.all([
    supabase
      .from('website_leads')
      .select('*')
      .eq('source', 'LinkedIn')
      .order('created_at', { ascending: false })
      .returns<Lead[]>(),
    supabase.from('reps').select('*').order('name').returns<Rep[]>(),
    supabase.from('deals').select('*').order('start_date', { ascending: false }).returns<Deal[]>()
  ]);

  const allLeads = leads ?? [];
  const lastContacts = await getLastContacts(supabase, allLeads.map((l) => l.email));
  const dailyPoints = allLeads.map((l) => ({ date: l.created_at, value: 1 }));
  const statusBreakdown = LEAD_STATUSES.map((status) => ({
    label: status,
    count: allLeads.filter((l) => l.status === status).length,
    colorClass: chartClass(status)
  }));

  return (
    <div>
      <PageHeaderPanels
        group="Marketing"
        title="LinkedIn Outreach"
        panels={[{ key: 'upload', label: 'Import CSV', content: <LinkedInUploadForm /> }]}
        description={
          <>
            Leads sourced from LinkedIn outreach, managed by Cynthia. They also appear on Leads
            under the LinkedIn tab — the same rows, so an edit here shows there too. Changing a
            lead&apos;s source away from LinkedIn moves it off this page.
          </>
        }
      />

      <div className="mb-6 mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <BarTrend title="New leads" data={dailyPoints} colorClass="bg-accent" />
        <BreakdownBars title="By status" items={statusBreakdown} />
      </div>

      <LeadsTable
        lastContacts={lastContacts}
        leads={allLeads}
        reps={reps ?? []}
        deals={deals ?? []}
        statuses={LEAD_STATUSES}
        visibleSources={['LinkedIn']}
      />
    </div>
  );
}
