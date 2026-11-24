import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Receives website contact-form submissions from the vocom.ai site (hosted on Cloudflare).
// The browser never talks to this route: the site's own Cloudflare function (see
// "Claude outputs/website-form/") checks for spam, then forwards the submission here signed
// with a shared secret, so the secret never reaches visitors.
//
// Signature: hex HMAC-SHA256 of `${timestamp}.${rawBody}` using WEBSITE_FORM_SECRET, sent as
//   x-vocom-timestamp: <unix seconds>
//   x-vocom-signature: sha256=<hex>
// Requests older than 10 minutes are rejected so a captured request cannot be replayed later.

const MAX_AGE_SECONDS = 600;

function verify(rawBody: string, timestamp: string, header: string, secret: string) {
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > MAX_AGE_SECONDS) return false;
  const expected =
    'sha256=' + crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const secret = process.env.WEBSITE_FORM_SECRET;
  if (!secret) return NextResponse.json({ error: 'webhook not configured' }, { status: 500 });

  const rawBody = await request.text();
  const timestamp = request.headers.get('x-vocom-timestamp') ?? '';
  const signature = request.headers.get('x-vocom-signature') ?? '';
  if (!timestamp || !signature || !verify(rawBody, timestamp, signature, secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  // Tolerate label differences and stray whitespace in field names.
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) fields[k.trim().toLowerCase().replace(/[\s-]+/g, '_')] = v;
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = fields[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return null;
  };

  const first = pick('first_name', 'firstname');
  const last = pick('last_name', 'lastname');
  const name = pick('name', 'full_name') ?? ([first, last].filter(Boolean).join(' ') || null);
  const email = pick('email', 'email_address');
  const company = pick('company', 'company_name', 'organization');
  if (!name && !email) return NextResponse.json({ error: 'name or email required' }, { status: 400 });

  const supabase = createAdminClient();

  // A double-click or a retry should not create two leads.
  if (email) {
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('website_leads')
      .select('id')
      .eq('email', email)
      .eq('source', 'Website')
      .gte('created_at', since)
      .limit(1);
    if (recent && recent.length > 0) return NextResponse.json({ ok: true, duplicate: true });
  }

  // The site's forms use labels like "Use Case", "Phone Number", "Delivery Location", "I Am A",
  // "Fiber Type", "Footage", "Needed By". The enquiry text goes in use_case; everything else a
  // quote request carries is kept readable in notes (and the full payload stays in raw_payload).
  const message = pick('message', 'comments', 'enquiry', 'inquiry', 'details');
  const leadType = pick('lead_type', 'form');
  const isNewsletter = !!leadType && /newsletter/i.test(leadType);
  const topic = isNewsletter ? 'Newsletter sign-up' : pick('use_case', 'topic', 'interest');
  const detail = (label: string, ...keys: string[]) => {
    const v = pick(...keys);
    return v ? `${label}: ${v}` : null;
  };
  const notes =
    [
      topic && message ? `Message: ${message}` : null,
      detail('I am a', 'i_am_a', 'role_type'),
      detail('Fiber type', 'fiber_type'),
      detail('Fiber count', 'fiber_count'),
      detail('Footage', 'footage'),
      detail('Needed by', 'needed_by'),
      detail('Delivery location', 'delivery_location'),
      detail('Website', 'company_website'),
      detail('Form', 'form', 'lead_type'),
      detail('Page', 'page'),
      detail('Lead ID (site sheet)', 'lead_id'),
      detail('Free email address', 'free_email'),
      detail('Spam check unavailable', 'unverified'),
      detail('Requirements file', 'requirements_file')
    ]
      .filter(Boolean)
      .join('\n') || null;

  const { data: inserted, error } = await supabase
    .from('website_leads')
    .insert({
      name,
      email,
      phone: pick('phone', 'phone_number', 'telephone', 'mobile'),
      company,
      job_title: pick('job_title', 'title', 'role'),
      location: pick('location', 'delivery_location', 'country', 'city'),
      company_size: pick('company_size', 'size'),
      use_case: topic ?? message,
      notes,
      source: 'Website',
      raw_payload: data
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to insert website lead:', error);
    return NextResponse.json({ error: 'insert failed' }, { status: 500 });
  }

  await supabase.from('notifications').insert({
    type: 'website_lead',
    title: `New website lead: ${name || email || 'Unknown'}${company ? ` (${company})` : ''}`,
    link: '/leads',
    related_id: inserted?.id ?? null
  });

  return NextResponse.json({ ok: true });
}
