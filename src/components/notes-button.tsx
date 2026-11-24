'use client';

import { useState, useTransition } from 'react';

export function NotesButton({
  title,
  subtitle,
  notes,
  onSave
}: {
  title: string;
  subtitle?: string | null;
  notes: string | null;
  onSave: (notes: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(notes ?? '');
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setDraft(notes ?? '');
    setOpen(true);
  }

  function handleSave() {
    startTransition(async () => {
      await onSave(draft);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={notes ? `Open notes for ${title}` : `Add a note for ${title}`}
        title={notes ?? undefined}
        className="flex h-7 max-w-[220px] items-center gap-1.5 rounded-[7px] px-2 text-[13px] text-ink-2 hover:bg-divider hover:text-ink"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" className="shrink-0" aria-hidden="true">
          <path d="M4 4h16v12H8l-4 4z" />
        </svg>
        <span className="truncate">{notes ? notes : '+ Note'}</span>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Notes for ${title}`}
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-[14px] bg-panel p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-ink">{title}</h3>
                {subtitle && <p className="text-xs text-ink-2">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-[7px] text-ink-2 hover:bg-divider hover:text-ink"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              placeholder="Add a note…"
              autoFocus
              aria-label="Note"
              className="field h-auto w-full py-2"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                type="button"
                className="btn"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                type="button"
                className="btn btn-primary"
              >
                {isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
