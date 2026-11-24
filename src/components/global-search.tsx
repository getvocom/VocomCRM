'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NAV_GROUPS } from '@/lib/nav-items';

type Result = { key: string; label: string; hint: string; href: string };

const PAGES = NAV_GROUPS.flatMap((g) => g.links.map((l) => ({ ...l, group: g.label ?? 'General' })));

// Sidebar search. Typing jumps to a page by name, or searches Leads / Contacts for the text
// (both pages already filter by ?q=). ⌘K / Ctrl+K focuses it from anywhere.
export function GlobalSearch({ shortcut = false, onNavigate }: { shortcut?: boolean; onNavigate?: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!shortcut) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcut]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const lower = q.toLowerCase();
    const pages = PAGES.filter((p) => p.label.toLowerCase().includes(lower)).map((p) => ({
      key: `page:${p.href}`,
      label: p.label,
      hint: p.group,
      href: p.href
    }));
    const encoded = encodeURIComponent(q);
    return [
      ...pages,
      { key: 'leads', label: `Search leads for “${q}”`, hint: 'Leads', href: `/leads?tab=all&q=${encoded}` },
      { key: 'contacts', label: `Search contacts for “${q}”`, hint: 'Contacts', href: `/contacts?q=${encoded}` }
    ];
  }, [query]);

  function go(result: Result | undefined) {
    if (!result) return;
    router.push(result.href);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
    onNavigate?.();
  }

  const showList = open && results.length > 0;

  return (
    <div className="relative mb-1.5">
      <label className="flex h-9 items-center gap-2 rounded-[9px] bg-divider px-2.5 text-sm text-ink-2 focus-within:bg-panel focus-within:shadow-[0_0_0_1px_var(--color-line)]">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          aria-label="Search everything"
          placeholder="Search everything"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              go(results[active]);
            } else if (e.key === 'Escape') {
              setQuery('');
              inputRef.current?.blur();
            }
          }}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-2"
        />
        {shortcut && (
          <kbd className="font-sans text-xs text-ink-2" aria-hidden="true">
            ⌘K
          </kbd>
        )}
      </label>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl border border-line bg-panel py-1 shadow-lg"
        >
          {results.map((r, i) => (
            <li
              key={r.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: the input's blur would close the list before a click lands.
              onMouseDown={(e) => {
                e.preventDefault();
                go(r);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm ${
                i === active ? 'bg-divider text-ink' : 'text-ink-3'
              }`}
            >
              <span className="truncate">{r.label}</span>
              <span className="shrink-0 text-xs text-ink-2">{r.hint}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
