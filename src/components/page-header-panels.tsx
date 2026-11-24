'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui';

// PageHeader whose action buttons open a panel (an add form, an import form) under the
// header, one at a time. The last panel's button is the primary one.
export function PageHeaderPanels({
  group,
  title,
  description,
  panels
}: {
  group?: string;
  title: string;
  description?: React.ReactNode;
  panels: { key: string; label: string; content: React.ReactNode }[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const active = panels.find((p) => p.key === open);

  return (
    <div>
      <PageHeader
        group={group}
        title={title}
        description={description}
        actions={panels.map((p, i) => (
          <button
            key={p.key}
            type="button"
            aria-expanded={open === p.key}
            onClick={() => setOpen(open === p.key ? null : p.key)}
            className={i === panels.length - 1 ? 'btn btn-primary' : 'btn'}
          >
            {p.label}
          </button>
        ))}
      />
      {active && <div className="mt-4 [&>form]:mb-0">{active.content}</div>}
    </div>
  );
}
