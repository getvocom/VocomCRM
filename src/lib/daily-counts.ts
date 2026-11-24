// Zero-fills a list of {date, value} points into a complete daily series for the trailing
// `days` window ending today, so gaps show as empty bars instead of missing days. Points
// with the same date are summed. Pass `days: null` for "all time" (from the earliest
// point present, or today if there are none).
export function bucketDaily(points: { date: string; value: number }[], days: number | null) {
  const byDate = new Map<string, number>();
  for (const p of points) {
    const day = p.date.slice(0, 10);
    byDate.set(day, (byDate.get(day) ?? 0) + p.value);
  }

  const today = new Date();
  let start: Date;
  if (days === null) {
    const earliest = points.length > 0 ? points.map((p) => p.date.slice(0, 10)).sort()[0] : today.toISOString().slice(0, 10);
    start = new Date(earliest);
  } else {
    start = new Date(today);
    start.setDate(start.getDate() - (days - 1));
  }

  const series: { date: string; value: number }[] = [];
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, value: byDate.get(key) ?? 0 });
  }
  return series;
}

// Groups dated points into the trailing `weeks` calendar weeks (Monday start, UTC so the
// server render and the browser agree), oldest first. Each bucket is labelled by the date
// its week starts, e.g. "Nov 17".
export function bucketWeekly(points: { date: string; value: number }[], weeks: number) {
  const today = new Date();
  const dayOfWeek = (today.getUTCDay() + 6) % 7; // Monday = 0
  const thisMonday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - dayOfWeek);
  const WEEK_MS = 7 * 86_400_000;
  const firstStart = thisMonday - (weeks - 1) * WEEK_MS;

  const buckets = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(firstStart + i * WEEK_MS);
    return {
      date: start.toISOString().slice(0, 10),
      label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      value: 0
    };
  });

  for (const p of points) {
    const index = Math.floor((new Date(p.date).getTime() - firstStart) / WEEK_MS);
    if (index >= 0 && index < weeks) buckets[index].value += p.value;
  }
  return buckets;
}
