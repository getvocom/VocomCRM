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
      className="card mb-6 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {selectableSources ? (
        <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-2">Source</span>
          <select
            name="source"
            defaultValue={source}
            className="field w-full"
          >
            {selectableSources.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="source" value={source} />
      )}
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-2">Name</span>
        <input name="name" className="field w-full" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-2">Company</span>
        <input name="company" className="field w-full" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-2">Job title</span>
        <input
          name="job_title"
          className="field w-full"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-2">Email</span>
        <input
          name="email"
          type="email"
          className="field w-full"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-2">Phone</span>
        <input name="phone" className="field w-full" />
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          className="btn btn-primary w-full"
        >
          Add lead
        </button>
      </div>
    </form>
  );
}
