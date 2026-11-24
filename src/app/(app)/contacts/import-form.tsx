'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ImportForm() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    const formData = new FormData(e.currentTarget);
    const res = await fetch('/api/contacts/import', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
    } else {
      setStatus(`Imported ${data.imported} contact(s).`);
      router.refresh();
    }
    setSubmitting(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 flex flex-wrap items-end gap-3 card p-5"
    >
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs font-medium text-ink-2">Source</label>
        <input
          name="source"
          placeholder="e.g. Hunter, LinkedIn export"
          required
          className="w-full field sm:w-48"
        />
      </div>
      <div className="w-full sm:w-auto">
        <label className="mb-1 block text-xs font-medium text-ink-2">CSV file</label>
        <input
          type="file"
          name="file"
          accept=".csv"
          required
          className="w-full text-sm file:mr-2 file:rounded-md file:border-0 file:bg-divider file:px-3 file:py-1.5 file:text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full btn btn-primary sm:w-auto"
      >
        {submitting ? 'Importing...' : 'Import'}
      </button>
      {status && <p className="w-full text-sm text-ink-3">{status}</p>}
    </form>
  );
}
