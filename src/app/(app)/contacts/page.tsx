import { BreakdownBars } from '@/components/breakdown-bars';
import { PageHeader } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import type { MasterContact } from '@/lib/types';
import { ImportForm } from './import-form';
import { ContactsTable } from './table';

const FIXED_SOURCES = [
  { label: 'Website', colorClass: 'bg-chart-blue' },
  { label: 'Offline Event', colorClass: 'bg-chart-teal' },
  { label: 'Referral', colorClass: 'bg-chart-purple' },
  { label: 'Research', colorClass: 'bg-chart-amber' },
  { label: 'Other', colorClass: 'bg-chart-grey' },
  { label: 'Instantly', colorClass: 'bg-chart-orange' },
  { label: 'LinkedIn Activity', colorClass: 'bg-chart-sky' }
];

const PAGE_SIZE = 100;

const SORT_OPTIONS: Record<string, { column: string; ascending: boolean }> = {
  recent: { column: 'touched_at', ascending: false },
  name: { column: 'name', ascending: true },
  company: { column: 'company', ascending: true }
};

export default async function ContactsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const sort = params.sort && SORT_OPTIONS[params.sort] ? params.sort : 'recent';

  const supabase = await createClient();

  let query = supabase.from('master_contacts').select('*', { count: 'exact' });
  if (q) {
    const escaped = q.replace(/[%_]/g, '\\$&');
    query = query.or(
      `name.ilike.%${escaped}%,email.ilike.%${escaped}%,company.ilike.%${escaped}%,phone.ilike.%${escaped}%,job_title.ilike.%${escaped}%,source.ilike.%${escaped}%`
    );
  }
  const { column, ascending } = SORT_OPTIONS[sort];
  query = query
    .order(column, { ascending, nullsFirst: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const [{ data: contacts, count: totalCount }, { count: allCount }, ...sourceCounts] = await Promise.all([
    query.returns<MasterContact[]>(),
    supabase.from('master_contacts').select('*', { count: 'exact', head: true }),
    ...FIXED_SOURCES.map((s) =>
      supabase.from('master_contacts').select('*', { count: 'exact', head: true }).eq('source', s.label)
    )
  ]);

  const fixedTotal = sourceCounts.reduce((sum, c) => sum + (c.count ?? 0), 0);
  const importedCount = Math.max(0, (allCount ?? 0) - fixedTotal);

  const sourceBreakdown = [
    ...FIXED_SOURCES.map((s, i) => ({ label: s.label, count: sourceCounts[i].count ?? 0, colorClass: s.colorClass })),
    { label: 'Imported (CSV)', count: importedCount, colorClass: 'bg-chart-grey' }
  ];

  return (
    <div>
      <PageHeader
        group="General"
        title="Contacts"
        className="mb-6"
        description="Every contact this CRM has ever touched — leads, Instantly leads, LinkedIn activity, and anything imported below (Hunter.io exports, LinkedIn Sales Navigator lists, etc). Not deduplicated across sources — same person from two places shows twice, tagged by source."
      />

      <div className="mb-6 max-w-md">
        <BreakdownBars title={`By source (${(allCount ?? 0).toLocaleString()} total)`} items={sourceBreakdown} />
      </div>

      <ImportForm />

      <ContactsTable
        contacts={contacts ?? []}
        totalCount={totalCount ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        query={q}
        sort={sort}
      />
    </div>
  );
}
