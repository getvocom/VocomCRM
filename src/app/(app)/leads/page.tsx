import Link from 'next/link';
import { AddLeadForm } from '@/components/add-lead-form';
import { LeadsUploadForm } from '@/components/leads-upload-form';
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
  searchParams: Promise<{ tab?: string; id?: string; hot?: string }>;
}) {
  const params = await searchParams;
  const sourceTab = LEADS_SOURCE_TABS.find((t) => t.slug === params.tab);
  // No tab given: Overview, unless the link points at a specific lead (notification links
  // are /leads?id=<lead>), in which case open the table so the row can be highlighted.
  const tab: LeadsTabSlug = sourceTab
    ? sourceTab.slug
    : params.tab === 'all' || (params.tab !== 'overview' && params.id)
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
        heading={
          <>
            <div className="mb-1 text-sm text-neutral-500">Sales</div>
            <h1 className="text-2xl font-semibold text-neutral-900">Leads</h1>
            <p className="mt-1 max-w-3xl text-sm text-neutral-500">
              Every lead except Research. LinkedIn and Referral leads also have their own pages
              (Marketing → LinkedIn Outreach, Sales → Referrals); they&apos;re the same rows, so an
              edit in one place shows in the other.
            </p>
          </>
        }
        addForm={<AddLeadForm key={defaultSource} source={defaultSource} selectableSources={LEAD_SOURCES} />}
        uploadForm={
          <LeadsUploadForm key={defaultUploadSource} source={defaultUploadSource} selectableSources={LEADS_UPLOAD_SOURCES} />
        }
      />

      <nav aria-label="Lead views" className="mb-6 mt-5 flex flex-wrap gap-x-6 gap-y-1 border-b border-neutral-200">
        {tabs.map((t) => {
          const active = t.slug === tab;
          return (
            <Link
              key={t.slug}
              href={`/leads?tab=${t.slug}`}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-0.5 py-2.5 text-sm ${
                active
                  ? 'border-neutral-900 font-medium text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="rounded-full bg-neutral-100 px-1.5 text-xs text-neutral-600">{t.count}</span>
              )}
            </Link>
          );
        })}
      </nav>

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
        />
      )}
    </div>
  );
}
