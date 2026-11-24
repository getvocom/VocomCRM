'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// Small bottom-right toast. Used when an inline edit moves a row off the page it's being
// edited on (changing a lead's source), which otherwise looks like the row was deleted.
export function Toast({
  message,
  href,
  onUndo,
  onDismiss,
  timeoutMs = 10_000
}: {
  message: string;
  href?: string;
  onUndo?: () => void;
  onDismiss: () => void;
  timeoutMs?: number;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, timeoutMs);
    return () => clearTimeout(timer);
  }, [onDismiss, timeoutMs]);

  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5 rounded-xl bg-ink py-3 pl-4 pr-3.5 text-sm text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
    >
      <span>{message}</span>
      {href && (
        <Link href={href} className="font-medium text-[#A9B8F5] underline-offset-2 hover:underline">
          View
        </Link>
      )}
      {onUndo && (
        <button type="button" onClick={onUndo} className="font-medium text-[#A9B8F5] underline-offset-2 hover:underline">
          Undo
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex p-1 text-[#A1A1AA] hover:text-white"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
