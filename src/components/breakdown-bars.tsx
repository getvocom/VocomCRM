export function BreakdownBars({
  title,
  items,
  footnote
}: {
  title: string;
  items: { label: string; count: number; colorClass?: string }[];
  footnote?: string;
}) {
  const total = items.reduce((sum, i) => sum + i.count, 0) || 1;
  const nonZero = items.filter((i) => i.count > 0);

  return (
    <section className="card p-5">
      <h2 className="mb-[18px] text-[15px] font-semibold text-ink">{title}</h2>
      {nonZero.length === 0 ? (
        <p className="text-sm text-ink-2">No data yet.</p>
      ) : (
        <div className="space-y-3.5">
          {nonZero.map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex justify-between text-[13px] text-ink">
                <span>{item.label}</span>
                <span className="text-ink-2">{item.count.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-divider">
                <div
                  className={`h-2 rounded-full ${item.colorClass ?? 'bg-ink'}`}
                  style={{ width: `${(item.count / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {footnote && <p className="mt-[18px] text-xs leading-relaxed text-ink-2">{footnote}</p>}
    </section>
  );
}
