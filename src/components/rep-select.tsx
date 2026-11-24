'use client';

import { useTransition } from 'react';
import type { Rep } from '@/lib/types';

export function RepSelect({
  reps,
  value,
  onChange,
  ariaLabel = 'Assigned rep'
}: {
  reps: Rep[];
  value: string | null;
  onChange: (repId: string | null) => Promise<void>;
  ariaLabel?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={value ?? ''}
      disabled={isPending}
      aria-label={ariaLabel}
      onChange={(e) => startTransition(() => onChange(e.target.value || null))}
      className="h-8 max-w-48 cursor-pointer rounded-lg border border-transparent bg-transparent px-1.5 text-[13px] text-ink-3 hover:border-line hover:bg-panel focus:border-accent disabled:opacity-50"
    >
      <option value="">Unassigned</option>
      {reps.map((rep) => (
        <option key={rep.id} value={rep.id}>
          {rep.name}
        </option>
      ))}
    </select>
  );
}
