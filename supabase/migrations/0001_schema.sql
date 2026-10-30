-- Wholesale Command Center — Phase 1 schema (Supabase / Postgres)
-- Apply: Supabase dashboard → SQL editor, or `supabase db push`.
-- Pipeline stages (enforced by CHECK): New Lead → Attempted Contact →
-- Conversation → Offer Made → Under Contract → Nurture/Dead.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- properties
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  address text not null,
  city text not null default '',
  state text not null default '',
  zip text not null default '',
  county text not null default '',
  market text not null default '',
  property_type text not null default 'single-family',
  sale_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (address, city, state, zip)
);

-- ---------------------------------------------------------------- owners
create table if not exists owners (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  owner_type text not null default 'individual'
    check (owner_type in ('individual', 'entity', 'estate', 'unknown')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- leads
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  owner_id uuid references owners (id) on delete set null,
  lead_type text not null default '',
  source text not null default '',
  verification_status text not null default 'UNVERIFIED',
  flags text[] not null default '{}',
  flag_count int not null default 0,
  score numeric not null default 0,
  stage text not null default 'New Lead'
    check (stage in ('New Lead', 'Attempted Contact', 'Conversation',
                     'Offer Made', 'Under Contract', 'Nurture/Dead')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_stage_idx on leads (stage);
create index if not exists leads_property_idx on leads (property_id);

-- ---------------------------------------------------------------- phones
-- dnc_status gates outreach: seller/individual numbers cannot be
-- contacted until 'clear'. Published business buyer lines are exempt
-- via is_business_line + owner_kind (see src/lib/dncGate.ts).
create table if not exists phones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references owners (id) on delete cascade,
  buyer_id uuid,
  number text not null,
  label text not null default '',
  owner_kind text not null default 'seller'
    check (owner_kind in ('seller', 'buyer_business', 'buyer_individual')),
  is_business_line boolean not null default false,
  dnc_status text not null default 'unchecked'
    check (dnc_status in ('unchecked', 'clear', 'registered')),
  dnc_checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (number, owner_id)
);

-- ---------------------------------------------------------------- buyers
create table if not exists buyers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  market text not null default '',
  city text not null default '',
  state text not null default '',
  phone text not null default '',
  phone_source text not null default '',
  is_business_line boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- buy_boxes
create table if not exists buy_boxes (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references buyers (id) on delete cascade,
  markets text[] not null default '{}',
  property_types text[] not null default '{}',
  conditions text[] not null default '{}',
  max_price numeric,
  close_speed text not null default '',
  proof_of_funds boolean,
  assignments_ok boolean,
  summary text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- outreach_plans
-- status lifecycle: draft → pending_approval → approved → sent.
-- 'sent' is recorded only after Dajon approves (who/what/when) and
-- sends himself in Phase 1. No provider sends from the app in Phase 1.
create table if not exists outreach_plans (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  channel text not null default 'text'
    check (channel in ('text', 'call', 'letter')),
  body text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'approved', 'sent')),
  scheduled_for timestamptz,
  approved_by text,
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists outreach_plans_status_idx on outreach_plans (status);

-- ---------------------------------------------------------------- follow_ups
create table if not exists follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  kind text not null check (kind in ('7-day', '30-day')),
  due_date date not null,
  draft_body text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'done', 'skipped')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- dnc_entries
-- FTC telemarketer-download lists, one file per area code
-- (901 Memphis, 317 Indianapolis, 314 St. Louis, 216 Cleveland,
-- 713 Houston). Re-download at least every 31 days.
create table if not exists dnc_entries (
  id uuid primary key default gen_random_uuid(),
  area_code text not null,
  seven_digit_number text not null,
  source_file text not null default '',
  imported_at timestamptz not null default now(),
  unique (area_code, seven_digit_number)
);
create index if not exists dnc_entries_lookup_idx
  on dnc_entries (area_code, seven_digit_number);

-- ---------------------------------------------------------------- offers
-- Ginn math provenance is stored per offer — never silently recompute
-- an old row under a different formula.
create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  arv numeric not null,
  repairs numeric not null default 0,
  square_feet numeric,
  tier_multiplier numeric not null,
  mao numeric not null,
  lao numeric not null,
  formula text not null default 'ginn-tiered-v1: MAO=(ARV-repairs)*tier; LAO=MAO*0.70',
  status text not null default 'draft'
    check (status in ('draft', 'presented', 'accepted', 'rejected', 'dead')),
  created_at timestamptz not null default now()
);

-- Row Level Security: enable on every table. Phase 1 ships a single
-- private user (Dajon); add owner-scoped policies when auth lands.
alter table properties enable row level security;
alter table owners enable row level security;
alter table leads enable row level security;
alter table phones enable row level security;
alter table buyers enable row level security;
alter table buy_boxes enable row level security;
alter table outreach_plans enable row level security;
alter table follow_ups enable row level security;
alter table dnc_entries enable row level security;
alter table offers enable row level security;
