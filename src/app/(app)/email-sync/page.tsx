import { PageHeader, StatCard } from '@/components/ui';
import { timeAgo } from '@/lib/email-activity';
import { createClient } from '@/lib/supabase/server';
import { SuggestionButtons } from './suggestion-buttons';

// Health of the Gmail sync, plus addresses it found for CRM people who have none.
const STALE_MINUTES = 30;

function minutesSince(iso: string) {
  return (new Date().getTime() - new Date(iso).getTime()) / 60000;
}

export default async function EmailSyncPage() {
  const supabase = await createClient();
  const [status, messages, suggestions] = await Promise.all([
    supabase.from('sync_status').select('key, last_run_at, details').like('key', 'gmail:%'),
    supabase.from('email_messages').select('*', { count: 'exact', head: true }).eq('hidden', false),
    supabase.from('email_suggestions').select('*').eq('status', 'pending').order('record_label').limit(200)
  ]);

  const notSetUp = !!status.error;
  const mailboxes = status.data ?? [];

  return (
    <div>
      <PageHeader
        group="General"
        title="Email Sync"
        description="Email to and from people in the CRM, checked every 5 minutes. Only the date, subject, preview and addresses are stored. Label a thread “No CRM” in Gmail to keep it out."
      />

      {notSetUp ? (
        <p className="card mt-6 p-6 text-sm text-warn">
          Email sync isn&apos;t set up yet: run migration_023_email_sync.sql in the Supabase SQL Editor.
        </p>
      ) : mailboxes.length === 0 ? (
        <p className="card mt-6 p-6 text-sm text-ink-2">
          No mailbox has checked in yet. Install the Gmail script (see “Claude outputs/email-sync/README.md”) and run setup.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {mailboxes.map((m) => {
            const stale = minutesSince(m.last_run_at) > STALE_MINUTES;
            const importing = (m.details as { importing?: boolean })?.importing;
            return (
              <StatCard
                key={m.key}
                label={m.key.replace('gmail:', '')}
                value={`${timeAgo(m.last_run_at)} ago`}
                sub={stale ? 'Not checking in: open the script’s Executions log' : importing ? 'Importing past mail…' : 'Up to date'}
                tone={stale ? 'warn' : 'good'}
              />
            );
          })}
          <StatCard label="Emails in the CRM" value={(messages.count ?? 0).toLocaleString()} />
        </div>
      )}

      <h2 className="mb-1 mt-8 text-[15px] font-semibold text-ink">Suggested email addresses</h2>
      <p className="mb-3 text-sm text-ink-2">
        These people have no address in the CRM, and someone with the same full name appears in the mailbox. Check each one
        before accepting.
      </p>
      {(suggestions.data ?? []).length === 0 ? (
        <p className="card p-6 text-sm text-ink-2">Nothing to review.</p>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>CRM person</th>
                <th>Record</th>
                <th>Name in the email</th>
                <th>Address</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(suggestions.data ?? []).map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap font-medium text-ink">{s.record_label}</td>
                  <td className="text-ink-2">{s.record_table === 'website_leads' ? 'Lead' : 'Account contact'}</td>
                  <td className="text-ink-3">{s.display_name}</td>
                  <td className="text-ink-3">{s.email}</td>
                  <td>
                    <SuggestionButtons id={s.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
