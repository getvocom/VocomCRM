'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState, useSyncExternalStore, useTransition } from 'react';
import { deleteLead, updateLead } from '@/app/actions';
import { DealSelect } from '@/components/deal-select';
import { DeleteButton } from '@/components/delete-button';
import { HotFlagButton } from '@/components/hot-flag-button';
import { NotesButton } from '@/components/notes-button';
import { RepSelect } from '@/components/rep-select';
import { StatusSelect } from '@/components/status-select';
import { Toast } from '@/components/toast';
import { leadHref } from '@/lib/lead-tabs';
import {
  LEAD_PHASES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  type Deal,
  type Lead,
  type LeadSource,
  type Rep
} from '@/lib/types';
import { useHighlightRow } from '@/lib/use-highlight-row';

// Columns pinned to the left while the table scrolls sideways. The Name column starts
// where the Hot column ends, so these two widths have to match the <td> widths below.
const HOT_COL_WIDTH = 'w-11 min-w-11';
const NAME_COL_LEFT = 'left-11';

// Every column stays in the table; people can hide ones they don't use, per browser.
// Hot, Name and Delete can't be hidden.
const OPTIONAL_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'job_title', label: 'Job Title' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'deal', label: 'Deal' },
  { key: 'notes', label: 'Notes' },
  { key: 'source', label: 'Source' },
  { key: 'priority', label: 'Priority' },
  { key: 'company_size', label: 'Company Size' },
  { key: 'use_case', label: 'Use Case' },
  { key: 'rep', label: 'Assigned Rep' },
  { key: 'phase', label: 'Phase' },
  { key: 'status', label: 'Status' }
] as const;
type ColumnKey = (typeof OPTIONAL_COLUMNS)[number]['key'];

// Hidden columns live in localStorage as a comma-separated list. Read through
// useSyncExternalStore so the server render (everything visible) and the browser agree,
// and every table on the page updates together.
const HIDDEN_COLUMNS_KEY = 'vocom.leadsTable.hiddenColumns';
const HIDDEN_COLUMNS_EVENT = 'vocom:leads-columns';

function subscribeToHiddenColumns(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(HIDDEN_COLUMNS_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(HIDDEN_COLUMNS_EVENT, onChange);
  };
}

function writeHiddenColumns(hidden: Set<string>) {
  window.localStorage.setItem(HIDDEN_COLUMNS_KEY, [...hidden].join(','));
  window.dispatchEvent(new Event(HIDDEN_COLUMNS_EVENT));
}

function matchesQuery(lead: Lead, query: string): boolean {
  const haystack = [lead.name, lead.company, lead.email, lead.job_title, lead.use_case, lead.notes];
  return haystack.some((field) => (field ?? '').toLowerCase().includes(query));
}

function Cell({
  value,
  onChange,
  width = 'w-28'
}: {
  value: string | null;
  onChange: (value: string) => Promise<void>;
  width?: string;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <input
      type="text"
      defaultValue={value ?? ''}
      disabled={isPending}
      onBlur={(e) => {
        if (e.target.value !== (value ?? '')) startTransition(() => onChange(e.target.value));
      }}
      className={`${width} rounded-md border border-neutral-300 px-2 py-1 text-sm text-neutral-900 disabled:opacity-50`}
    />
  );
}

function NameCell({ lead }: { lead: Lead }) {
  return (
    <div className="flex items-center gap-1.5">
      <Cell value={lead.name} onChange={(name) => updateLead(lead.id, { name })} />
      {lead.linkedin_url && (
        <a
          href={lead.linkedin_url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-neutral-400 hover:text-neutral-600"
          title="Open LinkedIn profile"
        >
          🔗
        </a>
      )}
    </div>
  );
}

function DealCell({ lead, deals }: { lead: Lead; deals: Deal[] }) {
  const linkedDeal = lead.deal_id ? deals.find((d) => d.id === lead.deal_id) : null;
  return (
    <div className="flex items-center gap-1.5">
      <DealSelect deals={deals} value={lead.deal_id} onChange={(deal_id) => updateLead(lead.id, { deal_id })} />
      {linkedDeal && (
        <Link
          href={`/deals?id=${linkedDeal.id}`}
          className="text-xs text-neutral-400 hover:text-neutral-600"
          title={`Open ${linkedDeal.customer_name} on Deals`}
        >
          view →
        </Link>
      )}
    </div>
  );
}

const CONTROL = 'rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900';

export function LeadsTable({
  leads,
  reps,
  deals,
  statuses,
  visibleSources,
  initialHotOnly = false
}: {
  leads: Lead[];
  reps: Rep[];
  deals: Deal[];
  statuses: string[];
  // The sources this view lists. Changing a lead's source to anything else moves the row
  // somewhere else — which used to look like the lead had been deleted — so the table
  // says where it went and offers an undo.
  visibleSources?: LeadSource[];
  initialHotOnly?: boolean;
}) {
  const { highlightId, rowProps } = useHighlightRow();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [repFilter, setRepFilter] = useState(''); // '' = all, 'none' = unassigned, else rep id
  const [hotOnly, setHotOnly] = useState(initialHotOnly);
  const [moved, setMoved] = useState<{ id: string; name: string; from: LeadSource; to: LeadSource } | null>(null);
  // Stable, so the toast's auto-dismiss timer doesn't restart on every re-render.
  const dismissMoved = useCallback(() => setMoved(null), []);

  const hiddenRaw = useSyncExternalStore(
    subscribeToHiddenColumns,
    () => window.localStorage.getItem(HIDDEN_COLUMNS_KEY) ?? '',
    () => ''
  );
  const hidden = useMemo(() => new Set(hiddenRaw ? hiddenRaw.split(',') : []), [hiddenRaw]);
  const show = (key: ColumnKey) => !hidden.has(key);
  const visibleColumns = OPTIONAL_COLUMNS.filter((c) => show(c.key));

  function toggleColumn(key: ColumnKey) {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    writeHiddenColumns(next);
  }

  const trimmedQuery = query.trim().toLowerCase();
  const filtersActive = Boolean(trimmedQuery || statusFilter || repFilter || hotOnly);
  const filteredLeads = useMemo(
    () =>
      leads.filter(
        (lead) =>
          (!trimmedQuery || matchesQuery(lead, trimmedQuery)) &&
          (!statusFilter || lead.status === statusFilter) &&
          (!repFilter || (repFilter === 'none' ? !lead.assigned_rep_id : lead.assigned_rep_id === repFilter)) &&
          (!hotOnly || lead.hot)
      ),
    [leads, trimmedQuery, statusFilter, repFilter, hotOnly]
  );

  async function handleSourceChange(lead: Lead, source: LeadSource) {
    const from = lead.source;
    await updateLead(lead.id, { source });
    if (visibleSources && !visibleSources.includes(source)) {
      setMoved({ id: lead.id, name: lead.name || lead.company || 'Lead', from, to: source });
    }
  }

  async function undoMove() {
    if (!moved) return;
    await updateLead(moved.id, { source: moved.from });
    setMoved(null);
  }

  // Rendered whatever else is on screen: moving the last lead off a view empties the
  // table, and that's exactly when the "moved to …" toast matters most.
  const toast = moved && (
    <Toast
      message={`${moved.name} moved to ${moved.to}`}
      href={leadHref(moved.to, moved.id)}
      onUndo={undoMove}
      onDismiss={dismissMoved}
    />
  );

  if (leads.length === 0) {
    return (
      <>
        <p className="text-sm text-neutral-500">No leads yet.</p>
        {toast}
      </>
    );
  }

  const pinnedBg = (id: string) => (id === highlightId ? 'bg-amber-50' : 'bg-white');

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, company, email, job title, use case, notes…"
          aria-label="Search leads"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 sm:w-96"
        />
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={CONTROL}
        >
          <option value="">Status: All</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select aria-label="Filter by rep" value={repFilter} onChange={(e) => setRepFilter(e.target.value)} className={CONTROL}>
          <option value="">Rep: All</option>
          <option value="none">Unassigned</option>
          {reps.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-pressed={hotOnly}
          onClick={() => setHotOnly(!hotOnly)}
          className={`rounded-md border px-2.5 py-1.5 text-sm ${
            hotOnly
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50'
          }`}
        >
          Hot only
        </button>
        {filtersActive && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setStatusFilter('');
              setRepFilter('');
              setHotOnly(false);
            }}
            className="px-1 text-sm text-neutral-500 hover:text-neutral-900 hover:underline"
          >
            Clear
          </button>
        )}
        <div className="flex-1" />
        <span className="text-sm text-neutral-500">
          {filtersActive
            ? `${filteredLeads.length} of ${leads.length} leads`
            : `${leads.length} ${leads.length === 1 ? 'lead' : 'leads'}`}
        </span>
        <details className="relative">
          <summary className={`${CONTROL} cursor-pointer list-none hover:bg-neutral-50`}>
            Columns{hidden.size > 0 ? ` (${hidden.size} hidden)` : ''}
          </summary>
          <div className="absolute right-0 z-40 mt-1 w-56 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
            {OPTIONAL_COLUMNS.map((c) => (
              <label key={c.key} className="flex items-center gap-2 rounded px-2 py-1 text-sm text-neutral-800 hover:bg-neutral-50">
                <input type="checkbox" checked={show(c.key)} onChange={() => toggleColumn(c.key)} />
                {c.label}
              </label>
            ))}
            {hidden.size > 0 && (
              <button
                type="button"
                onClick={() => writeHiddenColumns(new Set())}
                className="mt-1 w-full rounded px-2 py-1 text-left text-sm text-blue-700 hover:bg-neutral-50"
              >
                Show all columns
              </button>
            )}
          </div>
        </details>
      </div>

      {filteredLeads.length === 0 ? (
        <p className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500 shadow-sm">
          {trimmedQuery ? <>No leads match &ldquo;{query.trim()}&rdquo;</> : 'No leads match these filters.'}
        </p>
      ) : (
        <div className="max-h-[70vh] overflow-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="text-neutral-500">
              <tr>
                <th
                  className={`sticky left-0 top-0 z-30 border-b border-neutral-200 bg-neutral-50 px-2 py-3 font-medium ${HOT_COL_WIDTH}`}
                >
                  <span className="sr-only">Hot</span>
                </th>
                <th
                  className={`sticky ${NAME_COL_LEFT} top-0 z-30 border-b border-r border-neutral-200 bg-neutral-50 px-4 py-3 font-medium whitespace-nowrap`}
                >
                  Name
                </th>
                {visibleColumns.map((c) => (
                  <th
                    key={c.key}
                    className="sticky top-0 z-20 border-b border-neutral-200 bg-neutral-50 px-4 py-3 font-medium whitespace-nowrap"
                  >
                    {c.label}
                  </th>
                ))}
                <th className="sticky top-0 z-20 border-b border-neutral-200 bg-neutral-50 px-4 py-3 font-medium">
                  <span className="sr-only">Delete</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} {...rowProps(lead.id)}>
                  <td className={`sticky left-0 z-10 px-2 py-3 ${pinnedBg(lead.id)} ${HOT_COL_WIDTH}`}>
                    <HotFlagButton hot={lead.hot} onToggle={(hot) => updateLead(lead.id, { hot })} />
                  </td>
                  <td
                    className={`sticky ${NAME_COL_LEFT} z-10 border-r border-neutral-200 px-4 py-3 ${pinnedBg(lead.id)}`}
                  >
                    <NameCell lead={lead} />
                  </td>
                  {show('date') && (
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-500">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  )}
                  {show('job_title') && (
                    <td className="px-4 py-3">
                      <Cell value={lead.job_title} onChange={(job_title) => updateLead(lead.id, { job_title })} />
                    </td>
                  )}
                  {show('email') && (
                    <td className="px-4 py-3">
                      <Cell value={lead.email} onChange={(email) => updateLead(lead.id, { email })} width="w-40" />
                    </td>
                  )}
                  {show('phone') && (
                    <td className="px-4 py-3">
                      <Cell value={lead.phone} onChange={(phone) => updateLead(lead.id, { phone })} />
                    </td>
                  )}
                  {show('company') && (
                    <td className="px-4 py-3">
                      <Cell value={lead.company} onChange={(company) => updateLead(lead.id, { company })} />
                    </td>
                  )}
                  {show('deal') && (
                    <td className="px-4 py-3">
                      <DealCell lead={lead} deals={deals} />
                    </td>
                  )}
                  {show('notes') && (
                    <td className="px-4 py-3">
                      <NotesButton
                        title={lead.name || lead.company || 'Lead'}
                        subtitle={lead.company}
                        notes={lead.notes}
                        onSave={(notes) => updateLead(lead.id, { notes })}
                      />
                    </td>
                  )}
                  {show('source') && (
                    <td className="px-4 py-3">
                      <StatusSelect
                        options={LEAD_SOURCES}
                        value={lead.source}
                        onChange={(source) => handleSourceChange(lead, source as LeadSource)}
                      />
                    </td>
                  )}
                  {show('priority') && (
                    <td className="px-4 py-3">
                      <StatusSelect
                        options={LEAD_PRIORITIES}
                        value={lead.priority ?? 'Medium'}
                        onChange={(priority) => updateLead(lead.id, { priority: priority as Lead['priority'] })}
                      />
                    </td>
                  )}
                  {show('company_size') && (
                    <td className="px-4 py-3">
                      <Cell
                        value={lead.company_size}
                        onChange={(company_size) => updateLead(lead.id, { company_size })}
                        width="w-20"
                      />
                    </td>
                  )}
                  {show('use_case') && (
                    <td className="px-4 py-3">
                      <Cell value={lead.use_case} onChange={(use_case) => updateLead(lead.id, { use_case })} />
                    </td>
                  )}
                  {show('rep') && (
                    <td className="px-4 py-3">
                      <RepSelect
                        reps={reps}
                        value={lead.assigned_rep_id}
                        onChange={(repId) => updateLead(lead.id, { assigned_rep_id: repId })}
                      />
                    </td>
                  )}
                  {show('phase') && (
                    <td className="px-4 py-3">
                      <StatusSelect
                        options={['Unassigned', ...LEAD_PHASES]}
                        value={lead.phase ?? 'Unassigned'}
                        onChange={(phase) =>
                          updateLead(lead.id, { phase: phase === 'Unassigned' ? null : (phase as Lead['phase']) })
                        }
                      />
                    </td>
                  )}
                  {show('status') && (
                    <td className="px-4 py-3">
                      <StatusSelect
                        options={statuses}
                        value={lead.status}
                        onChange={(status) => updateLead(lead.id, { status: status as Lead['status'] })}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <DeleteButton onDelete={() => deleteLead(lead.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast}
    </div>
  );
}
