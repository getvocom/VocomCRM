import { BarTrend } from '@/components/bar-trend';
import { BreakdownBars } from '@/components/breakdown-bars';
import { createClient } from '@/lib/supabase/server';
import { LEAD_STATUSES, type Deal, type Lead, type Rep } from '@/lib/types';
import { LeadsTable } from '../leads/table';
import { LinkedInUploadForm } from './upload-form';

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-neutral-500',
  Contacted: 'bg-blue-500',
  Qualified: 'bg-amber-500',
  Won: 'bg-green-500',
  Lost: 'bg-red-400'
};

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
  const dailyPoints = allLeads.map((l) => ({ date: l.created_at, value: 1 }));
  const statusBreakdown = LEAD_STATUSES.map((status) => ({
    label: status,
    count: allLeads.filter((l) => l.status === status).length,
    colorClass: STATUS_COLORS[status]
  }));

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">LinkedIn Outreach</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Leads sourced from LinkedIn outreach, managed by Cynthia. They also appear on Leads
        under the LinkedIn tab — the same rows, so an edit here shows there too. Changing a
        lead&apos;s source away from LinkedIn moves it off this page.
      </p>

      <LinkedInUploadForm />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <BarTrend title="New leads" data={dailyPoints} colorClass="bg-blue-500" />
        <BreakdownBars title="By status" items={statusBreakdown} />
      </div>

      <LeadsTable
        leads={allLeads}
        reps={reps ?? []}
        deals={deals ?? []}
        statuses={LEAD_STATUSES}
        visibleSources={['LinkedIn']}
      />
    </div>
  );
}
