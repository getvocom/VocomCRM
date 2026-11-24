import Link from 'next/link';
import { formatCompact } from '@/lib/format';
import { stageOf } from '@/lib/opportunities';
import { createClient } from '@/lib/supabase/server';
import { MARKETING_SOURCES, type Deal, type DealSource, type Lead } from '@/lib/types';

// How many leads and deals marketing has produced in a period, and what they are worth.
// Marketing = the Website form, LinkedIn outreach and Instantly (cold email). Everything else
// (referrals, research, events, other) is shown separately so it never inflates the number.

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 0, label: 'All time' }
];

// Instantly interest labels that mean the prospect is genuinely engaged.
const POSITIVE_INTEREST = ['Interested', 'Meeting Booked', 'Meeting Completed', 'Won'];
const CHANNELS: (DealSource | 'Unattributed')[] = [
  'Website',
  'LinkedIn',
  'Instantly',
  'Referral',
  'Research',
  'Offline Event',
  'Other',
  'Unattributed'
];
const STALE_FORM_DAYS = 7;

function cutoffFor(days: number): Date | null {
  return days > 0 ? new Date(new Date().getTime() - days * 86400000) : null;
}

function daysSince(iso: string): number {
  return Math.floor((new Date().getTime() - new Date(iso).getTime()) / 86400000);
}

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

type LeadRow = Pick<Lead, 'id' | 'name' | 'company' | 'source' | 'status' | 'created_at' | 'deal_id' | 'use_case'>;

// The website sends newsletter sign-ups to the CRM too; they are not sales enquiries.
const isNewsletter = (l: { use_case: string | null }) => l.use_case === 'Newsletter sign-up';

export default async function MarketingResultsPage({
  searchParams
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const parsed = Number(daysParam);
  const days = RANGES.some((r) => r.days === parsed) && daysParam !== undefined ? parsed : 14;
  const cutoff = cutoffFor(days);
  const cutoffIso = cutoff?.toISOString() ?? null;
  const cutoffDate = cutoffIso?.slice(0, 10) ?? null;

  const supabase = await createClient();

  let leadsQuery = supabase
    .from('website_leads')
    .select('id, name, company, source, status, created_at, deal_id, use_case')
    .order('created_at', { ascending: false });
  if (cutoffIso) leadsQuery = leadsQuery.gte('created_at', cutoffIso);

  let repliesQuery = supabase
    .from('instantly_leads')
    .select('id, name, company, campaign, interest_status, last_reply_at')
    .not('last_reply_at', 'is', null)
    .order('last_reply_at', { ascending: false });
  if (cutoffIso) repliesQuery = repliesQuery.gte('last_reply_at', cutoffIso);

  const [{ data: leads }, { data: replies }, { data: deals }, { data: linked }, { data: lastForm }] = await Promise.all([
    leadsQuery.returns<LeadRow[]>(),
    repliesQuery,
    supabase.from('deals').select('*').order('start_date', { ascending: false }).returns<Deal[]>(),
    supabase.from('website_leads').select('source, deal_id').not('deal_id', 'is', null),
    // Rows created by the website-form webhook carry the raw payload; manual entries don't.
    supabase
      .from('website_leads')
      .select('created_at')
      .not('raw_payload', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
  ]);

  // A deal's channel is its own source, else the source of a lead linked to it.
  const linkedSource = new Map<string, string>();
  (linked ?? []).forEach((l) => l.deal_id && linkedSource.set(l.deal_id as string, l.source as string));
  const channelOf = (d: Deal): DealSource | 'Unattributed' =>
    (d.source ?? (linkedSource.get(d.id) as DealSource | undefined) ?? 'Unattributed') as DealSource | 'Unattributed';

  const newsletterCount = (leads ?? []).filter(isNewsletter).length;
  const enquiries = (leads ?? []).filter((l) => !isNewsletter(l));

  const periodDeals = (deals ?? []).filter((d) => !cutoffDate || d.start_date >= cutoffDate);
  const counted = (d: Deal) => stageOf(d) !== 'Lost';

  const rows = CHANNELS.map((channel) => {
    const chLeads = enquiries.filter((l) => l.source === channel);
    const chReplies = channel === 'Instantly' ? replies ?? [] : [];
    const chDeals = periodDeals.filter((d) => channelOf(d) === channel);
    const live = chDeals.filter(counted);
    return {
      channel,
      leads: channel === 'Instantly' ? chReplies.length : chLeads.length,
      engaged:
        channel === 'Instantly'
          ? chReplies.filter((r) => POSITIVE_INTEREST.includes(r.interest_status as string)).length
          : chLeads.filter((l) => l.status === 'Qualified' || l.status === 'Won').length,
      deals: chDeals.length,
      value: live.reduce((s, d) => s + d.value, 0),
      priced: live.filter((d) => d.value > 0).length,
      unpriced: live.filter((d) => d.value <= 0).length
    };
  }).filter((r) => r.leads > 0 || r.deals > 0 || MARKETING_SOURCES.includes(r.channel as DealSource));

  const marketing = rows.filter((r) => MARKETING_SOURCES.includes(r.channel as DealSource));
  const sum = (key: 'leads' | 'engaged' | 'deals' | 'value' | 'unpriced') => marketing.reduce((s, r) => s + r[key], 0);
  const marketingDeals = periodDeals.filter((d) => MARKETING_SOURCES.includes(channelOf(d) as DealSource));

  const formDays = lastForm?.[0] ? daysSince(lastForm[0].created_at as string) : null;
  const formQuiet = formDays === null || formDays >= STALE_FORM_DAYS;

  const leadFeed = [
    ...enquiries
      .filter((l) => MARKETING_SOURCES.includes(l.source as DealSource))
      .map((l) => ({ key: `w-${l.id}`, when: l.created_at, channel: l.source as string, who: l.name, company: l.company, status: l.status as string })),
    ...(replies ?? []).map((r) => ({
      key: `i-${r.id}`,
      when: r.last_reply_at as string,
      channel: 'Instantly',
      who: r.name as string | null,
      company: r.company as string | null,
      status: r.interest_status as string
    }))
  ]
    .sort((a, b) => b.when.localeCompare(a.when))
    .slice(0, 60);

  const rangeLabel = RANGES.find((r) => r.days === days)?.label ?? `${days} days`;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Marketing Results</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Leads and deals that came from marketing (website form, LinkedIn outreach, Instantly cold email) and what they
        are worth. Deal value is the quoted price; deals with no price yet are counted but shown as not yet priced.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <Link
            key={r.days}
            href={`/marketing-results?days=${r.days}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              r.days === days ? 'border-vocom bg-vocom text-white' : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400'
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      {formQuiet && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {formDays === null
            ? 'No website form submission has ever reached the CRM.'
            : `The last website form submission reached the CRM ${formDays} days ago (${day(lastForm![0].created_at as string)}).`}{' '}
          If the site is still getting traffic, check that its contact form is sending to the CRM (the website form function and its
          shared secret). Leads typed in by hand or from email are not counted here.
        </div>
      )}

      <div className="mb-2 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Tile label={`Marketing leads (${rangeLabel})`} value={String(sum('leads'))} sub={`${sum('engaged')} engaged or qualified`} />
        <Tile label="Marketing deals" value={String(sum('deals'))} sub={`${sum('unpriced')} not yet priced`} />
        <Tile
          label="Quoted value from marketing"
          value={formatCompact(sum('value'))}
          title={money(sum('value'))}
          sub="excludes lost deals"
        />
        <Tile
          label="Website form (last)"
          value={formDays === null ? 'never' : formDays === 0 ? 'today' : `${formDays}d ago`}
          sub={formQuiet ? 'check the form connection' : 'form is delivering'}
          warn={formQuiet}
        />
      </div>

      <p className="mb-6 text-xs text-neutral-400">
        {newsletterCount} newsletter sign-up{newsletterCount === 1 ? '' : 's'} in this period, counted separately and not included as leads.
      </p>

      <h2 className="mb-2 text-sm font-semibold text-neutral-700">By channel ({rangeLabel})</h2>
      <div className="mb-8 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">Leads</th>
              <th className="px-4 py-3 font-medium">Engaged</th>
              <th className="px-4 py-3 font-medium">Deals</th>
              <th className="px-4 py-3 text-right font-medium">Quoted value</th>
              <th className="px-4 py-3 font-medium">Priced</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((r) => {
              const isMarketing = MARKETING_SOURCES.includes(r.channel as DealSource);
              return (
                <tr key={r.channel} className={isMarketing ? '' : 'text-neutral-500'}>
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {r.channel}
                    {!isMarketing && <span className="ml-2 text-xs font-normal text-neutral-400">not marketing</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.leads}
                    {r.channel === 'Instantly' && <span className="ml-1 text-xs text-neutral-400">replies</span>}
                  </td>
                  <td className="px-4 py-3">{r.engaged}</td>
                  <td className="px-4 py-3">{r.deals}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.value ? money(r.value) : '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {r.priced} priced{r.unpriced ? `, ${r.unpriced} not yet` : ''}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-neutral-50 font-semibold text-neutral-900">
              <td className="px-4 py-3">Marketing total</td>
              <td className="px-4 py-3">{sum('leads')}</td>
              <td className="px-4 py-3">{sum('engaged')}</td>
              <td className="px-4 py-3">{sum('deals')}</td>
              <td className="px-4 py-3 text-right font-mono">{sum('value') ? money(sum('value')) : '—'}</td>
              <td className="px-4 py-3" />
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 text-sm font-semibold text-neutral-700">Deals from marketing ({rangeLabel})</h2>
      {marketingDeals.length === 0 ? (
        <p className="mb-8 text-sm text-neutral-500">No marketing deals in this period.</p>
      ) : (
        <div className="mb-8 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Deal</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 text-right font-medium">Quoted value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {marketingDeals.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 text-neutral-900">
                    <Link href={`/deals`} className="font-medium hover:underline">
                      {d.title || d.product || d.customer_name}
                    </Link>
                    <span className="block text-xs text-neutral-400">{d.company ?? d.customer_name}</span>
                  </td>
                  <td className="px-4 py-3">{channelOf(d)}</td>
                  <td className="px-4 py-3">{stageOf(d)}</td>
                  <td className="px-4 py-3 text-neutral-500">{day(d.start_date)}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {d.value > 0 ? money(d.value) : <span className="font-sans text-neutral-400">not yet priced</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-2 text-sm font-semibold text-neutral-700">Marketing leads ({rangeLabel})</h2>
      {leadFeed.length === 0 ? (
        <p className="text-sm text-neutral-500">No marketing leads in this period.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {leadFeed.map((l) => (
                <tr key={l.key}>
                  <td className="px-4 py-3 text-neutral-500">{day(l.when)}</td>
                  <td className="px-4 py-3">{l.channel}</td>
                  <td className="px-4 py-3 text-neutral-900">{l.who ?? '—'}</td>
                  <td className="px-4 py-3">{l.company ?? '—'}</td>
                  <td className="px-4 py-3">{l.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, sub, title, warn }: { label: string; value: string; sub?: string; title?: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-neutral-500">{label}</p>
      <p
        className={`mt-1 truncate text-2xl font-semibold sm:text-3xl ${warn ? 'text-amber-600' : 'text-neutral-900'}`}
        title={title ?? value}
      >
        {value}
      </p>
      {sub && <p className={`mt-0.5 text-xs ${warn ? 'text-amber-600' : 'text-neutral-400'}`}>{sub}</p>}
    </div>
  );
}
