import Link from 'next/link';
import { deleteImportedContact } from '@/app/actions';
import { DeleteButton } from '@/components/delete-button';
import type { MasterContact } from '@/lib/types';

const SOURCE_COLORS: Record<string, string> = {
  Website: 'bg-pill-blue text-pill-blue-ink',
  'Offline Event': 'bg-pill-teal text-pill-teal-ink',
  Referral: 'bg-pill-purple text-pill-purple-ink',
  Research: 'bg-pill-amber text-pill-amber-ink',
  Other: 'bg-pill-grey text-pill-grey-ink',
  Instantly: 'bg-pill-orange text-pill-orange-ink',
  'LinkedIn Activity': 'bg-pill-sky text-pill-sky-ink'
};

export function ContactsTable({
  contacts,
  totalCount,
  page,
  pageSize,
  query,
  sort
}: {
  contacts: MasterContact[];
  totalCount: number;
  page: number;
  pageSize: number;
  query: string;
  sort: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (sort && sort !== 'recent') params.set('sort', sort);
    params.set('page', String(p));
    return `?${params.toString()}`;
  };

  return (
    <div>
      <form method="GET" className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search by name, email, company, phone..."
          aria-label="Search contacts"
          className="field w-full sm:w-80"
        />
        <select
          name="sort"
          defaultValue={sort}
          aria-label="Sort contacts"
          className="field"
        >
          <option value="recent">Most Recent</option>
          <option value="name">Name (A-Z)</option>
          <option value="company">Company (A-Z)</option>
        </select>
        <button
          type="submit"
          className="btn btn-primary"
        >
          Search
        </button>
        {(query || sort !== 'recent') && (
          <Link
            href="?page=1"
            className="btn"
          >
            Clear
          </Link>
        )}
      </form>

      {contacts.length === 0 ? (
        <p className="text-sm text-ink-2">No contacts match.</p>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Company</th>
                <th>Title</th>
                <th>Source</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td className="text-ink">
                    {c.linkedin_url ? (
                      <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="hover:underline">
                        {c.name || '—'}
                      </a>
                    ) : (
                      c.name || '—'
                    )}
                  </td>
                  <td className="text-ink-3">{c.email || '—'}</td>
                  <td className="text-ink-3">{c.phone || '—'}</td>
                  <td className="text-ink-3">{c.company || '—'}</td>
                  <td className="text-ink-3">{c.job_title || '—'}</td>
                  <td>
                    <span
                      className={'pill ' + (SOURCE_COLORS[c.source] ?? 'bg-pill-grey text-pill-grey-ink')}
                    >
                      {c.source}
                    </span>
                  </td>
                  <td>
                    {c.origin === 'imported_contacts' ? (
                      <DeleteButton onDelete={deleteImportedContact.bind(null, c.id)} />
                    ) : (
                      <span
                        className="text-xs text-ink-2/50"
                        title="Delete this from its own page (Leads / Instantly Leads / LinkedIn Activity / an account's Contacts) — Contacts is a combined view"
                      >
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-divider px-4 py-3 text-sm text-ink-2">
            <span>
              {totalCount === 0
                ? '0 results'
                : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount.toLocaleString()}`}
            </span>
            <div className="flex gap-2">
              <Link
                href={pageHref(Math.max(1, page - 1))}
                aria-disabled={page <= 1}
                className={page <= 1 ? 'btn btn-sm pointer-events-none opacity-50' : 'btn btn-sm'}
              >
                Previous
              </Link>
              <Link
                href={pageHref(Math.min(totalPages, page + 1))}
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? 'btn btn-sm pointer-events-none opacity-50' : 'btn btn-sm'}
              >
                Next
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
