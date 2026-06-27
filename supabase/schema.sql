-- HR Agent — Supabase schema
-- Run this in the Supabase SQL editor (or `psql`) to provision the database.
-- Safe to re-run: drops are guarded.

-- ---------- Enums ----------
do $$ begin
  create type role_type as enum ('hostess', 'security', 'event_staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type mission_status as enum ('pending_outreach', 'awaiting_replies', 'complete');
exception when duplicate_object then null; end $$;

do $$ begin
  create type whatsapp_status as enum ('pending', 'sent', 'replied_yes', 'replied_no', 'failed');
exception when duplicate_object then null; end $$;

-- ---------- candidates ----------
create table if not exists candidates (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  phone               text not null,               -- E.164, e.g. +33612345678
  role_type           role_type not null,
  years_experience    numeric not null default 0,
  day_rate            integer not null,            -- base day rate in EUR (pre-multiplier)
  city                text not null,
  languages           text[] not null default '{}',
  availability_status text not null default 'available',
  notes               text,
  created_at          timestamptz not null default now()
);

create index if not exists candidates_role_idx on candidates (role_type);
create index if not exists candidates_phone_idx on candidates (phone);

-- ---------- missions ----------
create table if not exists missions (
  id                    uuid primary key default gen_random_uuid(),
  role_type             role_type not null,
  people_needed         integer not null default 1,
  mission_date          date not null,
  start_time            time,
  end_time              time,
  city                  text not null,
  max_budget_per_person integer not null,
  description           text,
  status                mission_status not null default 'pending_outreach',
  pricing_summary       text,
  mission_brief_fr      text,
  created_at            timestamptz not null default now()
);

create index if not exists missions_created_idx on missions (created_at desc);

-- ---------- missions_candidates (join — drives the results page) ----------
create table if not exists missions_candidates (
  id               uuid primary key default gen_random_uuid(),
  mission_id       uuid not null references missions (id) on delete cascade,
  candidate_id     uuid not null references candidates (id) on delete cascade,
  rank             integer not null,
  rationale        text,
  suggested_rate   integer not null,
  confidence_score numeric,
  whatsapp_status  whatsapp_status not null default 'pending',
  twilio_sid       text,
  updated_at       timestamptz not null default now()
);

create index if not exists mc_mission_idx on missions_candidates (mission_id);
create unique index if not exists mc_mission_candidate_idx
  on missions_candidates (mission_id, candidate_id);

-- Seed candidates are inserted by scripts/seed.ts (so the data stays in one place).
