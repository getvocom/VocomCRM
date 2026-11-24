'use client';

import { useTransition } from 'react';
import { STATUS_COLORS, pillClass } from '@/lib/pill-colors';

// Re-exported so existing imports from this file keep working.
export { STATUS_COLORS };

// An inline-editable pill: looks like the value's pill, opens a native select on click.
export function StatusSelect({
  options,
  value,
  onChange,
  ariaLabel
}: {
  options: string[];
  value: string;
  onChange: (value: string) => Promise<void>;
  ariaLabel?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={value}
      disabled={isPending}
      aria-label={ariaLabel}
      onChange={(e) => startTransition(() => onChange(e.target.value))}
      className={`pill cursor-pointer appearance-none border-0 bg-[length:10px] bg-[right_7px_center] bg-no-repeat py-[3px] pl-2 pr-6 disabled:opacity-50 ${pillClass(
        value
      )} bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='%2362626B'%20stroke-width='2.5'%3E%3Cpath%20d='m6%209%206%206%206-6'/%3E%3C/svg%3E")]`}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
