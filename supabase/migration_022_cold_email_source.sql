-- Run in Supabase SQL Editor, on its own.
--
-- Adds a "Cold Email" lead source for warm replies out of Instantly that someone flags by
-- hand and wants managed on the Leads page. The full list of everyone emailed stays in
-- instantly_leads (/instantly-leads) — this is only for the ones worth working.
--
-- NOTE: `alter type ... add value` cannot share a transaction with statements that use the
-- new value, so run this file by itself (no other statements, no surrounding BEGIN/COMMIT).
-- master_contacts already casts source to text, so the view needs no change.
alter type lead_source add value if not exists 'Cold Email';
