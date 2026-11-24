import { formatCompact } from '@/lib/format';

export interface ValueBreakdownItem {
  label: string;
  value: number;
  count?: number;
  colorClass?: string; // a solid bar fill, e.g. chartClass('Won') from lib/pill-colors
}

const DEFAULT_COLOR = 'bg-chart-grey';

export function ValueBreakdown({ title, items }: { title: string; items: ValueBreakdownItem[] }) {
  const totalValue = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="card p-5">
      <h2 className="mb-[18px] text-[15px] font-semibold leading-snug text-ink">{title}</h2>
      {items.length === 0 || totalValue === 0 ? (
        <p className="text-sm text-ink-2">No data to show.</p>
      ) : (
        <div className="space-y-3.5">
          {items.map((item) => {
            const widthPct = Math.max((item.value / totalValue) * 100, item.value > 0 ? 3 : 0);
            return (
              <div key={item.label}>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-[13px]">
                  <span className="text-ink">{item.label}</span>
                  <span className="tabular-nums text-ink-2">
                    {formatCompact(item.value)}
                    {item.count !== undefined && (
                      <>
                        {' '}
                        · {item.count} deal{item.count === 1 ? '' : 's'}
                      </>
                    )}
                  </span>
                </div>
                {/* The amount is in the row header above, so the bar carries no label. */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-divider">
                  <div
                    className={`h-2 rounded-full ${item.colorClass ?? DEFAULT_COLOR} transition-all`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
