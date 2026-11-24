'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LeadSource } from '@/lib/types';

export function LeadsUploadForm({
  source,
  // When given, the uploader picks which source the rows are filed under (the Leads page);
  // otherwise the page's own source is used.
  selectableSources
}: {
  source: string;
  selectableSources?: LeadSource[];
}) {
  const router = useRouter();
  const [chosenSource, setChosenSource] = useState(source);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    const formData = new FormData(e.currentTarget);
    formData.set('source', selectableSources ? chosenSource : source);
    const res = await fetch('/api/leads/upload', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
    } else {
      setStatus(`Added ${data.imported} new lead(s). Skipped ${data.skippedDuplicates} already on this list.`);
      router.refresh();
    }
    setSubmitting(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card mb-6 flex flex-wrap items-end gap-3 p-4"
    >
      {selectableSources && (
        <label className="block w-full sm:w-auto">
          <span className="mb-1 block text-xs font-medium text-ink-2">Upload as</span>
          <select
            value={chosenSource}
            onChange={(e) => setChosenSource(e.target.value)}
            className="field w-full"
          >
            {selectableSources.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block w-full sm:w-auto">
        <span className="mb-1 block text-xs font-medium text-ink-2">Bulk upload (.csv)</span>
        <input
          type="file"
          name="file"
          accept=".csv"
          required
          className="w-full text-sm text-ink-3 file:mr-2 file:h-9 file:cursor-pointer file:rounded-[9px] file:border file:border-line file:bg-panel file:px-3 file:text-sm file:font-medium file:text-ink"
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="btn btn-primary w-full sm:w-auto"
      >
        {submitting ? 'Uploading...' : 'Upload'}
      </button>
      {status && <p className="w-full text-sm text-ink-3">{status}</p>}
    </form>
  );
}
