import { addLinkedInActivity } from '@/app/actions';
import { PageHeader } from '@/components/ui';
import { chartClass } from '@/lib/pill-colors';
import { BreakdownBars } from '@/components/breakdown-bars';
import { createClient } from '@/lib/supabase/server';
import { ACTIVITY_TYPES, DEAL_STATUSES, type LinkedInActivity, type Rep } from '@/lib/types';
import { LinkedInActivityTable } from './table';

export default async function LinkedInActivityPage() {
  const supabase = await createClient();

  const [{ data: activity }, { data: reps }] = await Promise.all([
    supabase
      .from('linkedin_activity')
      .select('*')
      .order('date_logged', { ascending: false })
      .returns<LinkedInActivity[]>(),
    supabase.from('reps').select('*').order('name').returns<Rep[]>()
  ]);

  const allActivity = activity ?? [];
  const activityTypeBreakdown = ACTIVITY_TYPES.map((type) => ({
    label: type,
    count: allActivity.filter((a) => a.activity === type).length
  }));
  const dealBreakdown = DEAL_STATUSES.map((status) => ({
    label: status,
    count: allActivity.filter((a) => a.deal_status === status).length,
    colorClass: chartClass(status)
  }));
  const sentCount = allActivity.filter((a) => a.connection_sent).length;
  const acceptedCount = allActivity.filter((a) => a.connection_accepted).length;

  return (
    <div>
      <PageHeader
        group="Marketing"
        title="LinkedIn Activity"
        className="mb-6"
        description={
          <>
            LinkedIn doesn&apos;t expose followers/visits/likes via API, so this is logged manually —
            check LinkedIn&apos;s own notifications, then add what&apos;s new here.
          </>
        }
      />

      {allActivity.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <BreakdownBars title="Activity type" items={activityTypeBreakdown} />
          <BreakdownBars title="Deal status" items={dealBreakdown} />
          <BreakdownBars
            title="Connection funnel"
            items={[
              { label: 'Logged', count: allActivity.length, colorClass: 'bg-chart-grey' },
              { label: 'Sent', count: sentCount, colorClass: 'bg-chart-blue' },
              { label: 'Accepted', count: acceptedCount, colorClass: 'bg-chart-green' }
            ]}
          />
        </div>
      )}

      <form
        action={addLinkedInActivity}
        className="mb-6 flex flex-wrap items-end gap-3 card p-5"
      >
        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-xs font-medium text-ink-2">Prospect</label>
          <input
            name="prospect"
            required
            className="w-full field sm:w-auto"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-xs font-medium text-ink-2">Company</label>
          <input
            name="company"
            className="w-full field sm:w-auto"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-xs font-medium text-ink-2">LinkedIn URL</label>
          <input
            name="linkedin_url"
            className="w-full field sm:w-56"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-xs font-medium text-ink-2">Activity</label>
          <select
            name="activity"
            className="w-full field sm:w-auto"
          >
            {ACTIVITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="w-full btn btn-primary sm:w-auto"
        >
          Log activity
        </button>
      </form>

      <LinkedInActivityTable activity={allActivity} reps={reps ?? []} dealStatuses={DEAL_STATUSES} />
    </div>
  );
}
