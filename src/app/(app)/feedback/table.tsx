'use client';

import { deleteFeedback, updateFeedbackStatus } from '@/app/actions';
import { DeleteButton } from '@/components/delete-button';
import { StatusSelect } from '@/components/status-select';
import type { Feedback, FeedbackStatus, Rep } from '@/lib/types';

export function FeedbackTable({ items, reps }: { items: Feedback[]; reps: Rep[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-ink-2">No feedback submitted yet — use the form above.</p>;
  }

  const repName = (id: string | null) => reps.find((r) => r.id === id)?.name ?? '—';

  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Description</th>
            <th>Submitted By</th>
            <th>Date</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="font-medium text-ink">{item.title}</td>
              <td className="max-w-[320px] text-ink-3">{item.description || '—'}</td>
              <td className="text-ink-3">{repName(item.submitted_by_rep_id)}</td>
              <td className="whitespace-nowrap text-ink-2">
                {new Date(item.created_at).toLocaleDateString()}
              </td>
              <td>
                <StatusSelect
                  options={['Open', 'In Progress', 'Resolved', "Won't Fix"]}
                  value={item.status}
                  onChange={(status) => updateFeedbackStatus(item.id, status as FeedbackStatus)}
                />
              </td>
              <td>
                <DeleteButton onDelete={() => deleteFeedback(item.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
