import { BreakdownBars } from '@/components/breakdown-bars';
import { PageHeader } from '@/components/ui';
import { chartClass } from '@/lib/pill-colors';
import { createClient } from '@/lib/supabase/server';
import { FEEDBACK_STATUSES, type Feedback, type Rep } from '@/lib/types';
import { AddFeedbackForm } from './add-feedback-form';
import { FeedbackTable } from './table';

export default async function FeedbackPage() {
  const supabase = await createClient();

  const [{ data: items }, { data: reps }] = await Promise.all([
    supabase.from('feedback').select('*').order('created_at', { ascending: false }).returns<Feedback[]>(),
    supabase.from('reps').select('*').order('name').returns<Rep[]>()
  ]);

  const allItems = items ?? [];
  const breakdown = FEEDBACK_STATUSES.map((status) => ({
    label: status,
    count: allItems.filter((i) => i.status === status).length,
    colorClass: chartClass(status)
  }));

  return (
    <div>
      <PageHeader
        group="General"
        title="Feedback"
        className="mb-6"
        description="Feature requests and fixes for this CRM — tag who submitted it, track status."
      />

      {allItems.length > 0 && (
        <div className="mb-6 max-w-md">
          <BreakdownBars title="By status" items={breakdown} />
        </div>
      )}

      <AddFeedbackForm reps={reps ?? []} />

      <FeedbackTable items={allItems} reps={reps ?? []} />
    </div>
  );
}
