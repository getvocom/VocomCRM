'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

// Notification links land here with ?id=<record>. These tables render every row
// unfiltered (no server-side pagination), so rather than a page.tsx query change, just
// scroll the matching row into view and highlight it once the page mounts.
export function useHighlightRow() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('id');
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    if (highlightId) {
      rowRefs.current[highlightId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId]);

  function rowProps(id: string) {
    return {
      ref: (el: HTMLTableRowElement | null) => {
        rowRefs.current[id] = el;
      },
      // row-highlight lets .table-shell tint the cells too (its cells have their own background).
      className: id === highlightId ? 'row-highlight bg-amber-50 ring-2 ring-inset ring-amber-300' : undefined
    };
  }

  return { highlightId, rowProps };
}
