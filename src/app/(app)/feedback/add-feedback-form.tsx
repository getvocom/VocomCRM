import { addFeedback } from '@/app/actions';
import type { Rep } from '@/lib/types';

export function AddFeedbackForm({ reps }: { reps: Rep[] }) {
  return (
    <form
      action={addFeedback}
      className="mb-6 grid grid-cols-1 gap-3 card p-5 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="lg:col-span-2">
        <label className="mb-1 block text-xs font-medium text-ink-2">Title</label>
        <input
          name="title"
          required
          placeholder="e.g. Add CSV export to Instantly Leads"
          className="w-full field"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-2">Submitted by</label>
        <select
          name="submitted_by_rep_id"
          className="w-full field"
        >
          <option value="">Unspecified</option>
          {reps.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <button
          type="submit"
          className="w-full btn btn-primary"
        >
          Submit feedback
        </button>
      </div>
      <div className="lg:col-span-4">
        <label className="mb-1 block text-xs font-medium text-ink-2">Description</label>
        <textarea
          name="description"
          rows={2}
          className="w-full field"
        />
      </div>
    </form>
  );
}
