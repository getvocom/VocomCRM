import Link from 'next/link';
import { BarTrend } from '@/components/bar-trend';
import { BreakdownBars } from '@/components/breakdown-bars';
import { computeLeadsOverview } from '@/lib/lead-stats';
import { Pill, StatCard } from '@/components/ui';
import { chartClass } from '@/lib/pill-colors';
import { LEADS_SOURCE_TABS } from '@/lib/lead-tabs';
import { LEAD_STATUSES, type Lead } from '@/lib/types';

const HOT_LIST_LIMIT = 8;

function initials(lead: Lead) {
  const words = (lead.name || lead.company || '?').trim().split(/\s+/);
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// Stored dates are UTC; format them in UTC so a date-only contacted_date doesn't slip a day.
function shortDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function lastTouch(lead: Lead) {
  return lead.contacted_date ? `Contacted ${shortDate(lead.contacted_date)}` : `Added ${shortDate(lead.created_at)}`;
}

export function LeadsOverview({ leads }: { leads: Lead[] }) {
  const stats = computeLeadsOverview(leads);
  const weeklyPoints = leads.map((l) => ({ date: l.created_at, value: 1 }));

  const sourceBreakdown = LEADS_SOURCE_TABS.map((t) => ({
    label: t.label,
    count: leads.filter((l) => l.source === t.source).length,
    colorClass: chartClass(t.source)
  })).sort((a, b) => b.count - a.count);

  const statusBreakdown = LEAD_STATUSES.map((status) => ({
    label: status,
    count: leads.filter((l) => l.status === status).length,
    colorClass: chartClass(status)
  }));

  const hotList = stats.hotNeedingAction.slice(0, HOT_LIST_LIMIT);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total leads"
          value={stats.total.toLocaleString()}
          sub={`+${stats.newThisWeek} this week`}
          tone={stats.newThisWeek > 0 ? 'good' : 'neutral'}
        />
        <StatCard label="Hot leads" value={stats.hotCount.toLocaleString()} sub={`${stats.hotNotContacted} not contacted yet`} />
        <StatCard
          label="Unassigned"
          value={stats.unassigned.toLocaleString()}
          sub={stats.unassigned > 0 ? 'Needs a rep' : 'Every lead has a rep'}
          tone={stats.unassigned > 0 ? 'warn' : 'neutral'}
        />
        <StatCard
          label="Qualified rate"
          value={stats.qualifiedRate === null ? '—' : `${stats.qualifiedRate}%`}
          sub="Last 90 days"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BarTrend title="New leads per week" data={weeklyPoints} colorClass="bg-accent" weeks={12} />
        </div>
        <BreakdownBars
          title="By source"
          items={sourceBreakdown}
          footnote="Cold Email = warm replies flagged by hand. The full send list stays in Instantly Leads."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-5 pb-3 pt-[18px]">
            <h2 className="text-[15px] font-semibold text-ink">Hot leads needing action</h2>
            <Link href="/leads?tab=all&hot=1" className="text-[13px] text-accent hover:text-accent-dark">
              View all{stats.hotNeedingAction.length > HOT_LIST_LIMIT ? ` (${stats.hotNeedingAction.length})` : ''}
            </Link>
          </div>
          {hotList.length === 0 ? (
            <p className="border-t border-divider px-5 py-6 text-sm text-ink-2">
              No hot leads need action right now.
            </p>
          ) : (
            <ul>
              {hotList.map((lead) => (
                <li key={lead.id} className="border-t border-divider">
                  <Link
                    href={`/leads?tab=all&id=${lead.id}`}
                    className="flex items-center gap-3.5 px-5 py-3 hover:bg-panel-2"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pill-blue text-xs font-semibold text-pill-blue-ink">
                      {initials(lead)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {lead.name || lead.company || 'Unnamed lead'}
                      </span>
                      {lead.name && lead.company && (
                        <span className="block truncate text-[13px] text-ink-2">{lead.company}</span>
                      )}
                    </span>
                    <Pill value={lead.source} />
                    <span className="hidden w-32 text-right text-[13px] text-ink-2 sm:block">{lastTouch(lead)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <StatusSplit items={statusBreakdown} />
      </div>
    </div>
  );
}

// Canvas "By status" card: one stacked bar, then a legend with counts.
function StatusSplit({ items }: { items: { label: string; count: number; colorClass: string }[] }) {
  const nonZero = items.filter((i) => i.count > 0);
  return (
    <section className="card p-5">
      <h2 className="mb-[18px] text-[15px] font-semibold text-ink">By status</h2>
      {nonZero.length === 0 ? (
        <p className="text-sm text-ink-2">No data yet.</p>
      ) : (
        <>
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
            {nonZero.map((i) => (
              <div key={i.label} className={i.colorClass} style={{ flex: i.count, minWidth: 4 }} />
            ))}
          </div>
          <ul className="mt-[18px] space-y-2.5">
            {items.map((i) => (
              <li key={i.label} className="flex items-center gap-2.5 text-[13px]">
                <span className={`h-2.5 w-2.5 rounded-[3px] ${i.colorClass}`} aria-hidden="true" />
                <span className="flex-1 text-ink">{i.label}</span>
                <span className="text-ink-2">{i.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
