'use client';

import { useTransition } from 'react';
import type { Deal } from '@/lib/types';

export function DealSelect({
  deals,
  value,
  onChange,
  ariaLabel = 'Linked deal'
}: {
  deals: Deal[];
  value: string | null;
  onChange: (dealId: string | null) => Promise<void>;
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
      <option value="">No deal</option>
      {deals.map((deal) => (
        <option key={deal.id} value={deal.id}>
          {deal.customer_name}
        </option>
      ))}
    </select>
  );
}
