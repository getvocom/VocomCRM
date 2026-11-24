import { BarTrend } from '@/components/bar-trend';
import { PageHeader } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import type { LinkedInAudienceStat, LinkedInDailyStat } from '@/lib/types';
import { AudienceBreakdown } from './audience-breakdown';
import { UploadForm } from './upload-form';

export default async function LinkedInMarketingPage() {
  const supabase = await createClient();

  const [{ data: dailyStats }, { data: audienceStats }] = await Promise.all([
    supabase.from('linkedin_daily_stats').select('*').order('date').returns<LinkedInDailyStat[]>(),
    supabase.from('linkedin_audience_stats').select('*').returns<LinkedInAudienceStat[]>()
  ]);

  return (
    <div>
      <PageHeader
        group="Marketing"
        title="LinkedIn Marketing Data"
        className="mb-6"
        description={
          <>
            LinkedIn only lets you export aggregate counts and demographics, not names — get
            these from your Page admin: Analytics &rarr; Followers / Visitors &rarr; Export.
            Upload the same files again later to add new days; existing days get updated, not
            duplicated.
          </>
        }
      />

      <UploadForm />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <BarTrend
          title="New followers"
          data={(dailyStats ?? []).map((s) => ({ date: s.date, value: s.new_followers }))}
          colorClass="bg-chart-blue"
        />
        <BarTrend
          title="Unique visitors"
          data={(dailyStats ?? []).map((s) => ({ date: s.date, value: s.unique_visitors }))}
          colorClass="bg-chart-green"
        />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-ink">Follower demographics</h2>
      <div className="mb-6">
        <AudienceBreakdown stats={audienceStats ?? []} source="followers" />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-ink">Visitor demographics</h2>
      <AudienceBreakdown stats={audienceStats ?? []} source="visitors" />
    </div>
  );
}
