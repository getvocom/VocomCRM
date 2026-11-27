'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { deleteAccount, updateAccount } from '@/app/actions';
import { DeleteButton } from '@/components/delete-button';
import { RepSelect } from '@/components/rep-select';
import { StatusSelect } from '@/components/status-select';
import { Pill } from '@/components/ui';
import { formatUsd } from '@/lib/opportunities';
import { ACCOUNT_KINDS, ACCOUNT_STATUSES, REGIONS, type Account, type Rep } from '@/lib/types';
import { useHighlightRow } from '@/lib/use-highlight-row';
import { LastContactCell } from '@/components/last-contact';
import type { LastContact } from '@/lib/email-activity';

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
      className={`${width} cell-input`}
    />
  );
}

type SortKey = 'name' | 'created_at' | 'deals_desc';

export function AccountsTable({
  accounts,
  reps,
  contactCounts,
  dealCounts,
  dealSummary,
  lastContacts
}: {
  accounts: Account[];
  reps: Rep[];
  contactCounts: Record<string, number>;
  dealCounts: Record<string, number>;
  dealSummary: Record<string, { open: number; openValue: number; stages: Record<string, number> }>;
  lastContacts: Record<string, { contact: LastContact | null; emails: string[] }>;
}) {
  const { rowProps } = useHighlightRow();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = accounts;
    if (q) {
      rows = rows.filter((a) =>
        [a.name, a.hq, a.website, a.industry, a.region, a.kind, a.location, a.economic_buyer, a.champions].filter(Boolean).some((field) => field!.toLowerCase().includes(q))
      );
    }
    const sorted = [...rows];
    switch (sortKey) {
      case 'created_at':
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
        break;
      case 'deals_desc':
        sorted.sort((a, b) => (dealCounts[b.id] ?? 0) - (dealCounts[a.id] ?? 0));
        break;
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [accounts, search, sortKey, dealCounts]);

  if (accounts.length === 0) {
    return <p className="card p-6 text-sm text-ink-2">No accounts yet.</p>;
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, HQ, website, industry…"
            aria-label="Search accounts"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-2"
          />
        </label>
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          Sort by
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="btn cursor-pointer pr-2">
            <option value="name">Name (A-Z)</option>
            <option value="created_at">Most Recent</option>
            <option value="deals_desc">Deals (Most)</option>
          </select>
        </label>
        <div className="flex-1" />
        <span className="text-[13px] text-ink-2">
          {search ? `${filteredAndSorted.length} of ${accounts.length} accounts` : `${accounts.length} accounts`}
        </span>
      </div>

      {filteredAndSorted.length === 0 ? (
        <p className="card p-12 text-center text-sm text-ink-2">No accounts match this search.</p>
      ) : (
        <div className="table-shell max-h-[70vh]">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>HQ</th>
                <th>Website</th>
                <th>Industry</th>
                <th>Size</th>
                <th>Region</th>
                <th>Assigned Rep</th>
                <th>Type</th>
                <th>Status</th>
                <th>Last contact</th>
                <th>Open value</th>
                <th>Stages</th>
                <th>POCs</th>
                <th>Deals</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((account) => (
                <tr key={account.id} {...rowProps(account.id)}>
                  <td className="whitespace-nowrap">
                    <Link href={`/accounts/${account.id}`} className="font-medium text-ink hover:text-accent hover:underline">
                      {account.name}
                    </Link>
                  </td>
                  <td>
                    <Cell label="HQ" value={account.hq} onChange={(hq) => updateAccount(account.id, { hq })} />
                  </td>
                  <td>
                    <Cell label="Website" value={account.website} onChange={(website) => updateAccount(account.id, { website })} />
                  </td>
                  <td>
                    <Cell label="Industry" value={account.industry} onChange={(industry) => updateAccount(account.id, { industry })} />
                  </td>
                  <td>
                    <Cell
                      label="Company size"
                      value={account.company_size}
                      onChange={(company_size) => updateAccount(account.id, { company_size })}
                      width="w-20"
                    />
                  </td>
                  <td>
                    <StatusSelect
                      ariaLabel="Region"
                      options={['Unset', ...REGIONS]}
                      value={account.region ?? 'Unset'}
                      onChange={(region) => updateAccount(account.id, { region: region === 'Unset' ? null : region })}
                    />
                  </td>
                  <td>
                    <RepSelect
                      reps={reps}
                      value={account.assigned_rep_id}
                      onChange={(repId) => updateAccount(account.id, { assigned_rep_id: repId })}
                    />
                  </td>
                  <td>
                    <StatusSelect
                      ariaLabel="Type"
                      options={['Unset', ...ACCOUNT_KINDS]}
                      value={account.kind ?? 'Unset'}
                      onChange={(kind) => updateAccount(account.id, { kind: kind === 'Unset' ? null : (kind as Account['kind']) })}
                    />
                  </td>
                  <td>
                    <StatusSelect
                      ariaLabel="Status"
                      options={['Unset', ...ACCOUNT_STATUSES]}
                      value={account.account_status ?? 'Unset'}
                      onChange={(s) =>
                        updateAccount(account.id, { account_status: s === 'Unset' ? null : (s as Account['account_status']) })
                      }
                    />
                  </td>
                  <td>
                    <LastContactCell
                      contact={lastContacts[account.id]?.contact ?? null}
                      emails={lastContacts[account.id]?.emails ?? []}
                      title={account.name}
                    />
                  </td>
                  <td className="whitespace-nowrap text-ink-3 tabular-nums">
                    {dealSummary[account.id]?.openValue ? formatUsd(dealSummary[account.id].openValue) : '—'}
                  </td>
                  <td>
                    {Object.keys(dealSummary[account.id]?.stages ?? {}).length === 0 ? (
                      <span className="text-ink-2">—</span>
                    ) : (
                      <div className="flex min-w-56 flex-wrap gap-1">
                        {Object.entries(dealSummary[account.id].stages).map(([stage, n]) => (
                          <Pill key={stage} value={stage}>
                            {stage} {n}
                          </Pill>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="text-ink-3">{contactCounts[account.id] ?? 0}</td>
                  <td className="text-ink-3">{dealCounts[account.id] ?? 0}</td>
                  <td>
                    <DeleteButton
                      label="Delete account"
                      onDelete={() => deleteAccount(account.id)}
                      confirmMessage={`Delete "${account.name}"? Its contacts will be deleted too. Linked deals/leads stay, just unlinked from this account. This can't be undone.`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
