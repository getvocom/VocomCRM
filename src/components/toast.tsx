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
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-white shadow-lg"
    >
      <span>{message}</span>
      {href && (
        <Link href={href} className="font-medium text-blue-300 underline-offset-2 hover:underline">
          View
        </Link>
      )}
      {onUndo && (
        <button type="button" onClick={onUndo} className="font-medium text-blue-300 hover:underline">
          Undo
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-neutral-400 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
