'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { deleteInstantlyLead, updateInstantlyLead } from '@/app/actions';
import { DeleteButton } from '@/components/delete-button';
import { RepSelect } from '@/components/rep-select';
import { StatusSelect } from '@/components/status-select';
import { LastContactCell } from '@/components/last-contact';
import { latestContact, type LastContactMap } from '@/lib/email-activity';
import type { InstantlyLead, Rep } from '@/lib/types';
import { CAMPAIGN_STATUS_FILTERS, INTEREST_FILTERS, SEQUENCE_STATUS_FILTERS } from './constants';

const INTEREST_COLORS: Record<string, string> = {
  Interested: 'bg-pill-green text-pill-green-ink',
  'Meeting Booked': 'bg-pill-purple text-pill-purple-ink',
  'Meeting Completed': 'bg-pill-purple text-pill-purple-ink',
  Won: 'bg-pill-green text-pill-green-ink',
  'Out of Office': 'bg-pill-amber text-pill-amber-ink',
  'Not Interested': 'bg-pill-red text-pill-red-ink',
  'Wrong Person': 'bg-pill-red text-pill-red-ink',
  Lost: 'bg-pill-red text-pill-red-ink',
  'No Show': 'bg-pill-red text-pill-red-ink',
  'No Reply Yet': 'bg-divider text-ink-2'
};

const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  Active: 'bg-pill-green text-pill-green-ink',
  Paused: 'bg-pill-amber text-pill-amber-ink',
  Completed: 'bg-divider text-ink-2',
  'Running Subsequences': 'bg-pill-blue text-pill-blue-ink',
  Draft: 'bg-divider text-ink-2',
  'Accounts Unhealthy': 'bg-pill-red text-pill-red-ink',
  'Bounce Protect': 'bg-pill-red text-pill-red-ink',
  'Account Suspended': 'bg-pill-red text-pill-red-ink'
};

// Combines sequence_status with whether the lead has been emailed yet into one label —
// "yet to start / in the middle / completed the flow" is what reps actually want to see
// per lead, not the raw Instantly enum.
function sequenceStage(lead: InstantlyLead): { label: string; colorClass: string } {
  switch (lead.sequence_status) {
    case 'Bounced':
      return { label: 'Bounced', colorClass: 'bg-pill-red text-pill-red-ink' };
    case 'Unsubscribed':
      return { label: 'Unsubscribed', colorClass: 'bg-pill-red text-pill-red-ink' };
    case 'Skipped':
      return { label: 'Skipped', colorClass: 'bg-divider text-ink-2' };
    case 'Paused':
      return { label: 'Paused', colorClass: 'bg-pill-amber text-pill-amber-ink' };
    case 'Completed':
      return { label: 'Sequence complete', colorClass: 'bg-divider text-ink-2' };
    default:
      if (!lead.last_contacted_at) return { label: 'Not started', colorClass: 'bg-divider text-ink-2' };
      return { label: 'In progress', colorClass: 'bg-pill-blue text-pill-blue-ink' };
  }
}

function ReplyModal({ lead, onClose }: { lead: InstantlyLead; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-panel p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-ink">{lead.name || lead.email}</h3>
            <p className="text-xs text-ink-2">
              {lead.company} · {lead.campaign}
              {lead.last_reply_at ? ` · ${new Date(lead.last_reply_at).toLocaleString()}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-ink-2 hover:text-ink-3">
            ✕
          </button>
        </div>
        {lead.reply_phone && (
          <p className="mb-3 rounded-md bg-pill-red px-2 py-1 text-sm font-medium text-pill-red-ink">
            📞 {lead.reply_phone} — extracted from the reply below, double check it&apos;s correct
          </p>
        )}
        {lead.alternative_email && (
          <p className="mb-3 rounded-md bg-pill-amber px-2 py-1 text-sm font-medium text-pill-amber-ink">
            ✉️ {lead.alternative_email} — other contact email(s) mentioned in the reply
          </p>
        )}
        <p className="whitespace-pre-wrap text-sm text-ink-3">{lead.reply_text}</p>
      </div>
    </div>
  );
}

interface Summary {
  total: number;
  activeCampaigns: number;
  completedCampaigns: number;
  notStarted: number;
  awaitingReply: number;
  replied: number;
  sequenceCompleteNoReply: number;
}

export function InstantlyLeadsTable({
  lastContacts,
  leads,
  reps,
  statuses,
  filter,
  campaignStatus,
  sequenceStatus,
  coldCallOnly,
  notStartedOnly,
  sort,
  highlightId,
  page,
  pageSize,
  totalCount,
  coldCallCount,
  filterCounts,
  summary
}: {
  // Latest synced email (Gmail) per lowercase address.
  lastContacts: LastContactMap;
  leads: InstantlyLead[];
  reps: Rep[];
  statuses: string[];
  filter: string;
  campaignStatus: string;
  sequenceStatus: string;
  coldCallOnly: boolean;
  notStartedOnly: boolean;
  sort: string;
  highlightId: string | null;
  page: number;
  pageSize: number;
  totalCount: number;
  coldCallCount: number;
  filterCounts: Record<string, number>;
  summary: Summary;
}) {
  const [openReply, setOpenReply] = useState<InstantlyLead | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const hasActiveFilters =
    filter !== 'All' || campaignStatus !== 'All' || sequenceStatus !== 'All' || coldCallOnly || notStartedOnly;

  const baseParams = new URLSearchParams();
  if (filter !== 'All') baseParams.set('filter', filter);
  if (campaignStatus !== 'All') baseParams.set('campaignStatus', campaignStatus);
  if (sequenceStatus !== 'All') baseParams.set('sequenceStatus', sequenceStatus);
  if (coldCallOnly) baseParams.set('coldCall', '1');
  if (notStartedOnly) baseParams.set('notStarted', '1');
  if (sort !== 'synced') baseParams.set('sort', sort);

  const interestHref = (f: string) => {
    const params = new URLSearchParams(baseParams);
    if (f === 'All') params.delete('filter');
    else params.set('filter', f);
    return `?${params.toString()}`;
  };
  const coldCallHref = (() => {
    const params = new URLSearchParams(baseParams);
    if (coldCallOnly) params.delete('coldCall');
    else params.set('coldCall', '1');
    return `?${params.toString()}`;
  })();
  const notStartedHref = (() => {
    const params = new URLSearchParams(baseParams);
    if (notStartedOnly) params.delete('notStarted');
    else params.set('notStarted', '1');
    return `?${params.toString()}`;
  })();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageHref = (p: number) => {
    const params = new URLSearchParams(baseParams);
    params.set('page', String(p));
    return `?${params.toString()}`;
  };

  function navigateWith(key: string, value: string) {
    const params = new URLSearchParams(baseParams);
    if (value === 'All') params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const tiles: { label: string; count: number; hint?: string }[] = [
    { label: 'Total Leads', count: summary.total },
    { label: 'In Active Campaigns', count: summary.activeCampaigns },
    { label: 'In Completed Campaigns', count: summary.completedCampaigns },
    { label: 'Not Started Yet', count: summary.notStarted },
    { label: 'Awaiting Reply', count: summary.awaitingReply },
    {
      label: 'Sequence Done, No Reply',
      count: summary.sequenceCompleteNoReply,
      hint: "A lead's own sequence can finish while their campaign is still Active (other leads in it are still mid-sequence) — so this is often bigger than \"In Completed Campaigns\", which only counts campaigns that are entirely done."
    },
    { label: 'Replied', count: summary.replied }
  ];

  return (
    <div>
      {highlightId && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-line bg-pill-blue px-4 py-2 text-sm text-ink-3">
          <span>Showing 1 lead from a notification.</span>
          <Link href={pathname} className="font-medium text-accent hover:underline">
            View all leads
          </Link>
        </div>
      )}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-line bg-panel p-3">
            <p className="text-xs text-ink-2">
              {tile.label}
              {tile.hint && (
                <span className="ml-1 cursor-help text-ink-2" title={tile.hint}>
                  ⓘ
                </span>
              )}
            </p>
            <p className="mt-1 text-xl font-semibold text-ink">{tile.count}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-ink-2">
          Campaign
          <select
            value={campaignStatus}
            onChange={(e) => navigateWith('campaignStatus', e.target.value)}
            className="rounded-md border border-line px-2 py-1 text-xs text-ink-3"
          >
            {CAMPAIGN_STATUS_FILTERS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-ink-2">
          Sequence
          <select
            value={sequenceStatus}
            onChange={(e) => navigateWith('sequenceStatus', e.target.value)}
            className="rounded-md border border-line px-2 py-1 text-xs text-ink-3"
          >
            {SEQUENCE_STATUS_FILTERS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <Link
          href={notStartedHref}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            notStartedOnly
              ? 'bg-ink text-white'
              : 'bg-panel text-ink-3 ring-1 ring-inset ring-line hover:bg-divider'
          }`}
        >
          Not Started Yet ({summary.notStarted})
        </Link>
        <span className="mx-1 h-4 w-px bg-line" />
        <label className="flex items-center gap-1.5 text-xs text-ink-2">
          Sort by
          <select
            value={sort}
            onChange={(e) => navigateWith('sort', e.target.value === 'active' ? 'active' : 'synced')}
            className="rounded-md border border-line px-2 py-1 text-xs text-ink-3"
          >
            <option value="synced">Recently Synced</option>
            <option value="active">Most Recently Active</option>
          </select>
        </label>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {INTEREST_FILTERS.map((f) => (
          <Link
            key={f}
            href={interestHref(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === f
                ? 'bg-ink text-white'
                : 'bg-panel text-ink-3 ring-1 ring-inset ring-line hover:bg-divider'
            }`}
          >
            {f} ({filterCounts[f] ?? 0})
          </Link>
        ))}
        <span className="mx-1 h-4 w-px bg-line" />
        <Link
          href={coldCallHref}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            coldCallOnly
              ? 'bg-pill-red-ink text-white'
              : 'bg-panel text-pill-red-ink ring-1 ring-inset ring-pill-red hover:bg-pill-red'
          }`}
        >
          📞 Needs Cold Call ({coldCallCount})
        </Link>
      </div>
      <p className="mb-4 text-xs text-ink-2">
        &quot;No Reply Yet&quot; is Instantly&apos;s own interest classification and includes
        both leads still waiting on a reply <em>and</em> leads not yet contacted — use{' '}
        <strong>Not Started Yet</strong> / <strong>Awaiting Reply</strong> above to tell them
        apart.
      </p>

      {hasActiveFilters && (
        <p className="mb-3 text-sm text-ink-3">
          <span className="font-semibold text-ink">{totalCount.toLocaleString()}</span> of{' '}
          {summary.total.toLocaleString()} leads match these filters
        </p>
      )}

      {leads.length === 0 ? (
        <p className="text-sm text-ink-2">No leads match this filter.</p>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Reply</th>
                <th>Campaign</th>
                <th>Sequence</th>
                <th>Last Activity</th>
                <th>Last Email</th>
                <th>Interest</th>
                <th>Assigned Rep</th>
                <th>Sales Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className={lead.needs_cold_call ? 'bg-pill-red/50' : undefined}>
                  <td className="text-ink">
                    {lead.linkedin_url ? (
                      <a
                        href={lead.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {lead.name || lead.email}
                      </a>
                    ) : (
                      lead.name || lead.email
                    )}
                  </td>
                  <td className="text-ink-3">{lead.company || '—'}</td>
                  <td className="text-ink-3">
                    {lead.email}
                    {lead.alternative_email && (
                      <button
                        onClick={() => setOpenReply(lead)}
                        className="mt-0.5 block text-xs font-medium text-pill-amber-ink hover:underline"
                        title="Other email(s) mentioned in their reply"
                      >
                        ✉️ {lead.alternative_email}
                      </button>
                    )}
                  </td>
                  <td>
                    {lead.reply_phone ? (
                      <button
                        onClick={() => setOpenReply(lead)}
                        className="rounded-md bg-pill-red px-2 py-1 font-medium text-pill-red-ink hover:bg-pill-red"
                      >
                        📞 {lead.reply_phone}
                      </button>
                    ) : (
                      <span className="text-ink-3">{lead.phone || '—'}</span>
                    )}
                  </td>
                  <td className="text-ink-3">
                    {lead.reply_text ? (
                      <button
                        onClick={() => setOpenReply(lead)}
                        className="rounded-md bg-divider px-2 py-1 text-xs font-medium text-ink-3 hover:bg-line"
                      >
                        View reply
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="max-w-[160px] px-4 py-3 text-ink-2">
                    <p className="truncate" title={lead.campaign ?? ''}>
                      {lead.campaign || '—'}
                    </p>
                    {lead.campaign_status && (
                      <span
                        className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                          CAMPAIGN_STATUS_COLORS[lead.campaign_status] ?? 'bg-divider text-ink-2'
                        }`}
                      >
                        {lead.campaign_status}
                      </span>
                    )}
                  </td>
                  <td>
                    {(() => {
                      const stage = sequenceStage(lead);
                      return (
                        <span className={`rounded-md px-2 py-1 text-xs font-medium ${stage.colorClass}`}>
                          {stage.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-2">
                    {lead.last_reply_at ? new Date(lead.last_reply_at).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    {(() => {
                      const emails = [lead.email, ...(lead.alternative_email?.split(/[,;\s]+/) ?? [])].filter(Boolean);
                      return (
                        <LastContactCell
                          contact={latestContact(lastContacts, emails)}
                          emails={emails}
                          title={lead.name || lead.email}
                        />
                      );
                    })()}
                  </td>
                  <td>
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-medium ${
                        INTEREST_COLORS[lead.interest_status] ?? 'bg-divider text-ink-3'
                      }`}
                    >
                      {lead.interest_status}
                    </span>
                  </td>
                  <td>
                    <RepSelect
                      reps={reps}
                      value={lead.assigned_rep_id}
                      onChange={(repId) => updateInstantlyLead(lead.id, { assigned_rep_id: repId })}
                    />
                  </td>
                  <td>
                    <StatusSelect
                      options={statuses}
                      value={lead.sales_status}
                      onChange={(status) =>
                        updateInstantlyLead(lead.id, {
                          sales_status: status as InstantlyLead['sales_status']
                        })
                      }
                    />
                  </td>
                  <td>
                    <DeleteButton onDelete={() => deleteInstantlyLead(lead.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-divider px-4 py-3 text-sm text-ink-2">
            <span>
              {totalCount === 0
                ? '0 results'
                : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount}`}
            </span>
            <div className="flex gap-2">
              <Link
                href={pageHref(Math.max(1, page - 1))}
                aria-disabled={page <= 1}
                className={`rounded-md px-3 py-1 ring-1 ring-inset ring-line ${
                  page <= 1 ? 'pointer-events-none text-ink-2/50' : 'hover:bg-divider'
                }`}
              >
                Previous
              </Link>
              <Link
                href={pageHref(Math.min(totalPages, page + 1))}
                aria-disabled={page >= totalPages}
                className={`rounded-md px-3 py-1 ring-1 ring-inset ring-line ${
                  page >= totalPages ? 'pointer-events-none text-ink-2/50' : 'hover:bg-divider'
                }`}
              >
                Next
              </Link>
            </div>
          </div>
        </div>
      )}

      {openReply && <ReplyModal lead={openReply} onClose={() => setOpenReply(null)} />}
    </div>
  );
}
