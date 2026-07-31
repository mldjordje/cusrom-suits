-- Ananas integration v2 (2026-07-28)
-- Additive only. Adds the fields the phase-based sync needs: which warehouse a
-- listing lives in (Ananas-fulfilled rows must not get stock pushes) and the last
-- values the platform reported, so we can skip no-op price/stock updates.

alter table public.integration_ananas_product_state
  add column if not exists warehouse text,
  add column if not exists remote_base_price numeric(12, 2),
  add column if not exists remote_stock_level integer;

comment on column public.integration_ananas_product_state.warehouse is
  'MERCHANT_WAREHOUSE | ANANAS_WAREHOUSE — stock updates are only sent for merchant-owned inventory.';

create index if not exists idx_ananas_product_state_merchant_inventory
  on public.integration_ananas_product_state (merchant_inventory_id);

create index if not exists idx_ananas_discount_by_merchant
  on public.integration_ananas_discount_state (merchant_inventory_id, active, date_to desc);
