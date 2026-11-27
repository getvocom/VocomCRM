import { NextRequest, NextResponse } from 'next/server';
import { isInternal, normalizeEmail, outsideAddresses } from '@/lib/email-addresses';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifySignature } from '@/lib/webhook-signature';

// Second half of the Gmail sync: stores date, subject, preview and addresses for messages
// that involve someone in the CRM (checked again here, whatever the script sent). Also the
// heartbeat: a run with no messages still updates sync_status.
//
// Body: { mailbox, messages: [{gmailId, threadId, from: {email,name}, recipients: [email],
//         subject, preview, sentAt}], internalAddresses?: [email], run?: {importing: boolean} }

const MAX_MESSAGES = 200;

interface Incoming {
  gmailId?: unknown;
  threadId?: unknown;
  from?: { email?: unknown; name?: unknown };
  recipients?: unknown;
  subject?: unknown;
  preview?: unknown;
  sentAt?: unknown;
}

// Gmail previews arrive HTML-escaped.
function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[\u034f\u200b-\u200f\ufeff]/g, '')
    .trim();
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : null);

export async function POST(request: NextRequest) {
  const secret = process.env.EMAIL_SYNC_SECRET;
  if (!secret) return NextResponse.json({ error: 'email sync not configured' }, { status: 500 });
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers, secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { mailbox?: unknown; messages?: unknown; internalAddresses?: unknown; run?: { importing?: unknown } };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const mailbox = normalizeEmail(body.mailbox);
  if (!mailbox || !isInternal(mailbox)) return NextResponse.json({ error: 'unknown mailbox' }, { status: 400 });
  const incoming = (Array.isArray(body.messages) ? body.messages.slice(0, MAX_MESSAGES) : []) as Incoming[];

  const ours = (Array.isArray(body.internalAddresses) ? body.internalAddresses.slice(0, 50) : [])
    .map(normalizeEmail)
    .filter((e): e is string => !!e);

  const parsed = incoming.flatMap((m) => {
    const from = normalizeEmail(m.from?.email);
    const sentAt = new Date(typeof m.sentAt === 'string' ? m.sentAt : NaN);
    if (typeof m.gmailId !== 'string' || typeof m.threadId !== 'string' || !from || Number.isNaN(sentAt.getTime())) return [];
    const participants = outsideAddresses([from, ...(Array.isArray(m.recipients) ? m.recipients.slice(0, 100) : [])], ours);
    if (participants.length === 0) return []; // internal-only mail
    return [
      {
        gmail_id: m.gmailId.slice(0, 64),
        thread_id: m.threadId.slice(0, 64),
        mailbox,
        direction: isInternal(from, ours) ? 'out' : 'in',
        from_email: from,
        from_name: text(m.from?.name, 120),
        participants,
        subject: text(m.subject, 300),
        preview: typeof m.preview === 'string' ? decodeEntities(m.preview).slice(0, 300) : null,
        sent_at: sentAt.toISOString()
      }
    ];
  });

  try {
    const supabase = createAdminClient();
    let stored = 0;
    if (parsed.length > 0) {
      const addresses = [...new Set(parsed.flatMap((m) => m.participants))];
      const { data: knownData, error: knownError } = await supabase.rpc('crm_known_emails', { addresses });
      if (knownError) throw new Error(knownError.message);
      const known = new Set((knownData ?? []) as string[]);
      const rows = parsed.filter((m) => m.participants.some((p) => known.has(p)));
      if (rows.length > 0) {
        // ignoreDuplicates: a re-sent message must not undo "Hide from CRM".
        const { data, error } = await supabase
          .from('email_messages')
          .upsert(rows, { onConflict: 'gmail_id', ignoreDuplicates: true })
          .select('id');
        if (error) throw new Error(error.message);
        stored = data?.length ?? 0;
      }
    }

    const { error: statusError } = await supabase.from('sync_status').upsert({
      key: `gmail:${mailbox}`,
      last_run_at: new Date().toISOString(),
      details: { importing: body.run?.importing === true, lastStored: stored }
    });
    if (statusError) throw new Error(statusError.message);

    return NextResponse.json({ ok: true, received: incoming.length, stored });
  } catch (err) {
    console.error('Email store failed:', err);
    return NextResponse.json({ error: 'store failed' }, { status: 500 });
  }
}
