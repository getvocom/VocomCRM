import crypto from 'crypto';

// Shared check for our own signed webhooks (website forms, email sync). The sender signs
// `${timestamp}.${rawBody}` with a shared secret (hex HMAC-SHA256) and sends
//   x-vocom-timestamp: <unix seconds>
//   x-vocom-signature: sha256=<hex>
// Requests older than 10 minutes are rejected so a captured request cannot be replayed later.

const MAX_AGE_SECONDS = 600;

export function verifySignature(rawBody: string, headers: Headers, secret: string): boolean {
  const timestamp = headers.get('x-vocom-timestamp') ?? '';
  const header = headers.get('x-vocom-signature') ?? '';
  if (!timestamp || !header) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > MAX_AGE_SECONDS) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
