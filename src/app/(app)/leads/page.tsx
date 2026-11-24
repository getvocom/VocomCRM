import { AddLeadForm } from '@/components/add-lead-form';
import { LeadsUploadForm } from '@/components/leads-upload-form';
import { TabNav } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import { LEADS_SOURCE_TABS, type LeadsTabSlug } from '@/lib/lead-tabs';
import {
  LEADS_PAGE_SOURCES,
  LEADS_UPLOAD_SOURCES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  type Deal,
  type Lead,
  type Rep
} from '@/lib/types';
import { LeadsHeader } from './lead-actions';
import { LeadsOverview } from './overview';
import { LeadsTable } from './table';

export default async function LeadsPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string; id?: string; hot?: string; q?: string }>;
}) {
  const params = await searchParams;
  const sourceTab = LEADS_SOURCE_TABS.find((t) => t.slug === params.tab);
  // No tab given: Overview, unless the link points at a specific lead (notification links
  // are /leads?id=<lead>), in which case open the table so the row can be highlighted.
  const tab: LeadsTabSlug = sourceTab
    ? sourceTab.slug
    : params.tab === 'all' || (params.tab !== 'overview' && (params.id || params.q))
      ? 'all'
      : 'overview';

  const supabase = await createClient();
  const [{ data: leads }, { data: reps }, { data: deals }] = await Promise.all([
    supabase
      .from('website_leads')
      .select('*')
      // Everything except Research. Referral and LinkedIn leads are listed here AND on
      // their own pages: the same rows, so nothing is duplicated.
      .neq('source', 'Research')
      .order('created_at', { ascending: false })
      .returns<Lead[]>(),
    supabase.from('reps').select('*').order('name').returns<Rep[]>(),
    supabase.from('deals').select('*').order('start_date', { ascending: false }).returns<Deal[]>()
  ]);

  const allLeads = leads ?? [];
  const tabLeads = sourceTab ? allLeads.filter((l) => l.source === sourceTab.source) : allLeads;

  const tabs: { slug: LeadsTabSlug; label: string; count?: number }[] = [
    { slug: 'overview', label: 'Overview' },
    { slug: 'all', label: 'All leads', count: allLeads.length },
    ...LEADS_SOURCE_TABS.map((t) => ({
      slug: t.slug,
      label: t.label,
      count: allLeads.filter((l) => l.source === t.source).length
    }))
  ];

  const defaultSource = sourceTab?.source ?? 'Other';
  const defaultUploadSource = LEADS_UPLOAD_SOURCES.includes(defaultSource) ? defaultSource : 'Other';

  return (
    <div>
      <LeadsHeader
        description={
          <>
            Every lead except Research. LinkedIn and Referral leads also have their own pages
            (Marketing → LinkedIn Outreach, Sales → Referrals); they&apos;re the same rows, so an
            edit in one place shows in the other.
          </>
        }
        addForm={<AddLeadForm key={defaultSource} source={defaultSource} selectableSources={LEAD_SOURCES} />}
        uploadForm={
          <LeadsUploadForm key={defaultUploadSource} source={defaultUploadSource} selectableSources={LEADS_UPLOAD_SOURCES} />
        }
      />

      <TabNav
        label="Lead views"
        items={tabs.map((t) => ({
          href: `/leads?tab=${t.slug}`,
          label: t.label,
          count: t.count,
          active: t.slug === tab
        }))}
      />

      {tab === 'overview' ? (
        <LeadsOverview leads={allLeads} />
      ) : (
        <LeadsTable
          leads={tabLeads}
          reps={reps ?? []}
          deals={deals ?? []}
          statuses={LEAD_STATUSES}
          visibleSources={sourceTab ? [sourceTab.source] : LEADS_PAGE_SOURCES}
          initialHotOnly={params.hot === '1'}
          initialQuery={params.q ?? ''}
          // Remount when the ⌘K search sends a new query, so the box picks it up.
          key={params.q ?? ''}
        />
      )}
    </div>
  );
}
