import { addRep, deleteRep } from '@/app/actions';
import { BreakdownBars } from '@/components/breakdown-bars';
import { DeleteButton } from '@/components/delete-button';
import { PageHeader } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import type { Rep } from '@/lib/types';

export default async function SalesTeamPage() {
  const supabase = await createClient();
  const { data: reps } = await supabase.from('reps').select('*').order('name').returns<Rep[]>();
  const allReps = reps ?? [];

  const [{ data: websiteAssignments }, { data: instantlyAssignments }, { data: linkedinAssignments }] =
    await Promise.all([
      supabase.from('website_leads').select('assigned_rep_id').not('assigned_rep_id', 'is', null),
      supabase.from('instantly_leads').select('assigned_rep_id').not('assigned_rep_id', 'is', null),
      supabase.from('linkedin_activity').select('assigned_rep_id').not('assigned_rep_id', 'is', null)
    ]);

  const allAssignments = [
    ...(websiteAssignments ?? []),
    ...(instantlyAssignments ?? []),
    ...(linkedinAssignments ?? [])
  ];

  const workload = allReps.map((rep) => ({
    label: rep.name,
    count: allAssignments.filter((a) => a.assigned_rep_id === rep.id).length
  }));

  return (
    <div>
      <PageHeader
        group="General"
        title="Sales Team"
        className="mb-6"
        description="Add a rep here and they immediately show up in every Assigned Rep dropdown."
      />

      <form
        action={addRep}
        className="mb-6 flex items-end gap-3 card p-5"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-2">Rep name</label>
          <input name="name" required aria-label="Rep name" className="field" />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
        >
          Add rep
        </button>
      </form>

      {allReps.length > 0 && (
        <div className="mb-6 max-w-md">
          <BreakdownBars title="Leads assigned per rep (all sources)" items={workload} />
        </div>
      )}

      <ul className="card divide-y divide-divider overflow-hidden">
        {allReps.map((rep) => (
          <li key={rep.id} className="flex items-center justify-between px-4 py-3 text-sm text-ink">
            {rep.name}
            <DeleteButton
              onDelete={deleteRep.bind(null, rep.id)}
              confirmMessage={`Delete ${rep.name}? Their existing assignments will show as Unassigned.`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
