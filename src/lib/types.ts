export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Won' | 'Lost';
export type LeadSource =
  | 'Website'
  | 'Offline Event'
  | 'Referral'
  | 'Research'
  | 'LinkedIn'
  // Warm replies from an Instantly campaign that someone flags by hand. The full list of
  // everyone emailed stays in instantly_leads (/instantly-leads).
  | 'Cold Email'
  | 'Other';
// Where a deal originally came from. Same as LeadSource plus Instantly (cold-email campaigns),
// which live in their own table rather than website_leads.
export type DealSource = LeadSource | 'Instantly';
export const DEAL_SOURCES: DealSource[] = ['Website', 'LinkedIn', 'Instantly', 'Offline Event', 'Referral', 'Research', 'Other'];
// Channels that count as marketing in the Marketing Results page.
export const MARKETING_SOURCES: DealSource[] = ['Website', 'LinkedIn', 'Instantly'];

export type LeadPriority = 'Low' | 'Medium' | 'High';
export type LeadPhase = 'Rep Assigned' | 'Cynthia Follow-up' | 'Escalated to Cold Call';
export type DealStatus = 'Prospecting' | 'Connected' | 'Conversation' | 'Meeting' | 'Won' | 'Lost';
export type LinkedInActivityType = 'Follow' | 'Visit' | 'Like';

export const LEAD_STATUSES: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Won', 'Lost'];
export const LEAD_SOURCES: LeadSource[] = [
  'Website',
  'Cold Email',
  'Offline Event',
  'Referral',
  'Research',
  'LinkedIn',
  'Other'
];
// Sources listed on the Leads page: everything except Research, which keeps its own page.
// LinkedIn and Referral leads ALSO have their own pages (same rows, not copies).
export const LEADS_PAGE_SOURCES: LeadSource[] = LEAD_SOURCES.filter((s) => s !== 'Research');
// Sources a CSV can be uploaded as from the Leads page. LinkedIn uploads go through
// LinkedIn Outreach (different dedupe), Research through the Research page.
export const LEADS_UPLOAD_SOURCES: LeadSource[] = ['Website', 'Cold Email', 'Offline Event', 'Referral', 'Other'];
// The Dashboard's "Website leads received" chart still charts the pre-tabs Leads set
// (everything except Referral, Research and LinkedIn), as a PostgREST list for
// .not('source', 'in', ...). Filtering by exclusion means the query never names
// 'Cold Email', which Postgres rejects outright on a database without migration_022.
export const DIRECT_LEADS_EXCLUDED_FILTER = '(Referral,Research,LinkedIn)';
export const LEAD_PRIORITIES: LeadPriority[] = ['Low', 'Medium', 'High'];
export const LEAD_PHASES: LeadPhase[] = ['Rep Assigned', 'Cynthia Follow-up', 'Escalated to Cold Call'];
export const DEAL_STATUSES: DealStatus[] = [
  'Prospecting',
  'Connected',
  'Conversation',
  'Meeting',
  'Won',
  'Lost'
];
export const ACTIVITY_TYPES: LinkedInActivityType[] = ['Follow', 'Visit', 'Like'];

export type DealPipelineStatus = 'Prospecting' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
export const DEAL_PIPELINE_STATUSES: DealPipelineStatus[] = [
  'Prospecting',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost'
];

export type FeedbackStatus = 'Open' | 'In Progress' | 'Resolved' | "Won't Fix";
export const FEEDBACK_STATUSES: FeedbackStatus[] = ['Open', 'In Progress', 'Resolved', "Won't Fix"];

export type Region = 'US-East' | 'US-Central' | 'US-West' | 'Canada' | 'APAC' | 'EMEA' | 'Other';
export const REGIONS: Region[] = ['US-East', 'US-Central', 'US-West', 'Canada', 'APAC', 'EMEA', 'Other'];

export type Division = 'Vocom International' | 'Vocom AI';
export const DIVISIONS: Division[] = ['Vocom International', 'Vocom AI'];

export interface Rep {
  id: string;
  name: string;
}

export interface Lead {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  company: string | null;
  location: string | null;
  company_size: string | null;
  use_case: string | null;
  source: LeadSource;
  priority: LeadPriority | null;
  assigned_rep_id: string | null;
  status: LeadStatus;
  contacted_date: string | null;
  notes: string | null;
  deal_id: string | null;
  hot: boolean;
  phase: LeadPhase | null;
}

export interface Account {
  id: string;
  name: string;
  hq: string | null;
  website: string | null;
  industry: string | null;
  company_size: string | null;
  region: string | null;
  notes: string | null;
  assigned_rep_id: string | null;
  created_at: string;
  updated_at: string;
  kind: AccountKind | null;
  account_status: AccountStatus | null;
  location: string | null;
  supporters: string[];
  economic_buyer: string | null;
  champions: string | null;
  info: KeyValue[];
}

export interface AccountContact {
  id: string;
  account_id: string;
  name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  role: string | null;
}

export interface InstantlyLead {
  id: string;
  synced_at: string;
  campaign: string | null;
  name: string | null;
  email: string;
  company: string | null;
  job_title: string | null;
  phone: string | null;
  linkedin_url: string | null;
  interest_status: string;
  assigned_rep_id: string | null;
  sales_status: LeadStatus;
  notes: string | null;
  reply_text: string | null;
  reply_phone: string | null;
  alternative_email: string | null;
  needs_cold_call: boolean;
  last_reply_at: string | null;
  campaign_status: string | null;
  sequence_status: string | null;
  last_contacted_at: string | null;
}

export interface LinkedInActivity {
  id: string;
  date_logged: string;
  prospect: string | null;
  company: string | null;
  linkedin_url: string | null;
  activity: LinkedInActivityType | null;
  connection_sent: boolean;
  connection_accepted: boolean;
  deal_status: DealStatus;
  assigned_rep_id: string | null;
  notes: string | null;
}

export interface LinkedInDailyStat {
  date: string;
  new_followers: number;
  unique_visitors: number;
  page_views: number;
}

export interface LinkedInAudienceStat {
  id: string;
  source: 'followers' | 'visitors';
  category: string;
  label: string;
  value: number;
}

export interface MasterContact {
  id: string;
  origin: 'website_leads' | 'instantly_leads' | 'linkedin_activity' | 'imported_contacts' | 'account_contacts';
  source: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  touched_at: string | null;
}

export interface SeoSearchQuery {
  id: string;
  date: string;
  query: string;
  page: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SeoDailyTotal {
  id: string;
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SeoLandingPage {
  id: string;
  date: string;
  page_path: string;
  sessions: number;
  active_users: number;
  conversions: number;
}

export interface ContentSuggestion {
  title: string;
  reason: string;
  based_on_query: string;
}

export interface Deal {
  id: string;
  customer_name: string;
  company: string | null;
  pic: string | null;
  product: string | null;
  value: number;
  status: DealPipelineStatus;
  start_date: string;
  expected_close_date: string | null;
  assigned_rep_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  account_id: string | null;
  division: string | null;
  source: DealSource | null;
  stage_changed_at: string;
  // Opportunity-tracker fields (migration_021). `value` is the quoted price to the
  // customer (0 = not priced yet) and `cost` is what Vocom pays.
  title: string | null;
  stage: DealStage | null;
  priority: DealPriority | null;
  deal_type: DealType | null;
  track: DealTrack | null;
  cost: number | null;
  quote_basis: string | null;
  cost_basis: string | null;
  summary: string | null;
  next_action: string | null;
  next_action_date: string | null;
  vendor_quotes: VendorQuote[];
  questions: DealQuestion[];
  specs: KeyValue[];
  deal_contacts: DealContactRef[];
  activity: ActivityEntry[];
  files: DealFile[];
}

export interface Feedback {
  id: string;
  title: string;
  description: string | null;
  submitted_by_rep_id: string | null;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  link: string | null;
  related_id: string | null;
  read: boolean;
  created_at: string;
}

export interface SeoMonthlyReport {
  id: string;
  month: string;
  summary: string;
  content_suggestions: ContentSuggestion[];
  stats: { opportunityCount?: number; queriesAnalyzed?: number };
  generated_at: string;
}


// ---------------------------------------------------------------------------
// Opportunity tracker (migration_021)
// ---------------------------------------------------------------------------

export type DealStage = 'Lead' | 'Quoting' | 'Quoted' | 'Negotiating' | 'Won' | 'On hold' | 'Lost';
export const DEAL_STAGES: DealStage[] = ['Lead', 'Quoting', 'Quoted', 'Negotiating', 'Won', 'On hold', 'Lost'];
export const OPEN_STAGES: DealStage[] = ['Lead', 'Quoting', 'Quoted', 'Negotiating'];

// deals.status is still what the Sales Dashboard and Deals totals read, so it is derived
// from the detailed stage. `null` means "leave status as it is" (a deal put on hold keeps
// the pipeline status it had).
export const STAGE_TO_STATUS: Record<DealStage, DealPipelineStatus | null> = {
  Lead: 'Prospecting',
  Quoting: 'Proposal',
  Quoted: 'Proposal',
  Negotiating: 'Negotiation',
  Won: 'Won',
  'On hold': null,
  Lost: 'Lost'
};

export type DealPriority = 'High' | 'Med' | 'Low';
export const DEAL_PRIORITIES: DealPriority[] = ['High', 'Med', 'Low'];

export type DealType = 'Fiber' | 'Data Center' | 'AI Servers' | 'Components' | 'RenOS';
export const DEAL_TYPES: DealType[] = ['Fiber', 'Data Center', 'AI Servers', 'Components', 'RenOS'];

export type DealTrack = 'Fiber' | 'RenOS' | 'Vocom';
export const DEAL_TRACKS: DealTrack[] = ['Fiber', 'RenOS', 'Vocom'];

// Owner commission on a won deal, as a share of profit (quoted price minus cost).
export const OWNER_COMMISSION_RATE = 0.15;

export type QuoteStatus = 'Not requested' | 'Requested' | 'Waiting' | 'Received' | 'Revised' | 'Declined' | 'Unconfirmed';
export const QUOTE_STATUSES: QuoteStatus[] = [
  'Not requested',
  'Requested',
  'Waiting',
  'Received',
  'Revised',
  'Declined',
  'Unconfirmed'
];
// Statuses where we are still waiting on the vendor.
export const WAITING_QUOTE_STATUSES: QuoteStatus[] = ['Requested', 'Waiting'];

export interface KeyValue {
  k: string;
  v: string;
}

export interface VendorQuote {
  vendor: string;
  status: QuoteStatus;
  quote: string;
  notes: string;
}

export interface DealQuestion {
  id: string;
  q: string;
  owner: string;
  done: boolean;
  answer?: string;
}

export interface DealContactRef {
  name: string;
  role: string;
}

export interface ActivityEntry {
  d: string; // ISO date (yyyy-mm-dd)
  t: string;
}

export interface DealFile {
  name: string;
  kind: string;
  size: string;
}

export type AccountKind =
  | 'Distributor'
  | 'End customer'
  | 'Data center operator'
  | 'Builder / contractor'
  | 'Carrier / ISP'
  | 'OEM / assembler'
  | 'Partner / referrer'
  | 'Other';
export const ACCOUNT_KINDS: AccountKind[] = [
  'Distributor',
  'End customer',
  'Data center operator',
  'Builder / contractor',
  'Carrier / ISP',
  'OEM / assembler',
  'Partner / referrer',
  'Other'
];

export type AccountStatus = 'Active' | 'Prospect' | 'Dormant' | 'Past';
export const ACCOUNT_STATUSES: AccountStatus[] = ['Active', 'Prospect', 'Dormant', 'Past'];

export type VendorKind =
  | 'Manufacturer'
  | 'Trading company'
  | 'Optics maker'
  | 'Assembler / OEM'
  | 'Distributor'
  | 'DC owner / operator'
  | 'Other';
export const VENDOR_KINDS: VendorKind[] = [
  'Manufacturer',
  'Trading company',
  'Optics maker',
  'Assembler / OEM',
  'Distributor',
  'DC owner / operator',
  'Other'
];

export type VendorRelationship = 'Active' | 'Prospect' | 'Past' | 'Inactive';
export const VENDOR_RELATIONSHIPS: VendorRelationship[] = ['Active', 'Prospect', 'Past', 'Inactive'];

export interface Vendor {
  id: string;
  name: string;
  kind: VendorKind | null;
  relationship: VendorRelationship | null;
  location: string | null;
  products: string | null;
  terms: string | null;
  notes: string | null;
  aliases: string[];
  contacts: DealContactRef[];
  created_at: string;
  updated_at: string;
}
