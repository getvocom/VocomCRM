'use client';

import { useMemo, useState } from 'react';

interface AggregatedQuery {
  query: string;
  page: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

type SortKey = 'impressions' | 'clicks' | 'position' | 'ctr';

export function QueriesTable({ queries }: { queries: AggregatedQuery[] }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('impressions');
  const [opportunitiesOnly, setOpportunitiesOnly] = useState(false);

  const filtered = useMemo(() => {
    let rows = queries;
    if (opportunitiesOnly) {
      rows = rows.filter((q) => q.impressions >= 20 && q.position >= 8);
    }
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((r) => r.query.toLowerCase().includes(q));
    return [...rows].sort((a, b) => (sortKey === 'position' ? a.position - b.position : b[sortKey] - a[sortKey]));
  }, [queries, search, sortKey, opportunitiesOnly]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search queries..."
          className="w-full rounded-md border border-line px-3 py-1.5 text-sm sm:w-64"
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-md border border-line px-2 py-1.5 text-sm"
        >
          <option value="impressions">Sort: Impressions</option>
          <option value="clicks">Sort: Clicks</option>
          <option value="position">Sort: Position (best first)</option>
          <option value="ctr">Sort: CTR</option>
        </select>
        <button
          onClick={() => setOpportunitiesOnly((v) => !v)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            opportunitiesOnly
              ? 'bg-pill-amber-ink text-white'
              : 'bg-panel text-pill-amber-ink ring-1 ring-inset ring-pill-amber hover:bg-pill-amber'
          }`}
        >
          💡 Opportunities only
        </button>
      </div>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Query</th>
              <th>Page</th>
              <th>Clicks</th>
              <th>Impressions</th>
              <th>CTR</th>
              <th>Avg Position</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 300).map((row) => (
              <tr
                key={row.query}
                className={row.impressions >= 20 && row.position >= 8 ? 'bg-pill-amber/50' : undefined}
              >
                <td className="text-ink">{row.query}</td>
                <td className="max-w-[240px] truncate px-4 py-3 text-ink-2" title={row.page ?? ''}>
                  {row.page || '—'}
                </td>
                <td className="text-ink-3">{row.clicks}</td>
                <td className="text-ink-3">{row.impressions}</td>
                <td className="text-ink-3">{(row.ctr * 100).toFixed(1)}%</td>
                <td className="text-ink-3">{row.position.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-ink-2">
            No query data yet — check the setup steps below.
          </p>
        )}
      </div>
    </div>
  );
}
