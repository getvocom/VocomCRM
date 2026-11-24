import { addDeal } from '@/app/actions';

export function AddDealForm() {
  return (
    <form
      action={addDeal}
      className="mb-6 grid grid-cols-1 gap-3 card p-5 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-2">Customer name</label>
        <input
          name="customer_name"
          required
          className="w-full field"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-2">Company</label>
        <input name="company" className="w-full field" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-2">PIC (point of contact)</label>
        <input name="pic" className="w-full field" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-2">Product / Order</label>
        <input name="product" className="w-full field" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-2">Value ($)</label>
        <input
          name="value"
          type="number"
          min="0"
          step="0.01"
          className="w-full field"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-2">Start date</label>
        <input
          name="start_date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-full field"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-2">Expected close</label>
        <input
          name="expected_close_date"
          type="date"
          className="w-full field"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-2">Notes</label>
        <input name="notes" className="w-full field" />
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          className="rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Add deal
        </button>
      </div>
    </form>
  );
}
