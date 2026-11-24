import { BarTrend } from '@/components/bar-trend';
import { PageHeader } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import type { SeoDailyTotal, SeoLandingPage, SeoMonthlyReport, SeoSearchQuery } from '@/lib/types';
import { QueriesTable } from './queries-table';

function aggregateQueries(rows: SeoSearchQuery[]) {
  const byQuery = new Map<
    string,
    { query: string; page: string | null; clicks: number; impressions: number; ctrSum: number; posSum: number; n: number }
  >();

  for (const row of rows) {
    const existing = byQuery.get(row.query) ?? {
      query: row.query,
      page: row.page,
      clicks: 0,
      impressions: 0,
      ctrSum: 0,
      posSum: 0,
      n: 0
    };
    existing.clicks += row.clicks;
    existing.impressions += row.impressions;
    existing.ctrSum += row.ctr;
    existing.posSum += row.position;
    existing.n += 1;
    byQuery.set(row.query, existing);
  }

  return [...byQuery.values()].map((q) => ({
    query: q.query,
    page: q.page,
    clicks: q.clicks,
    impressions: q.impressions,
    ctr: q.n > 0 ? q.ctrSum / q.n : 0,
    position: q.n > 0 ? q.posSum / q.n : 0
  }));
}

export default async function SeoPage() {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 400); // covers the 1Y toggle option, however much history exists
  const sinceIso = since.toISOString().slice(0, 10);

  const [{ data: queryRows }, { data: dailyTotals }, { data: landingRows }, { data: reports }] = await Promise.all([
    supabase.from('seo_search_queries').select('*').gte('date', sinceIso).returns<SeoSearchQuery[]>(),
    supabase.from('seo_daily_totals').select('*').gte('date', sinceIso).returns<SeoDailyTotal[]>(),
    supabase
      .from('seo_landing_pages')
      .select('*')
      .gte('date', sinceIso)
      .order('date', { ascending: false })
      .returns<SeoLandingPage[]>(),
    supabase
      .from('seo_monthly_reports')
      .select('*')
      .order('month', { ascending: false })
      .limit(6)
      .returns<SeoMonthlyReport[]>()
  ]);

  const aggregated = aggregateQueries(queryRows ?? []);
  const latestReport = reports?.[0] ?? null;

  // Site-wide totals come from a date-only query, not the per-query breakdown below —
  // Search Console anonymizes/omits rows for rare search terms once broken down by query,
  // which otherwise undercounts clicks by ~95% on a low-traffic site like this one.
  const clicksByDay = (dailyTotals ?? []).map((r) => ({ date: r.date, value: r.clicks }));
  const impressionsByDay = (dailyTotals ?? []).map((r) => ({ date: r.date, value: r.impressions }));
  const sessionsByDay = (landingRows ?? []).map((r) => ({ date: r.date, value: r.sessions }));

  const topPages = Object.entries(
    (landingRows ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.page_path] = (acc[r.page_path] ?? 0) + r.sessions;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div>
      <PageHeader
        group="Marketing"
        title="SEO"
        className="mb-6"
        description={
          <>
            Search Console + Analytics data for your own site — not competitor comparison
            (neither API exposes that; would need a paid tool like Ahrefs/SEMrush on top of
            this). &quot;Opportunities&quot; are queries with real impressions that aren&apos;t
            ranking well yet. Note: the per-query table below will show lower click totals than
            the chart above — Google itself hides which exact search term led to a click once
            that term is rare enough to be identifying, so the site-wide total is always the
            more accurate number.
          </>
        }
      />

      {latestReport ? (
        <div className="mb-6 rounded-xl border border-line bg-panel p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">
              Monthly report —{' '}
              {new Date(latestReport.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </h2>
            <span className="text-xs text-ink-2">
              generated {new Date(latestReport.generated_at).toLocaleDateString()}
            </span>
          </div>
          <p className="mb-4 text-sm text-ink-3">{latestReport.summary}</p>
          {latestReport.content_suggestions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-ink-2">Suggested blog titles</p>
              <ul className="space-y-2">
                {latestReport.content_suggestions.map((s, i) => (
                  <li key={i} className="rounded-md bg-panel-2 p-3 text-sm">
                    <p className="font-medium text-ink">{s.title}</p>
                    <p className="text-xs text-ink-2">
                      {s.reason} — based on &quot;{s.based_on_query}&quot;
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-line bg-panel p-5 text-sm text-ink-2">
          No monthly report yet — generates automatically once Search Console data is
          flowing (see setup below) and runs on the 1st query of each month.
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <BarTrend title="Clicks" data={clicksByDay} colorClass="bg-chart-blue" />
        <BarTrend title="Impressions" data={impressionsByDay} colorClass="bg-chart-grey" />
        <BarTrend title="Sessions" data={sessionsByDay} colorClass="bg-chart-green" />
      </div>

      <div className="mb-6 card p-5">
        <p className="mb-2 text-sm text-ink-2">Top landing pages</p>
        <ul className="space-y-1 text-sm">
          {topPages.length === 0 ? (
            <li className="text-ink-2">No traffic data yet</li>
          ) : (
            topPages.map(([path, sessions]) => (
              <li key={path} className="flex justify-between gap-2">
                <span className="truncate text-ink-3">{path}</span>
                <span className="shrink-0 text-ink-2">{sessions}</span>
              </li>
            ))
          )}
        </ul>
      </div>

      <QueriesTable queries={aggregated} />
    </div>
  );
}
