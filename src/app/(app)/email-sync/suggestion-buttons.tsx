'use client';

import { useTransition } from 'react';
import { resolveEmailSuggestion } from '@/app/email-actions';

export function SuggestionButtons({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex justify-end gap-2">
      <button type="button" className="btn btn-sm btn-primary" disabled={isPending} onClick={() => startTransition(() => resolveEmailSuggestion(id, true))}>
        Accept
      </button>
      <button type="button" className="btn btn-sm" disabled={isPending} onClick={() => startTransition(() => resolveEmailSuggestion(id, false))}>
        Dismiss
      </button>
    </div>
  );
}
