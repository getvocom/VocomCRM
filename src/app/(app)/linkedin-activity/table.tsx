'use client';

import { useTransition } from 'react';
import { deleteLinkedInActivity, updateLinkedInActivity } from '@/app/actions';
import { DeleteButton } from '@/components/delete-button';
import { RepSelect } from '@/components/rep-select';
import { StatusSelect } from '@/components/status-select';
import type { LinkedInActivity, Rep } from '@/lib/types';
import { useHighlightRow } from '@/lib/use-highlight-row';

function Toggle({
  checked,
  onChange
}: {
  checked: boolean;
  onChange: (checked: boolean) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={isPending}
      onChange={(e) => startTransition(() => onChange(e.target.checked))}
      className="h-4 w-4 rounded border-line"
    />
  );
}

export function LinkedInActivityTable({
  activity,
  reps,
  dealStatuses
}: {
  activity: LinkedInActivity[];
  reps: Rep[];
  dealStatuses: string[];
}) {
  const { rowProps } = useHighlightRow();

  if (activity.length === 0) {
    return <p className="text-sm text-ink-2">Nothing logged yet — use the form above.</p>;
  }

  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Prospect</th>
            <th>Company</th>
            <th>Activity</th>
            <th>Sent</th>
            <th>Accepted</th>
            <th>Assigned Rep</th>
            <th>Deal Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {activity.map((row) => (
            <tr key={row.id} {...rowProps(row.id)}>
              <td className="whitespace-nowrap px-4 py-3 text-ink-2">
                {new Date(row.date_logged).toLocaleDateString()}
              </td>
              <td className="text-ink">
                {row.linkedin_url ? (
                  <a href={row.linkedin_url} target="_blank" rel="noreferrer" className="hover:underline">
                    {row.prospect}
                  </a>
                ) : (
                  row.prospect
                )}
              </td>
              <td className="text-ink-3">{row.company || '—'}</td>
              <td className="text-ink-3">{row.activity || '—'}</td>
              <td>
                <Toggle
                  checked={row.connection_sent}
                  onChange={(checked) => updateLinkedInActivity(row.id, { connection_sent: checked })}
                />
              </td>
              <td>
                <Toggle
                  checked={row.connection_accepted}
                  onChange={(checked) =>
                    updateLinkedInActivity(row.id, { connection_accepted: checked })
                  }
                />
              </td>
              <td>
                <RepSelect
                  reps={reps}
                  value={row.assigned_rep_id}
                  onChange={(repId) => updateLinkedInActivity(row.id, { assigned_rep_id: repId })}
                />
              </td>
              <td>
                <StatusSelect
                  options={dealStatuses}
                  value={row.deal_status}
                  onChange={(status) =>
                    updateLinkedInActivity(row.id, {
                      deal_status: status as LinkedInActivity['deal_status']
                    })
                  }
                />
              </td>
              <td>
                <DeleteButton onDelete={() => deleteLinkedInActivity(row.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
