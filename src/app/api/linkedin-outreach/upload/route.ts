import { NextRequest, NextResponse } from 'next/server';
import { parseContactsCsv } from '@/lib/csv';
import { createClient } from '@/lib/supabase/server';

function normalizeUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, '');
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'no file provided' }, { status: 400 });

  const text = await file.text();
  const contacts = parseContactsCsv(text);
  if (contacts.length === 0) {
    return NextResponse.json({ error: 'no rows found — check the file has a header row' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('website_leads')
    .select('linkedin_url')
    .eq('source', 'LinkedIn')
    .not('linkedin_url', 'is', null);
  const existingUrls = new Set((existing ?? []).map((r) => normalizeUrl(r.linkedin_url as string)));

  let skippedDuplicates = 0;
  let missingLinkedinUrl = 0;
  const rows: Record<string, unknown>[] = [];
  const seenThisUpload = new Set<string>();

  for (const c of contacts) {
    const fields = {
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      job_title: c.job_title,
      linkedin_url: c.linkedin_url,
      source: 'LinkedIn',
      status: 'New'
    };

    if (!c.linkedin_url) {
      missingLinkedinUrl++;
      rows.push(fields);
      continue;
    }

    const key = normalizeUrl(c.linkedin_url);
    if (existingUrls.has(key) || seenThisUpload.has(key)) {
      skippedDuplicates++;
      continue;
    }
    seenThisUpload.add(key);
    rows.push(fields);
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('website_leads').insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, imported: rows.length, skippedDuplicates, missingLinkedinUrl });
}
