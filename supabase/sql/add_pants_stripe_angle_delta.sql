-- Add per-fabric pants stripe angle delta column.
-- Safe to run multiple times.

alter table public.fabrics
  add column if not exists pants_stripe_angle_delta float8;
