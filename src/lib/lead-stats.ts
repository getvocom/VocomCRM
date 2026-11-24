import type { Lead } from './types';

const DAY_MS = 86_400_000;

// Numbers for the Leads → Overview tab, all computed from the rows the page already loads.
// Definitions (confirm against real data — see the brief's open question):
//   - "this week" = created in the last 7 days
//   - "not contacted yet" = status still New
//   - Unassigned = no assigned rep
//   - Qualified rate = of leads created in the last 90 days, the share now Qualified or Won
//   - "needing action" = hot, and not already Won or Lost
export function computeLeadsOverview(leads: Lead[], now: number = Date.now()) {
  const createdAt = (l: Lead) => new Date(l.created_at).getTime();

  const hot = leads.filter((l) => l.hot);
  const recent = leads.filter((l) => createdAt(l) >= now - 90 * DAY_MS);
  const qualified = recent.filter((l) => l.status === 'Qualified' || l.status === 'Won').length;

  return {
    total: leads.length,
    newThisWeek: leads.filter((l) => createdAt(l) >= now - 7 * DAY_MS).length,
    hotCount: hot.length,
    hotNotContacted: hot.filter((l) => l.status === 'New').length,
    unassigned: leads.filter((l) => !l.assigned_rep_id).length,
    qualifiedRate: recent.length > 0 ? Math.round((qualified / recent.length) * 100) : null,
    hotNeedingAction: hot
      .filter((l) => l.status !== 'Won' && l.status !== 'Lost')
      .sort((a, b) => createdAt(b) - createdAt(a))
  };
}
