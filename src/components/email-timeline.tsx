'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { getDealEmailTimeline, getEmailTimeline, hideEmail, type EmailTimelineData } from '@/app/email-actions';

// Messages for one record, newest first. Loads on mount, so it can sit inside a dialog or
// drawer without every page fetching mail up front. Give it `dealId` or `emails`.
export function EmailTimeline({ emails, dealId }: { emails?: string[]; dealId?: string }) {
  const [data, setData] = useState<EmailTimelineData | null>(null);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  // A string, so a new array with the same addresses doesn't refetch.
  const key = (emails ?? []).join(',');

  const load = useCallback(
    () => (dealId ? getDealEmailTimeline(dealId) : getEmailTimeline(key ? key.split(',') : [])),
    [dealId, key]
  );

  useEffect(() => {
    let live = true;
    load()
      .then((d) => live && setData(d))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [load]);

  if (failed) return <p className="text-[13px] text-warn">Couldn&apos;t load email activity.</p>;
  if (!data) return <p className="text-[13px] text-ink-2">Loading email…</p>;
  if (data.addressCount === 0) {
    return <p className="text-[13px] text-ink-2">No email address on file, so no mail can be matched yet.</p>;
  }
  if (data.messages.length === 0) {
    return <p className="text-[13px] text-ink-2">No email found with this contact in the synced mailbox.</p>;
  }

  return (
    <ul className="divide-y divide-divider">
      {data.messages.map((m) => (
        <li key={m.id} className="py-2.5 text-left">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className={`pill ${m.direction === 'in' ? 'bg-pill-amber text-pill-amber-ink' : 'bg-pill-blue text-pill-blue-ink'}`}>
              {m.direction === 'in' ? 'Received' : 'Sent'}
            </span>
            <span className="min-w-0 break-words text-sm font-medium text-ink">{m.subject || '(no subject)'}</span>
          </div>
          <div className="mt-0.5 text-xs text-ink-2">
            {new Date(m.sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} ·{' '}
            {m.direction === 'in' ? `From ${m.from_name || m.from_email}` : `To ${m.participants.join(', ')}`}
          </div>
          {m.preview && <p className="mt-1 break-words text-[13px] text-ink-3">{m.preview}</p>}
          <div className="mt-1 flex gap-3 text-xs">
            <a
              href={`https://mail.google.com/mail/?authuser=${encodeURIComponent(m.mailbox)}#all/${encodeURIComponent(m.thread_id)}`}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:text-accent-dark"
              title={`Opens for whoever is signed in to ${m.mailbox}`}
            >
              Open in Gmail
            </a>
            <button
              type="button"
              disabled={isPending}
              className="text-ink-2 hover:text-ink disabled:opacity-50"
              onClick={() => {
                if (!window.confirm('Hide this message from the CRM? It stays in Gmail.')) return;
                startTransition(async () => {
                  await hideEmail(m.id);
                  setData(await load());
                });
              }}
            >
              Hide from CRM
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
