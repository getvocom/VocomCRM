// Pill colours for every status-like value in the app (lead source, status, priority,
// phase, deal stage, region, division) — the one place they're defined.
// Kept outside the 'use client' StatusSelect so server components can read the map too:
// a plain value exported from a client module arrives in a server component as a client
// reference, not the object.
//
// Tones are the brief's soft-background / dark-text pairs (all ≥4.5:1). The colours
// themselves live in globals.css (--color-pill-*, --color-chart-*).

type Tone = 'blue' | 'orange' | 'sky' | 'purple' | 'teal' | 'grey' | 'amber' | 'green' | 'red' | 'rust';

// Written out in full so Tailwind can see every class name.
const TONE_PILL: Record<Tone, string> = {
  blue: 'bg-pill-blue text-pill-blue-ink',
  orange: 'bg-pill-orange text-pill-orange-ink',
  sky: 'bg-pill-sky text-pill-sky-ink',
  purple: 'bg-pill-purple text-pill-purple-ink',
  teal: 'bg-pill-teal text-pill-teal-ink',
  grey: 'bg-pill-grey text-pill-grey-ink',
  amber: 'bg-pill-amber text-pill-amber-ink',
  green: 'bg-pill-green text-pill-green-ink',
  red: 'bg-pill-red text-pill-red-ink',
  rust: 'bg-pill-rust text-pill-rust-ink'
};

// Solid fills for charts (bars, legend dots), matched to each pill tone.
const TONE_CHART: Record<Tone, string> = {
  blue: 'bg-chart-blue',
  orange: 'bg-chart-orange',
  sky: 'bg-chart-sky',
  purple: 'bg-chart-purple',
  teal: 'bg-chart-teal',
  grey: 'bg-chart-grey',
  amber: 'bg-chart-amber',
  green: 'bg-chart-green',
  red: 'bg-chart-red',
  rust: 'bg-chart-orange'
};

const VALUE_TONES: Record<string, Tone> = {
  // Lead source
  Website: 'blue',
  'Cold Email': 'orange',
  LinkedIn: 'sky',
  Referral: 'purple',
  'Offline Event': 'teal',
  Research: 'amber',
  Other: 'grey', // also Region 'Other'
  // Lead status
  New: 'grey',
  Contacted: 'blue',
  Qualified: 'amber',
  Won: 'green',
  Lost: 'red',
  // Contact / account stages
  Prospecting: 'grey',
  Connected: 'blue',
  Conversation: 'amber',
  Meeting: 'purple',
  // Deal status
  Proposal: 'blue',
  Negotiation: 'amber',
  // Deal stage (opportunity tracker). The Deals page draws these with .st-* classes in
  // components/opp/opp.css using the same tones.
  Lead: 'grey',
  Quoting: 'sky',
  Quoted: 'blue',
  Negotiating: 'amber',
  'On hold': 'grey',
  // Feedback status
  Open: 'grey',
  'In Progress': 'blue',
  Resolved: 'green',
  "Won't Fix": 'red',
  // Priority
  Low: 'grey',
  Medium: 'amber',
  Med: 'amber', // deal priority
  High: 'rust',
  // Region (accounts.region)
  'US-East': 'blue',
  'US-Central': 'sky',
  'US-West': 'teal',
  Canada: 'red',
  APAC: 'green',
  EMEA: 'amber',
  // Division (deals.division)
  'Vocom International': 'blue',
  'Vocom AI': 'purple',
  // Lead phase (website_leads.phase)
  Unassigned: 'grey',
  'Rep Assigned': 'blue',
  'Cynthia Follow-up': 'purple',
  'Escalated to Cold Call': 'rust'
};

export const DEFAULT_PILL = TONE_PILL.grey;

// value → "bg-… text-…" pill classes.
export const STATUS_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(VALUE_TONES).map(([value, tone]) => [value, TONE_PILL[tone]])
);

// value → solid "bg-…" class for bars and legend dots.
export const CHART_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(VALUE_TONES).map(([value, tone]) => [value, TONE_CHART[tone]])
);

export function pillClass(value: string | null | undefined) {
  return (value && STATUS_COLORS[value]) || DEFAULT_PILL;
}

export function chartClass(value: string | null | undefined) {
  return (value && CHART_COLORS[value]) || TONE_CHART.grey;
}
