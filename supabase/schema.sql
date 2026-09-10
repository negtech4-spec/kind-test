-- Run this once in the Supabase SQL Editor for the Kindred Path quiz.
-- The app accesses these tables only from server routes using the service-role
-- key. Do not put that key in a NEXT_PUBLIC_ environment variable.

create table if not exists public.kindred_path_quiz_events (
  id text primary key,
  session_id text not null,
  visit_id text not null default 'legacy',
  step text not null,
  event_type text not null default 'action'
    check (event_type in ('page_view', 'action')),
  path text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  timestamp bigint not null
);

alter table public.kindred_path_quiz_events
  add column if not exists visit_id text not null default 'legacy';
alter table public.kindred_path_quiz_events
  add column if not exists event_type text not null default 'action';
alter table public.kindred_path_quiz_events
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists kindred_path_quiz_events_timestamp_idx
  on public.kindred_path_quiz_events (timestamp desc);

create index if not exists kindred_path_quiz_events_session_id_idx
  on public.kindred_path_quiz_events (session_id);

create index if not exists kindred_path_quiz_events_visit_id_idx
  on public.kindred_path_quiz_events (visit_id);

create table if not exists public.kindred_path_quiz_leads (
  id text primary key,
  session_id text not null,
  full_name text not null,
  phone text not null,
  email text,
  q1 text,
  q2 text,
  q3 text,
  q4 text,
  consultation_type text not null default 'in_person'
    check (consultation_type in ('in_person', 'remote')),
  source text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  landing_path text,
  timestamp bigint not null
);

alter table public.kindred_path_quiz_leads add column if not exists source text;
alter table public.kindred_path_quiz_leads add column if not exists referrer text;
alter table public.kindred_path_quiz_leads add column if not exists utm_source text;
alter table public.kindred_path_quiz_leads add column if not exists utm_medium text;
alter table public.kindred_path_quiz_leads add column if not exists utm_campaign text;
alter table public.kindred_path_quiz_leads add column if not exists utm_term text;
alter table public.kindred_path_quiz_leads add column if not exists utm_content text;
alter table public.kindred_path_quiz_leads add column if not exists landing_path text;

create index if not exists kindred_path_quiz_leads_timestamp_idx
  on public.kindred_path_quiz_leads (timestamp desc);

create index if not exists kindred_path_quiz_leads_source_idx
  on public.kindred_path_quiz_leads (source);

-- Admin-created, first-party tracking links. Each link safely redirects only
-- to a known quiz destination and carries its own UTM/creative identifier.
create table if not exists public.kindred_path_campaign_links (
  id text primary key,
  slug text not null unique,
  label text not null,
  source text not null,
  medium text not null,
  campaign text not null,
  destination text not null
    check (destination in ('/', '/quiz')),
  created_at bigint not null
);

create index if not exists kindred_path_campaign_links_created_at_idx
  on public.kindred_path_campaign_links (created_at desc);

create index if not exists kindred_path_campaign_links_slug_idx
  on public.kindred_path_campaign_links (slug);

alter table public.kindred_path_quiz_events enable row level security;
alter table public.kindred_path_quiz_leads enable row level security;
alter table public.kindred_path_campaign_links enable row level security;

-- No public RLS policies are intentionally created. The browser cannot read
-- or write these tables; only the server-side service role may access them.
