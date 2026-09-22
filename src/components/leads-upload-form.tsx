'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LeadsUploadForm({ source }: { source: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    const formData = new FormData(e.currentTarget);
    formData.set('source', source);
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
      className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs font-medium text-neutral-500">Bulk upload (.csv)</label>
        <input
          type="file"
          name="file"
          accept=".csv"
          required
          className="w-full text-sm file:mr-2 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 sm:w-auto"
      >
        {submitting ? 'Uploading...' : 'Upload'}
      </button>
      {status && <p className="w-full text-sm text-neutral-600">{status}</p>}
    </form>
  );
}
