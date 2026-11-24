'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui';

// Page header for /leads: title on the left, "Import CSV" and "+ Add lead" on the right.
// The existing forms open in a panel underneath rather than sitting on every tab.
export function LeadsHeader({
  description,
  addForm,
  uploadForm
}: {
  description?: React.ReactNode;
  addForm: React.ReactNode;
  uploadForm: React.ReactNode;
}) {
  const [open, setOpen] = useState<'add' | 'upload' | null>(null);

  const button = (panel: 'add' | 'upload', label: string, primary: boolean) => (
    <button
      type="button"
      aria-expanded={open === panel}
      onClick={() => setOpen(open === panel ? null : panel)}
      className={primary ? 'btn btn-primary' : 'btn'}
    >
      {label}
    </button>
  );

  return (
    <div>
      <PageHeader
        group="Sales"
        title="Leads"
        description={description}
        actions={
          <>
            {button('upload', 'Import CSV', false)}
            {button('add', '+ Add lead', true)}
          </>
        }
      />
      {open && <div className="mt-4 [&>form]:mb-0">{open === 'add' ? addForm : uploadForm}</div>}
    </div>
  );
}
