-- Sprint 2 initial schema
create extension if not exists pgcrypto;

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  city text,
  county text,
  state text,
  postal_code text,
  country text default 'US',
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','tool')),
  content text not null,
  tool_name text,
  created_at timestamptz not null default now()
);

create table if not exists tool_invocations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete set null,
  tool_name text not null,
  request_json jsonb not null,
  response_json jsonb,
  status text not null,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create table if not exists job_listings_cache (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text not null,
  location_label text,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create unique index if not exists idx_job_cache_provider_external
  on job_listings_cache(provider, external_id);

create table if not exists housing_listings_cache (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text not null,
  location_label text,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create unique index if not exists idx_housing_cache_provider_external
  on housing_listings_cache(provider, external_id);

create table if not exists story_documents (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  source_path text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references story_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);

create index if not exists idx_document_chunks_fts
  on document_chunks using gin (to_tsvector('english', content));
