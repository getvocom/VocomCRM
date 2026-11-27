// Which addresses count as "us". Mail between these is never stored, and a message sent
// from one of them is outbound. Keep in step with CONFIG in the Gmail script
// ("Claude outputs/email-sync/Code.gs").
export const INTERNAL_DOMAINS = ['getvocom.com', 'vocom.com', 'thevocom.co', 'rengroup.ai', 'topiku.co'];
// Single outside addresses that also count as us (for example an agency inbox) are listed only
// in the Gmail script, which sends them with each batch, so they stay out of this repository.

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/.test(email) && email.length <= 254 ? email : null;
}

export function isInternal(email: string, extra: string[] = []): boolean {
  return extra.includes(email) || INTERNAL_DOMAINS.some((d) => email.endsWith(`@${d}`));
}

// Unique, valid, outside addresses.
export function outsideAddresses(values: unknown[], extra: string[] = []): string[] {
  const out = new Set<string>();
  for (const v of values) {
    const email = normalizeEmail(v);
    if (email && !isInternal(email, extra)) out.add(email);
  }
  return [...out];
}
