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
      className={`flex items-center justify-center disabled:opacity-50 ${
        hot ? 'text-red-500' : 'text-neutral-300 hover:text-neutral-400'
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill={hot ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 21V4a1 1 0 0 1 1-1h11.5a.5.5 0 0 1 .4.8L15 8l2.9 3.9a.5.5 0 0 1-.4.8H6" />
      </svg>
    </button>
  );
}
