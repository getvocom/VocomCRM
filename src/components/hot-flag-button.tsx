'use client';

import { useTransition } from 'react';

export function HotFlagButton({
  hot,
  onToggle
}: {
  hot: boolean;
  onToggle: (hot: boolean) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => onToggle(!hot))}
      title={hot ? 'Unflag as hot' : 'Flag as hot'}
      aria-label={hot ? 'Hot lead, click to unflag' : 'Flag as hot'}
      aria-pressed={hot}
      className={`flex h-7 w-7 items-center justify-center rounded-[7px] hover:bg-divider disabled:opacity-50 ${
        hot ? 'text-chart-orange' : 'text-chart-grey hover:text-ink-2'
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={hot ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.5 2 1.5 3 3 3-1-3 0-6 0-8.5z" />
      </svg>
    </button>
  );
}
