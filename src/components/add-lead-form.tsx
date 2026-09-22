import { addLead } from '@/app/actions';

export function AddLeadForm({ source }: { source: string }) {
  return (
    <form
      action={addLead}
      className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
    >
      <input type="hidden" name="source" value={source} />
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
