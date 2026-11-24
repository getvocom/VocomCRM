'use client';

import { useTransition } from 'react';
import { updateAccount } from '@/app/actions';
import { RepSelect } from '@/components/rep-select';
import { StatusSelect } from '@/components/status-select';
import { ACCOUNT_KINDS, ACCOUNT_STATUSES, REGIONS, type Account, type KeyValue, type Rep } from '@/lib/types';

function TextField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => Promise<void>;
  placeholder?: string;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-2">{label}</label>
      <input
        type="text"
        defaultValue={value ?? ''}
        placeholder={placeholder}
        disabled={isPending}
        onBlur={(e) => {
          if (e.target.value !== (value ?? '')) startTransition(() => onChange(e.target.value));
        }}
        className="field w-full disabled:opacity-50"
      />
    </div>
  );
}

export function AccountFieldsForm({ account, reps }: { account: Account; reps: Rep[] }) {
  return (
    <div className="card grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
      <TextField label="Name" value={account.name} onChange={(name) => updateAccount(account.id, { name })} />
      <TextField label="HQ" value={account.hq} onChange={(hq) => updateAccount(account.id, { hq })} />
      <TextField label="Website" value={account.website} onChange={(website) => updateAccount(account.id, { website })} />
      <TextField
        label="Industry"
        value={account.industry}
        onChange={(industry) => updateAccount(account.id, { industry })}
      />
      <TextField
        label="Company size"
        value={account.company_size}
        onChange={(company_size) => updateAccount(account.id, { company_size })}
      />
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-2">Region</label>
        <StatusSelect
          options={['Unset', ...REGIONS]}
          value={account.region ?? 'Unset'}
          onChange={(region) => updateAccount(account.id, { region: region === 'Unset' ? null : region })}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-2">Assigned rep</label>
        <RepSelect
          reps={reps}
          value={account.assigned_rep_id}
          onChange={(repId) => updateAccount(account.id, { assigned_rep_id: repId })}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-2">Type</label>
        <StatusSelect
          options={['Unset', ...ACCOUNT_KINDS]}
          value={account.kind ?? 'Unset'}
          onChange={(kind) => updateAccount(account.id, { kind: kind === 'Unset' ? null : (kind as Account['kind']) })}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-2">Status</label>
        <StatusSelect
          options={['Unset', ...ACCOUNT_STATUSES]}
          value={account.account_status ?? 'Unset'}
          onChange={(s) =>
            updateAccount(account.id, { account_status: s === 'Unset' ? null : (s as Account['account_status']) })
          }
        />
      </div>
      <TextField label="Location" value={account.location} onChange={(location) => updateAccount(account.id, { location })} />
      <TextField
        label="Economic buyer"
        value={account.economic_buyer}
        onChange={(economic_buyer) => updateAccount(account.id, { economic_buyer })}
      />
      <TextField label="Champions" value={account.champions} onChange={(champions) => updateAccount(account.id, { champions })} />
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-2">Supporters (also working this account)</label>
        <div className="flex flex-wrap gap-1.5">
          {reps.map((rep) => {
            const on = account.supporters.includes(rep.id);
            return (
              <button
                key={rep.id}
                type="button"
                onClick={() =>
                  updateAccount(account.id, {
                    supporters: on ? account.supporters.filter((id) => id !== rep.id) : [...account.supporters, rep.id]
                  })
                }
                aria-pressed={on}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${
                  on ? 'border-ink bg-ink text-white' : 'border-line bg-panel text-ink-3 hover:bg-divider'
                }`}
              >
                {rep.name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <TextField label="Notes" value={account.notes} onChange={(notes) => updateAccount(account.id, { notes })} />
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <InfoRows account={account} />
      </div>
    </div>
  );
}

// Free-form label/value facts about the account (e.g. "Buying cycle: quarterly").
function InfoRows({ account }: { account: Account }) {
  const [, startTransition] = useTransition();
  const save = (info: KeyValue[]) => startTransition(() => updateAccount(account.id, { info }));
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-2">Account info</label>
      <div className="space-y-1.5">
        {account.info.map((row, i) => (
          <div key={`${row.k}-${i}`} className="flex gap-2">
            <input
              defaultValue={row.k}
              placeholder="Label"
              onBlur={(e) => e.target.value !== row.k && save(account.info.map((r, j) => (j === i ? { ...r, k: e.target.value } : r)))}
              className="w-40 field h-8"
            />
            <input
              defaultValue={row.v}
              placeholder="Value"
              onBlur={(e) => e.target.value !== row.v && save(account.info.map((r, j) => (j === i ? { ...r, v: e.target.value } : r)))}
              className="min-w-0 flex-1 field h-8"
            />
            <button
              type="button"
              onClick={() => save(account.info.filter((_, j) => j !== i))}
              className="px-2 text-ink-2 hover:text-red-600"
              aria-label="Remove row"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => save([...account.info, { k: '', v: '' }])}
          className="rounded-md border border-dashed border-line px-2.5 py-1 text-xs text-ink-2"
        >
          Add info row
        </button>
      </div>
    </div>
  );
}
