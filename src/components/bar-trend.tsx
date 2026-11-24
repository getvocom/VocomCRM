'use client';

import { useMemo, useState } from 'react';
import { bucketDaily, bucketWeekly } from '@/lib/daily-counts';

// A card is only a few hundred px wide — cramming e.g. 365 daily bars into that renders
// each one at sub-pixel width (invisible), even though the data's genuinely there. Once
// the series is longer than this, merge consecutive days together so bars stay visible.
const MAX_BARS = 60;

function resample(series: { date: string; value: number }[]) {
  if (series.length <= MAX_BARS) return series.map((d) => ({ ...d, label: d.date }));
  const chunkSize = Math.ceil(series.length / MAX_BARS);
  const chunks: { date: string; value: number; label: string }[] = [];
  for (let i = 0; i < series.length; i += chunkSize) {
    const chunk = series.slice(i, i + chunkSize);
    const value = chunk.reduce((sum, p) => sum + p.value, 0);
    const from = chunk[0].date;
    const to = chunk[chunk.length - 1].date;
    chunks.push({ date: from, value, label: from === to ? from : `${from} to ${to}` });
  }
  return chunks;
}

const RANGES: { label: string; days: number | null }[] = [
  { label: '1D', days: 1 },
  { label: '7D', days: 7 },
  { label: '1M', days: 30 },
  { label: '1Y', days: 365 },
  { label: 'Max', days: null }
];

// `points` should be the raw (possibly unaggregated) dated values for the widest range
// this chart should ever show — the toggle re-buckets client-side from this same array,
// no extra server round-trip per click.
//
// Pass `weeks` for a fixed weekly view instead (e.g. Leads → Overview's "last 12 weeks"):
// one labelled bar per calendar week, no range toggle.
export function BarTrend({
  title,
  data,
  colorClass = 'bg-neutral-800',
  weeks
}: {
  title: string;
  data: { date: string; value: number }[];
  colorClass?: string;
  weeks?: number;
}) {
  const [range, setRange] = useState<number | null>(30);
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);

  const series = useMemo(() => {
    if (custom) {
      return data
        .filter((p) => p.date.slice(0, 10) >= custom.from && p.date.slice(0, 10) <= custom.to)
        .reduce<{ date: string; value: number }[]>((acc, p) => {
          const day = p.date.slice(0, 10);
          const existing = acc.find((a) => a.date === day);
          if (existing) existing.value += p.value;
          else acc.push({ date: day, value: p.value });
          return acc;
        }, [])
        .sort((a, b) => a.date.localeCompare(b.date));
    }
    return bucketDaily(data, range);
  }, [data, range, custom]);

  const total = series.reduce((sum, d) => sum + d.value, 0);
  const displaySeries = useMemo(() => resample(series), [series]);
  const max = Math.max(1, ...displaySeries.map((d) => d.value));
  const weekly = useMemo(() => (weeks ? bucketWeekly(data, weeks) : []), [data, weeks]);

  if (weeks) {
    const weeklyMax = Math.max(1, ...weekly.map((w) => w.value));
    return (
      <section className="card p-5">
        <div className="mb-5 flex items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          <span className="text-[13px] text-ink-2">Last {weeks} weeks</span>
        </div>
        <div className="flex h-[180px] items-end gap-2.5 border-b border-line">
          {weekly.map((w) => (
            <div key={w.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[11px] text-ink-2">{w.value}</span>
              <div
                title={`Week of ${w.label}: ${w.value}`}
                className={`w-full max-w-[34px] rounded-t-md ${colorClass}`}
                // 80% leaves room for the value label above the tallest bar.
                style={{ height: `${w.value === 0 ? 0 : Math.max(2, (w.value / weeklyMax) * 80)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2.5">
          {weekly.map((w) => (
            <span key={w.date} className="flex-1 truncate text-center text-[11px] text-ink-2">
              {w.label}
            </span>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="card p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => {
                setRange(r.days);
                setCustom(null);
              }}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                !custom && range === r.days
                  ? 'bg-ink text-white'
                  : 'text-ink-2 hover:bg-divider'
              }`}
            >
              {r.label}
            </button>
          ))}
          <button
            onClick={() =>
              setCustom({
                from: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
                to: new Date().toISOString().slice(0, 10)
              })
            }
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              custom ? 'bg-ink text-white' : 'text-ink-2 hover:bg-divider'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {custom && (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
          <input
            type="date"
            value={custom.from}
            max={custom.to}
            onChange={(e) => setCustom({ ...custom, from: e.target.value })}
            className="rounded-md border border-neutral-300 px-2 py-1 text-neutral-900"
          />
          <span>to</span>
          <input
            type="date"
            value={custom.to}
            min={custom.from}
            onChange={(e) => setCustom({ ...custom, to: e.target.value })}
            className="rounded-md border border-neutral-300 px-2 py-1 text-neutral-900"
          />
        </div>
      )}

      <p className="mb-2 text-xs text-ink-2">{total.toLocaleString()} total</p>

      {total === 0 ? (
        <p className="text-sm text-ink-2">No data in this range.</p>
      ) : (
        <div className="flex h-24 items-end gap-0.5">
          {displaySeries.map((d) => (
            <div
              key={d.date}
              title={`${d.label}: ${d.value}`}
              className={`flex-1 rounded-t ${colorClass}`}
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
