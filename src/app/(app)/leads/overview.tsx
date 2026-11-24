import Link from 'next/link';
import { BarTrend } from '@/components/bar-trend';
import { BreakdownBars } from '@/components/breakdown-bars';
import { computeLeadsOverview } from '@/lib/lead-stats';
import { STATUS_COLORS } from '@/lib/pill-colors';
import { LEADS_SOURCE_TABS } from '@/lib/lead-tabs';
import { LEAD_STATUSES, type Lead } from '@/lib/types';

const STATUS_BAR_COLORS: Record<string, string> = {
  New: 'bg-neutral-400',
  Contacted: 'bg-blue-500',
  Qualified: 'bg-amber-500',
  Won: 'bg-green-600',
  Lost: 'bg-red-400'
};

const SOURCE_BAR_COLORS: Record<string, string> = {
  Website: 'bg-blue-500',
  'Cold Email': 'bg-orange-500',
  LinkedIn: 'bg-sky-600',
  Referral: 'bg-purple-500',
  'Offline Event': 'bg-teal-600',
  Other: 'bg-neutral-400'
};

const HOT_LIST_LIMIT = 8;

function StatCard({ label, value, sub, subClass = 'text-neutral-500' }: { label: string; value: string; sub: string; subClass?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">{value}</div>
      <div className={`mt-1 text-sm ${subClass}`}>{sub}</div>
    </div>
  );
}

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
    colorClass: SOURCE_BAR_COLORS[t.source]
  })).sort((a, b) => b.count - a.count);

  const statusBreakdown = LEAD_STATUSES.map((status) => ({
    label: status,
    count: leads.filter((l) => l.status === status).length,
    colorClass: STATUS_BAR_COLORS[status]
  }));

  const hotList = stats.hotNeedingAction.slice(0, HOT_LIST_LIMIT);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total leads"
          value={stats.total.toLocaleString()}
          sub={`+${stats.newThisWeek} this week`}
          subClass={stats.newThisWeek > 0 ? 'text-green-700' : 'text-neutral-500'}
        />
        <StatCard label="Hot leads" value={stats.hotCount.toLocaleString()} sub={`${stats.hotNotContacted} not contacted yet`} />
        <StatCard
          label="Unassigned"
          value={stats.unassigned.toLocaleString()}
          sub={stats.unassigned > 0 ? 'Needs a rep' : 'Every lead has a rep'}
          subClass={stats.unassigned > 0 ? 'text-orange-700' : 'text-neutral-500'}
        />
        <StatCard
          label="Qualified rate"
          value={stats.qualifiedRate === null ? '—' : `${stats.qualifiedRate}%`}
          sub="Last 90 days"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BarTrend title="New leads per week" data={weeklyPoints} colorClass="bg-blue-600" weeks={12} />
        </div>
        <BreakdownBars
          title="By source"
          items={sourceBreakdown}
          footnote="Cold Email = warm replies flagged by hand. The full send list stays in Instantly Leads."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between px-4 pb-3 pt-4">
            <h3 className="text-sm font-medium text-neutral-700">Hot leads needing action</h3>
            <Link href="/leads?tab=all&hot=1" className="text-sm text-blue-700 hover:underline">
              View all{stats.hotNeedingAction.length > HOT_LIST_LIMIT ? ` (${stats.hotNeedingAction.length})` : ''}
            </Link>
          </div>
          {hotList.length === 0 ? (
            <p className="border-t border-neutral-100 px-4 py-6 text-sm text-neutral-500">
              No hot leads need action right now.
            </p>
          ) : (
            <ul>
              {hotList.map((lead) => (
                <li key={lead.id} className="border-t border-neutral-100">
                  <Link
                    href={`/leads?tab=all&id=${lead.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-800">
                      {initials(lead)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-neutral-900">
                        {lead.name || lead.company || 'Unnamed lead'}
                      </span>
                      {lead.name && lead.company && (
                        <span className="block truncate text-sm text-neutral-500">{lead.company}</span>
                      )}
                    </span>
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[lead.source] ?? 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {lead.source}
                    </span>
                    <span className="hidden w-32 text-right text-sm text-neutral-500 sm:block">{lastTouch(lead)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <BreakdownBars title="By status" items={statusBreakdown} />
      </div>
    </div>
  );
}
