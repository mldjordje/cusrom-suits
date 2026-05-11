-- Integration sync runs and items
-- Safe to run multiple times

create table if not exists public.integration_sync_runs (
  id uuid primary key,
  domain text not null check (domain in ('ananas', 'stock_inbound', 'stock_outbound', 'orchestrator')),
  status text not null check (status in ('running', 'success', 'partial_success', 'failed')),
  environment text not null check (environment in ('stage', 'production')),
  mode text not null check (mode in ('delta', 'full')),
  trigger text not null check (trigger in ('manual', 'cron', 'retry')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms int,
  counters jsonb not null default '{"total":0,"success":0,"failed":0,"skipped":0}'::jsonb,
  summary text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_integration_sync_runs_started_at
  on public.integration_sync_runs (started_at desc);

create index if not exists idx_integration_sync_runs_domain
  on public.integration_sync_runs (domain, started_at desc);

create table if not exists public.integration_sync_items (
  id uuid primary key,
  run_id uuid not null references public.integration_sync_runs(id) on delete cascade,
  domain text not null check (domain in ('ananas', 'stock_inbound', 'stock_outbound', 'orchestrator')),
  entity_type text not null,
  entity_id text not null,
  status text not null check (status in ('success', 'failed', 'skipped')),
  message text,
  payload_hash text,
  payload jsonb,
  response jsonb,
  retry_of_item_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_integration_sync_items_run_id
  on public.integration_sync_items (run_id, created_at desc);

create index if not exists idx_integration_sync_items_failed
  on public.integration_sync_items (status, created_at desc);

create table if not exists public.integration_stock_delta_state (
  scope text not null,
  entity_type text not null,
  entity_id text not null,
  payload_hash text not null,
  source_run_id uuid,
  updated_at timestamptz not null default now(),
  primary key (scope, entity_type, entity_id)
);

create table if not exists public.integration_stock_raw_files (
  id uuid primary key,
  run_id uuid not null references public.integration_sync_runs(id) on delete cascade,
  file_name text not null,
  row_count int not null default 0,
  checksum text,
  created_at timestamptz not null default now()
);

create index if not exists idx_integration_stock_raw_files_run_id
  on public.integration_stock_raw_files (run_id, created_at desc);

create table if not exists public.integration_stock_raw_rows (
  id uuid primary key,
  raw_file_id uuid not null references public.integration_stock_raw_files(id) on delete cascade,
  row_index int not null default 0,
  data jsonb not null default '[]'::jsonb
);

create index if not exists idx_integration_stock_raw_rows_file
  on public.integration_stock_raw_rows (raw_file_id, row_index asc);

alter table public.integration_sync_runs enable row level security;
alter table public.integration_sync_items enable row level security;
alter table public.integration_stock_delta_state enable row level security;
alter table public.integration_stock_raw_files enable row level security;
alter table public.integration_stock_raw_rows enable row level security;

-- These operational tables are written through the Next.js backend with the
-- service role. No anon/authenticated policy is intentionally created here.
