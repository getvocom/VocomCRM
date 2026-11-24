'use client';

import { useTransition } from 'react';

export function DeleteButton({
  onDelete,
  confirmMessage = 'Delete this entry? This can’t be undone.',
  label = 'Delete'
}: {
  onDelete: () => Promise<void>;
  confirmMessage?: string;
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(onDelete);
      }}
      disabled={isPending}
      title={label}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-[7px] text-ink-2 hover:bg-pill-red hover:text-pill-red-ink disabled:opacity-50"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
      </svg>
    </button>
  );
}
