'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { deleteDeal, updateDeal } from '@/app/actions';
import { DeleteButton } from '@/components/delete-button';
import { NotesButton } from '@/components/notes-button';
import { RepSelect } from '@/components/rep-select';
import { StatusSelect } from '@/components/status-select';
import { DEAL_PIPELINE_STATUSES, type Deal, type Rep } from '@/lib/types';

function ValueCell({ value, onChange }: { value: number; onChange: (value: number) => Promise<void> }) {
  const [isPending, startTransition] = useTransition();
  return (
    <input
      type="number"
      defaultValue={value}
      disabled={isPending}
      onBlur={(e) => {
        const n = Number(e.target.value);
        if (!Number.isNaN(n) && n !== value) startTransition(() => onChange(n));
      }}
      className="w-28 cell-input"
    />
  );
}

export function AccountDealsTable({
  deals,
  reps,
  leadCountByDeal
}: {
  deals: Deal[];
  reps: Rep[];
  leadCountByDeal: Map<string, number>;
}) {
  if (deals.length === 0) {
    return <p className="text-sm text-ink-2">No deals linked to this account yet — link one from the Deals page.</p>;
  }

  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Product / Order</th>
            <th>Value</th>
            <th>Notes</th>
            <th>Leads</th>
            <th>Assigned Rep</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr key={deal.id}>
              <td className="text-ink">
                <Link href={`/deals?id=${deal.id}`} className="hover:underline">
                  {deal.customer_name}
                </Link>
              </td>
              <td className="text-ink-3">{deal.product || '—'}</td>
              <td>
                <ValueCell value={deal.value} onChange={(value) => updateDeal(deal.id, { value })} />
              </td>
              <td>
                <NotesButton
                  title={deal.customer_name}
                  notes={deal.notes}
                  onSave={(notes) => updateDeal(deal.id, { notes })}
                />
              </td>
              <td className="text-ink-3">{leadCountByDeal.get(deal.id) ?? 0}</td>
              <td>
                <RepSelect
                  reps={reps}
                  value={deal.assigned_rep_id}
                  onChange={(repId) => updateDeal(deal.id, { assigned_rep_id: repId })}
                />
              </td>
              <td>
                <StatusSelect
                  options={DEAL_PIPELINE_STATUSES}
                  value={deal.status}
                  onChange={(status) => updateDeal(deal.id, { status: status as Deal['status'] })}
                />
              </td>
              <td>
                <DeleteButton
                  onDelete={() => deleteDeal(deal.id)}
                  confirmMessage={`Delete the deal with ${deal.customer_name}? This can't be undone.`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
