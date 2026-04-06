-- Pokreni u Supabase: Dashboard -> SQL Editor -> New query -> Run
-- Ubrzava listu porudzbina za ulogovanog kupca (config.storefrontUserId).
-- Pretpostavlja kolonu public.orders.config (json ili jsonb).

CREATE INDEX IF NOT EXISTS idx_orders_config_storefront_user_id
  ON public.orders ((config::jsonb->>'storefrontUserId'))
  WHERE (config::jsonb ? 'storefrontUserId');
