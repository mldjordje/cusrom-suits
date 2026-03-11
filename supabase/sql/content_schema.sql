-- Unified content schema for merged legacy blog + news
-- Safe to run multiple times

create table if not exists public.content_posts (
  id bigserial primary key,
  slug text not null unique,
  title text not null,
  excerpt text,
  body_html text,
  cover_image text,
  post_type text not null check (post_type in ('blog', 'news')),
  source_legacy_id bigint,
  source_table text,
  is_published boolean not null default true,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_content_posts_type_published
  on public.content_posts (post_type, is_published, published_at desc);

create table if not exists public.content_post_categories (
  id bigserial primary key,
  name text not null,
  slug text not null unique,
  source_table text,
  source_legacy_id bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.content_post_category_links (
  post_id bigint not null references public.content_posts(id) on delete cascade,
  category_id bigint not null references public.content_post_categories(id) on delete cascade,
  primary key (post_id, category_id)
);

