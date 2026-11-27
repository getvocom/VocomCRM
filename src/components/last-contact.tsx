'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EmailTimeline } from '@/components/email-timeline';
import type { LastContact } from '@/lib/email-activity';

// "Waiting on us · 2d" when they wrote last, "Waiting on them · 5h" when we did. Click for
// the messages. Shows a dash when there is no synced mail for these addresses.
export function LastContactCell({ contact, emails, title }: { contact: LastContact | null; emails: string[]; title: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!contact) return <span className="text-ink-2">—</span>;
  const waitingOnUs = contact.direction === 'in';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={contact.subject ?? undefined}
        className={`pill cursor-pointer whitespace-nowrap ${
          waitingOnUs ? 'bg-pill-amber text-pill-amber-ink' : 'bg-pill-grey text-pill-grey-ink'
        }`}
      >
        {waitingOnUs ? 'Waiting on us' : 'Waiting on them'} · {contact.ago}
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Email with ${title}`}
              className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-[14px] bg-panel p-6 text-left shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-ink">Email with {title}</h3>
                <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
              <EmailTimeline emails={emails} />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
