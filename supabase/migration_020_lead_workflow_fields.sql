-- Run in Supabase SQL Editor.
-- Adds two lead-workflow fields to website_leads: a manual "hot" flag any rep can toggle
-- to flag a promising lead, and a "phase" field tracking where a lead sits in the actual
-- handoff workflow (assigned straight to a rep, or handed to Cynthia for LinkedIn
-- follow-up, escalated to sales cold-call if that doesn't land). Both are
-- app-level-controlled (StatusSelect + a TS union in src/lib/types.ts), matching the
-- existing region/division/source convention — no Postgres enum. No RLS changes needed:
-- the existing "authenticated read/write" policy on website_leads already covers new
-- columns.

alter table website_leads add column hot boolean not null default false;

-- phase: null (Unassigned) | 'Rep Assigned' | 'Cynthia Follow-up' | 'Escalated to Cold Call'
alter table website_leads add column phase text;
