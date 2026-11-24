'use client';

import { useState } from 'react';

// Page header for /leads: title on the left, "Import CSV" and "+ Add lead" on the right.
// The existing forms open in a panel underneath rather than sitting on every tab.
export function LeadsHeader({
  heading,
  addForm,
  uploadForm
}: {
  heading: React.ReactNode;
  addForm: React.ReactNode;
  uploadForm: React.ReactNode;
}) {
  const [open, setOpen] = useState<'add' | 'upload' | null>(null);

  const button = (panel: 'add' | 'upload', label: string, primary: boolean) => (
    <button
      type="button"
      aria-expanded={open === panel}
      onClick={() => setOpen(open === panel ? null : panel)}
      className={`rounded-lg px-3.5 py-2 text-sm font-medium ${
        primary
          ? 'bg-neutral-900 text-white hover:bg-neutral-700'
          : 'border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mb-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">{heading}</div>
        <div className="flex flex-wrap gap-2">
          {button('upload', 'Import CSV', false)}
          {button('add', '+ Add lead', true)}
        </div>
      </div>
      {open && <div className="mt-4 [&>form]:mb-0">{open === 'add' ? addForm : uploadForm}</div>}
    </div>
  );
}
