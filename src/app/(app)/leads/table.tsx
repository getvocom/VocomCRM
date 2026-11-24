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
const HOT_COL_WIDTH = 'w-12 min-w-12';
const NAME_COL_LEFT = 'left-12';

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
// Columns whose cells are inline text fields: headers get the same left inset so they line up.
const INPUT_COLUMNS = new Set<ColumnKey>(['job_title', 'email', 'phone', 'company', 'company_size', 'use_case']);

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
  width = 'w-32',
  label
}: {
  value: string | null;
  onChange: (value: string) => Promise<void>;
  width?: string;
  label: string;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <input
      type="text"
      aria-label={label}
      placeholder="—"
      defaultValue={value ?? ''}
      disabled={isPending}
      onBlur={(e) => {
        if (e.target.value !== (value ?? '')) startTransition(() => onChange(e.target.value));
      }}
      className={`${width} h-8 rounded-lg border border-transparent bg-transparent px-2 text-sm text-ink-3 hover:border-line hover:bg-panel focus:border-accent focus:bg-panel focus:text-ink focus:outline-none disabled:opacity-50`}
    />
  );
}

function NameCell({ lead }: { lead: Lead }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        aria-label="Name"
        placeholder="—"
        defaultValue={lead.name ?? ''}
        onBlur={(e) => {
          if (e.target.value !== (lead.name ?? '')) updateLead(lead.id, { name: e.target.value });
        }}
        className="h-8 w-40 rounded-lg border border-transparent bg-transparent px-2 text-sm font-medium text-ink hover:border-line hover:bg-panel focus:border-accent focus:bg-panel focus:outline-none"
      />
      {lead.linkedin_url && (
        <a
          href={lead.linkedin_url}
          target="_blank"
          rel="noreferrer"
          aria-label="Open LinkedIn profile"
          title="Open LinkedIn profile"
          className="flex text-ink-2 hover:text-ink"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
            <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
          </svg>
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
          className="whitespace-nowrap text-[13px] text-accent hover:text-accent-dark"
          title={`Open ${linkedDeal.customer_name} on Deals`}
        >
          View →
        </Link>
      )}
    </div>
  );
}

// Toolbar selects look like the secondary buttons next to them.
const CONTROL = 'btn cursor-pointer pr-2';

export function LeadsTable({
  leads,
  reps,
  deals,
  statuses,
  visibleSources,
  initialHotOnly = false,
  initialQuery = ''
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
  // From the sidebar search (?q=).
  initialQuery?: string;
}) {
  const { rowProps } = useHighlightRow();
  const [query, setQuery] = useState(initialQuery);
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
        <p className="card p-6 text-sm text-ink-2">No leads yet.</p>
        {toast}
      </>
    );
  }


  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <label className="flex h-[38px] max-w-[460px] flex-[1_1_320px] items-center gap-2 rounded-[10px] border border-line bg-panel px-3 text-ink-2 focus-within:border-accent">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, company, email, title, use case, notes…"
            aria-label="Search leads"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-2"
          />
        </label>
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
          className="btn"
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
            className="px-1 text-sm text-ink-2 hover:text-ink hover:underline"
          >
            Clear
          </button>
        )}
        <div className="flex-1" />
        <span className="text-[13px] text-ink-2">
          {filtersActive
            ? `${filteredLeads.length} of ${leads.length} leads`
            : `${leads.length} ${leads.length === 1 ? 'lead' : 'leads'}`}
        </span>
        <details className="relative">
          <summary className="btn list-none [&::-webkit-details-marker]:hidden">
            Columns{hidden.size > 0 ? ` (${hidden.size} hidden)` : ''}
          </summary>
          <div className="absolute right-0 z-40 mt-1 w-56 rounded-xl border border-line bg-panel p-2 shadow-lg">
            {OPTIONAL_COLUMNS.map((c) => (
              <label key={c.key} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-ink hover:bg-divider">
                <input type="checkbox" checked={show(c.key)} onChange={() => toggleColumn(c.key)} className="accent-ink" />
                {c.label}
              </label>
            ))}
            {hidden.size > 0 && (
              <button
                type="button"
                onClick={() => writeHiddenColumns(new Set())}
                className="mt-1 w-full rounded-md px-2 py-1 text-left text-sm text-accent hover:bg-divider"
              >
                Show all columns
              </button>
            )}
          </div>
        </details>
      </div>

      {filteredLeads.length === 0 ? (
        <p className="card p-12 text-center text-sm text-ink-2">
          {trimmedQuery ? <>No leads match &ldquo;{query.trim()}&rdquo;</> : 'No leads match these filters.'}
        </p>
      ) : (
        <div className="table-shell max-h-[70vh]">
          <table>
            <thead>
              <tr>
                <th className={`left-0 z-30 !px-2.5 ${HOT_COL_WIDTH}`}>
                  <span className="sr-only">Hot</span>
                </th>
                <th className={`${NAME_COL_LEFT} z-30 min-w-[180px] shadow-[1px_0_0_var(--color-line)]`}>
                  <span className="px-2">Name</span>
                </th>
                {visibleColumns.map((c) => (
                  <th key={c.key}>
                    <span className={INPUT_COLUMNS.has(c.key) ? 'px-2' : undefined}>{c.label}</span>
                  </th>
                ))}
                <th>
                  <span className="sr-only">Delete</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} {...rowProps(lead.id)}>
                  <td className={`sticky left-0 z-10 !px-2.5 ${HOT_COL_WIDTH}`}>
                    <HotFlagButton hot={lead.hot} onToggle={(hot) => updateLead(lead.id, { hot })} />
                  </td>
                  <td className={`sticky ${NAME_COL_LEFT} z-10 shadow-[1px_0_0_var(--color-line)]`}>
                    <NameCell lead={lead} />
                  </td>
                  {show('date') && (
                    <td className="whitespace-nowrap text-[13px] text-ink-2">
                      {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  )}
                  {show('job_title') && (
                    <td>
                      <Cell label="Job title" value={lead.job_title} onChange={(job_title) => updateLead(lead.id, { job_title })} />
                    </td>
                  )}
                  {show('email') && (
                    <td>
                      <Cell label="Email" value={lead.email} onChange={(email) => updateLead(lead.id, { email })} width="w-52" />
                    </td>
                  )}
                  {show('phone') && (
                    <td>
                      <Cell label="Phone" value={lead.phone} onChange={(phone) => updateLead(lead.id, { phone })} />
                    </td>
                  )}
                  {show('company') && (
                    <td>
                      <Cell label="Company" value={lead.company} onChange={(company) => updateLead(lead.id, { company })} width="w-44" />
                    </td>
                  )}
                  {show('deal') && (
                    <td>
                      <DealCell lead={lead} deals={deals} />
                    </td>
                  )}
                  {show('notes') && (
                    <td>
                      <NotesButton
                        title={lead.name || lead.company || 'Lead'}
                        subtitle={lead.company}
                        notes={lead.notes}
                        onSave={(notes) => updateLead(lead.id, { notes })}
                      />
                    </td>
                  )}
                  {show('source') && (
                    <td>
                      <StatusSelect
                        ariaLabel="Source"
                        options={LEAD_SOURCES}
                        value={lead.source}
                        onChange={(source) => handleSourceChange(lead, source as LeadSource)}
                      />
                    </td>
                  )}
                  {show('priority') && (
                    <td>
                      <StatusSelect
                        ariaLabel="Priority"
                        options={LEAD_PRIORITIES}
                        value={lead.priority ?? 'Medium'}
                        onChange={(priority) => updateLead(lead.id, { priority: priority as Lead['priority'] })}
                      />
                    </td>
                  )}
                  {show('company_size') && (
                    <td>
                      <Cell
                        label="Company size"
                        value={lead.company_size}
                        onChange={(company_size) => updateLead(lead.id, { company_size })}
                        width="w-24"
                      />
                    </td>
                  )}
                  {show('use_case') && (
                    <td>
                      <Cell label="Use case" value={lead.use_case} onChange={(use_case) => updateLead(lead.id, { use_case })} width="w-40" />
                    </td>
                  )}
                  {show('rep') && (
                    <td>
                      <RepSelect
                        reps={reps}
                        value={lead.assigned_rep_id}
                        onChange={(repId) => updateLead(lead.id, { assigned_rep_id: repId })}
                      />
                    </td>
                  )}
                  {show('phase') && (
                    <td>
                      <StatusSelect
                        ariaLabel="Phase"
                        options={['Unassigned', ...LEAD_PHASES]}
                        value={lead.phase ?? 'Unassigned'}
                        onChange={(phase) =>
                          updateLead(lead.id, { phase: phase === 'Unassigned' ? null : (phase as Lead['phase']) })
                        }
                      />
                    </td>
                  )}
                  {show('status') && (
                    <td>
                      <StatusSelect
                        ariaLabel="Status"
                        options={statuses}
                        value={lead.status}
                        onChange={(status) => updateLead(lead.id, { status: status as Lead['status'] })}
                      />
                    </td>
                  )}
                  <td>
                    <DeleteButton label="Delete lead" onDelete={() => deleteLead(lead.id)} />
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
