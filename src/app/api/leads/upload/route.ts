import { NextRequest, NextResponse } from 'next/server';
import { parseContactsCsv } from '@/lib/csv';
import { createClient } from '@/lib/supabase/server';
import type { LeadSource } from '@/lib/types';

const ALLOWED_SOURCES: LeadSource[] = ['Website', 'Offline Event', 'Referral', 'Research', 'Other'];

// Leads/Referrals/Research don't reliably have a LinkedIn URL or even an email (Research
// leads in particular are company-level research with no named contact at all — see
// src/app/(app)/research/page.tsx), so name+email/linkedin_url dedupe (used for Cynthia's
// LinkedIn upload) doesn't work here. Company is present on nearly every row across all
// three sources, so dedupe on normalized name+company instead.
function dedupeKey(name: string | null, company: string | null): string {
  return `${(name ?? '').trim().toLowerCase()}|||${(company ?? '').trim().toLowerCase()}`;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const sourceRaw = (formData.get('source') as string) || '';
  const source = ALLOWED_SOURCES.includes(sourceRaw as LeadSource) ? (sourceRaw as LeadSource) : null;

  if (!file) return NextResponse.json({ error: 'no file provided' }, { status: 400 });
  if (!source) return NextResponse.json({ error: 'invalid source' }, { status: 400 });

  const text = await file.text();
  const contacts = parseContactsCsv(text);
  if (contacts.length === 0) {
    return NextResponse.json({ error: 'no rows found — check the file has a header row' }, { status: 400 });
  }

  const { data: existing } = await supabase.from('website_leads').select('name, company').eq('source', source);
  const existingKeys = new Set((existing ?? []).map((r) => dedupeKey(r.name, r.company)));

  let skippedDuplicates = 0;
  const rows: Record<string, unknown>[] = [];
  const seenThisUpload = new Set<string>();

  for (const c of contacts) {
    if (!c.name && !c.company) continue;

    const key = dedupeKey(c.name, c.company);
    if (existingKeys.has(key) || seenThisUpload.has(key)) {
      skippedDuplicates++;
      continue;
    }
    seenThisUpload.add(key);
    rows.push({
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      job_title: c.job_title,
      linkedin_url: c.linkedin_url,
      source,
      status: 'New'
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('website_leads').insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, imported: rows.length, skippedDuplicates });
}
