import { addLead } from '@/app/actions';
import type { LeadSource } from '@/lib/types';

export function AddLeadForm({
  source,
  // Pages that list a single source (Referrals, Research, LinkedIn Outreach) keep the
  // source fixed; the Leads page passes the full list so a lead can be filed straight
  // into Cold Email, Website, Offline Event, etc.
  selectableSources
}: {
  source: string;
  selectableSources?: LeadSource[];
}) {
  return (
    <form
      action={addLead}
      className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
    >
      {selectableSources ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Source</label>
          <select
            name="source"
            defaultValue={source}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900"
          >
            {selectableSources.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="source" value={source} />
      )}
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">Name</label>
        <input name="name" className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">Company</label>
        <input name="company" className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">Job title</label>
        <input
          name="job_title"
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">Email</label>
        <input
          name="email"
          type="email"
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">Phone</label>
        <input name="phone" className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900" />
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Add lead
        </button>
      </div>
    </form>
  );
}
