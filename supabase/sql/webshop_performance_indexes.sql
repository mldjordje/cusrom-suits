-- Webshop performance index package
-- Run in Supabase SQL editor (safe to re-run).

create extension if not exists pg_trgm;

create index if not exists idx_catalog_products_active_exported
  on public.catalog_products (is_active, is_exported);

create index if not exists idx_catalog_products_active_exported_legacy
  on public.catalog_products (is_active, is_exported, legacy_id);

create index if not exists idx_catalog_products_active_exported_stock_total
  on public.catalog_products (is_active, is_exported, stock_total desc);

create index if not exists idx_catalog_products_active_exported_price_final
  on public.catalog_products (is_active, is_exported, price_final_gross);

create index if not exists idx_catalog_products_search_trgm
  on public.catalog_products
  using gin (
    (
      coalesce(sku, '') || ' ' ||
      coalesce(manuf_code, '') || ' ' ||
      coalesce(ean, '') || ' ' ||
      coalesce(name_sr, '') || ' ' ||
      coalesce(name_en, '') || ' ' ||
      coalesce(brand, '')
    ) gin_trgm_ops
  );

create index if not exists idx_catalog_products_raw_payload_gin
  on public.catalog_products
  using gin (raw_payload jsonb_path_ops);

create index if not exists idx_catalog_product_media_product_sort
  on public.catalog_product_media (legacy_product_id, sort);

analyze public.catalog_products;
analyze public.catalog_product_media;
