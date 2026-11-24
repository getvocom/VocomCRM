const COLORS: Record<string, string> = {
  Interested: 'bg-chart-green',
  'Meeting Booked': 'bg-chart-purple',
  'Meeting Completed': 'bg-chart-purple',
  Won: 'bg-chart-green',
  'Out of Office': 'bg-chart-amber',
  'Not Interested': 'bg-chart-red',
  'Wrong Person': 'bg-chart-red',
  Lost: 'bg-chart-red',
  'No Show': 'bg-chart-red',
  'No Reply Yet': 'bg-chart-grey'
};

export function InterestBreakdown({ counts }: { counts: { label: string; count: number }[] }) {
  const total = counts.reduce((sum, c) => sum + c.count, 0) || 1;
  const nonZero = counts.filter((c) => c.count > 0);

  return (
    <div className="card p-5">
      <h3 className="mb-3 text-sm font-medium text-ink-3">Instantly leads by status</h3>
      {nonZero.length === 0 ? (
        <p className="text-sm text-ink-2">No leads yet.</p>
      ) : (
        <div className="space-y-2">
          {nonZero.map((c) => (
            <div key={c.label}>
              <div className="mb-0.5 flex justify-between text-xs text-ink-3">
                <span>{c.label}</span>
                <span className="text-ink-2">{c.count}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-divider">
                <div
                  className={`h-2 rounded-full ${COLORS[c.label] ?? 'bg-chart-grey'}`}
                  style={{ width: `${(c.count / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
