import type { LeadSource } from './types';

// Tabs on /leads, addressed as /leads?tab=<slug> so they're linkable and the browser back
// button works. "All leads" is every source except Research, which keeps its own page.
export type LeadsTabSlug = 'overview' | 'all' | 'website' | 'cold-email' | 'linkedin' | 'referral' | 'offline-event' | 'other';

export const LEADS_SOURCE_TABS: { slug: LeadsTabSlug; label: string; source: LeadSource }[] = [
  { slug: 'website', label: 'Website', source: 'Website' },
  { slug: 'cold-email', label: 'Cold Email', source: 'Cold Email' },
  { slug: 'linkedin', label: 'LinkedIn', source: 'LinkedIn' },
  { slug: 'referral', label: 'Referral', source: 'Referral' },
  { slug: 'offline-event', label: 'Offline Event', source: 'Offline Event' },
  { slug: 'other', label: 'Other', source: 'Other' }
];

// Where a lead with this source is listed, optionally pointing at the row itself
// (useHighlightRow scrolls to and highlights ?id=).
export function leadHref(source: LeadSource, id?: string): string {
  if (source === 'Research') return id ? `/research?id=${id}` : '/research';
  const slug = LEADS_SOURCE_TABS.find((t) => t.source === source)?.slug ?? 'all';
  return id ? `/leads?tab=${slug}&id=${id}` : `/leads?tab=${slug}`;
}
