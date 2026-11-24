'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function UploadForm() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    const formData = new FormData(e.currentTarget);
    const res = await fetch('/api/linkedin-marketing/upload', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
    } else {
      setStatus(`Imported ${data.days} day(s) of stats and ${data.audienceRows} audience rows.`);
      router.refresh();
    }
    setSubmitting(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 flex flex-wrap items-end gap-4 card p-5"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-2">
          Followers export (.xls)
        </label>
        <input
          type="file"
          name="followers"
          accept=".xls,.xlsx"
          className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-divider file:px-3 file:py-1.5 file:text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-2">
          Visitors export (.xls)
        </label>
        <input
          type="file"
          name="visitors"
          accept=".xls,.xlsx"
          className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-divider file:px-3 file:py-1.5 file:text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="btn btn-primary"
      >
        {submitting ? 'Uploading...' : 'Upload'}
      </button>
      {status && <p className="w-full text-sm text-ink-3">{status}</p>}
    </form>
  );
}
