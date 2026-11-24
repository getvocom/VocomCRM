import { addAccount } from '@/app/actions';
import type { Rep } from '@/lib/types';

export function AddAccountForm({ reps }: { reps: Rep[] }) {
  return (
    <form
      action={addAccount}
      className="card mb-6 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-2">Name</span>
        <input
          name="name"
          required
          className="field w-full"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-2">HQ</span>
        <input name="hq" className="field w-full" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-2">Website</span>
        <input name="website" className="field w-full" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-2">Industry</span>
        <input name="industry" className="field w-full" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-2">Company size</span>
        <input
          name="company_size"
          className="field w-full"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-2">Assigned rep</span>
        <select
          name="assigned_rep_id"
          className="field w-full"
        >
          <option value="">Unassigned</option>
          {reps.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-2">Notes</span>
        <input name="notes" className="field w-full" />
      </label>
      <div className="sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          className="btn btn-primary"
        >
          Add account
        </button>
      </div>
    </form>
  );
}
