import { chartClass } from '@/lib/pill-colors';
import { DEAL_PIPELINE_STATUSES, type Deal } from '@/lib/types';

function currency(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

export function StatusBreakdown({ deals }: { deals: Deal[] }) {
  if (deals.length === 0) {
    return <p className="text-sm text-ink-2">No deals yet — add one below.</p>;
  }

  const byStatus = DEAL_PIPELINE_STATUSES.map((status) => {
    const rows = deals.filter((d) => d.status === status);
    return { status, count: rows.length, value: rows.reduce((sum, d) => sum + d.value, 0) };
  });
  const totalValue = byStatus.reduce((sum, s) => sum + s.value, 0) || 1;

  return (
    <div className="card p-5">
      <h3 className="mb-3 text-sm font-medium text-ink-3">Pipeline by Status</h3>
      <div className="space-y-3">
        {byStatus.map(({ status, count, value }) => {
          const bgClass = chartClass(status);
          const widthPct = Math.max((value / totalValue) * 100, value > 0 ? 3 : 0);
          return (
            <div key={status}>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span className="font-medium text-ink-3">{status}</span>
                <span className="whitespace-nowrap text-ink-2">
                  {currency(value)}{' '}
                  <span className="text-ink-2">
                    · {count} deal{count === 1 ? '' : 's'}
                  </span>
                </span>
              </div>
              {/* The amount is in the row header above, so the bar carries no label. */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-divider">
                <div className={`h-2 rounded-full ${bgClass} transition-all`} style={{ width: `${widthPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
