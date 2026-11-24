'use client';

import { useState, useTransition } from 'react';
import { triggerInstantlySync } from '@/app/actions';

export function SyncNowButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      try {
        const res = await triggerInstantlySync();
        setResult(
          `Synced — ${res.inserted} new lead${res.inserted === 1 ? '' : 's'}, ${res.repliesProcessed} new repl${res.repliesProcessed === 1 ? 'y' : 'ies'}.`
        );
      } catch {
        setResult('Sync failed — try again in a moment.');
      }
    });
  }

  return (
    <div className="flex flex-row-reverse flex-wrap items-center gap-3">
      <button
        onClick={handleClick}
        disabled={isPending}
        type="button"
        className="btn btn-primary"
      >
        {isPending ? 'Syncing… (can take up to a few minutes)' : 'Sync Now'}
      </button>
      {result && <span role="status" className="text-sm text-ink-2">{result}</span>}
    </div>
  );
}
