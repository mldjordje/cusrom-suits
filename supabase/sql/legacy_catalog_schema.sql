-- Legacy catalog import schema (Next.js + Supabase)
-- Safe to run multiple times.

create table if not exists public.catalog_products (
  id bigserial primary key,
  legacy_id bigint not null unique,
  sku text not null,
  ean text,
  manuf_code text,
  brand text,
  is_active boolean not null default true,
  is_exported boolean not null default true,
  name_sr text not null,
  name_en text,
  description_sr text,
  description_en text,
  specification_sr text,
  specification_en text,
  price_net numeric(12, 2) not null default 0,
  price_gross numeric(12, 2) not null default 0,
  price_final_gross numeric(12, 2) not null default 0,
  tax_percent numeric(6, 2) not null default 0,
  rebate_percent numeric(6, 2) not null default 0,
  stock_warehouse_1 numeric(12, 3) not null default 0,
  stock_total numeric(12, 3) not null default 0,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_catalog_products_sku on public.catalog_products (sku);
create index if not exists idx_catalog_products_active on public.catalog_products (is_active);
create index if not exists idx_catalog_products_exported on public.catalog_products (is_exported);
create index if not exists idx_catalog_products_stock on public.catalog_products (stock_warehouse_1);

create table if not exists public.catalog_product_media (
  id bigserial primary key,
  legacy_product_id bigint not null references public.catalog_products(legacy_id) on delete cascade,
  url text not null,
  is_cover boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (legacy_product_id, url)
);

create index if not exists idx_catalog_product_media_product on public.catalog_product_media (legacy_product_id);
create index if not exists idx_catalog_product_media_cover on public.catalog_product_media (legacy_product_id, is_cover);

create table if not exists public.integration_ananas_product_state (
  legacy_product_id bigint primary key references public.catalog_products(legacy_id) on delete cascade,
  merchant_inventory_id bigint,
  external_id text,
  ananas_status text,
  payload_hash text,
  last_synced_at timestamptz,
  sync_error text,
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_ananas_discount_state (
  id bigserial primary key,
  legacy_product_id bigint not null references public.catalog_products(legacy_id) on delete cascade,
  merchant_inventory_id bigint not null,
  discount_id text,
  discount_type text not null default 'SALE',
  discount_price numeric(12, 2) not null default 0,
  discount_price_currency text not null default 'RSD',
  date_from date not null,
  date_to date not null,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (merchant_inventory_id, date_from, date_to, discount_type)
);

create index if not exists idx_ananas_discount_active
  on public.integration_ananas_discount_state (active, date_from, date_to);

create table if not exists public.integration_stock_sync_log (
  id bigserial primary key,
  source text not null default 'legacy',
  total_products int not null default 0,
  changed_products int not null default 0,
  status text not null default 'ok',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
