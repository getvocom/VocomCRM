// The app's pages, in sidebar order. Shared by the sidebar and the ⌘K search.
export const NAV_GROUPS: { label: string | null; links: { href: string; label: string }[] }[] = [
  {
    label: null,
    links: [{ href: '/', label: 'Dashboard' }]
  },
  {
    label: 'Sales',
    links: [
      { href: '/accounts', label: 'Accounts' },
      { href: '/leads', label: 'Leads' },
      { href: '/referrals', label: 'Referrals' },
      { href: '/research', label: 'Research' },
      { href: '/deals', label: 'Deals' },
      { href: '/vendors', label: 'Vendors' },
      { href: '/sales-dashboard', label: 'Sales Dashboard' }
    ]
  },
  {
    label: 'Marketing',
    links: [
      { href: '/marketing-results', label: 'Marketing Results' },
      { href: '/instantly-leads', label: 'Instantly Leads' },
      { href: '/linkedin-outreach', label: 'LinkedIn Outreach' },
      { href: '/linkedin-activity', label: 'LinkedIn Activity' },
      { href: '/linkedin-marketing', label: 'LinkedIn Marketing' },
      { href: '/seo', label: 'SEO' }
    ]
  },
  {
    label: 'General',
    links: [
      { href: '/contacts', label: 'Contacts' },
      { href: '/sales-team', label: 'Sales Team' },
      { href: '/feedback', label: 'Feedback' }
    ]
  }
];
