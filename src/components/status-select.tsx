'use client';

import { useTransition } from 'react';
import { STATUS_COLORS } from '@/lib/pill-colors';

// Re-exported so existing imports from this file keep working.
export { STATUS_COLORS };

export function StatusSelect({
  options,
  value,
  onChange
}: {
  options: string[];
  value: string;
  onChange: (value: string) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={value}
      disabled={isPending}
      onChange={(e) => startTransition(() => onChange(e.target.value))}
      className={`rounded-md border-0 px-2 py-1 text-sm font-medium disabled:opacity-50 ${
        STATUS_COLORS[value] ?? 'bg-neutral-100 text-neutral-700'
      }`}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
