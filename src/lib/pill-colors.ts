// Pill colours for every status-like value in the app (lead source, status, priority,
// phase, deal stage, region, division). Kept outside the 'use client' StatusSelect so
// server components can read the map too — a plain value exported from a client module
// arrives in a server component as a client reference, not the object.
export const STATUS_COLORS: Record<string, string> = {
  New: 'bg-neutral-100 text-neutral-700',
  Contacted: 'bg-blue-100 text-blue-700',
  Qualified: 'bg-amber-100 text-amber-700',
  Prospecting: 'bg-neutral-100 text-neutral-700',
  Connected: 'bg-blue-100 text-blue-700',
  Conversation: 'bg-amber-100 text-amber-700',
  Meeting: 'bg-purple-100 text-purple-700',
  Won: 'bg-green-100 text-green-700',
  Lost: 'bg-red-100 text-red-700',
  Proposal: 'bg-blue-100 text-blue-700',
  Negotiation: 'bg-amber-100 text-amber-700',
  Open: 'bg-neutral-100 text-neutral-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Resolved: 'bg-green-100 text-green-700',
  "Won't Fix": 'bg-red-100 text-red-700',
  Website: 'bg-blue-100 text-blue-700',
  'Cold Email': 'bg-orange-100 text-orange-700',
  'Offline Event': 'bg-purple-100 text-purple-700',
  Referral: 'bg-green-100 text-green-700',
  Research: 'bg-amber-100 text-amber-700',
  LinkedIn: 'bg-sky-100 text-sky-700',
  Other: 'bg-neutral-100 text-neutral-500',
  Low: 'bg-neutral-100 text-neutral-500',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-red-100 text-red-700',
  // Region (accounts.region)
  'US-East': 'bg-blue-100 text-blue-700',
  'US-Central': 'bg-sky-100 text-sky-700',
  'US-West': 'bg-cyan-100 text-cyan-700',
  Canada: 'bg-red-100 text-red-700',
  APAC: 'bg-teal-100 text-teal-700',
  EMEA: 'bg-amber-100 text-amber-700',
  // 'Other' already defined above (from LeadSource) — Region's 'Other' reuses it
  // Division (deals.division)
  'Vocom International': 'bg-blue-100 text-blue-700',
  'Vocom AI': 'bg-purple-100 text-purple-700',
  // Lead phase (website_leads.phase)
  Unassigned: 'bg-neutral-100 text-neutral-500',
  'Rep Assigned': 'bg-blue-100 text-blue-700',
  'Cynthia Follow-up': 'bg-purple-100 text-purple-700',
  'Escalated to Cold Call': 'bg-red-100 text-red-700'
};
