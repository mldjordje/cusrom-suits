# Santos & Santorini — Project Notes for AI Agents

## Repository

The canonical repository is `github.com/Santos-Santorini/santos` (organization
`Santos-Santorini`, main branch `main`). It was transferred from the personal
account `mldjordje/cusrom-suits` on 2026-09-02 and renamed in the same step;
GitHub still redirects the old path, but new clones and any tooling that
hardcodes a URL should use the new one.

Vercel deploys from this repository through the Vercel GitHub App installed on
the organization. If a push stops triggering builds, check that the app still
has access to the repo before touching anything else.

## Domain & Hosting Architecture

### Current setup (as of 2026-06)

| Domain | Destination | Purpose |
|---|---|---|
| `santos.rs` | Vercel | Next.js app (redirects to www) |
| `www.santos.rs` | Vercel | Next.js app (primary) |
| `assets.santos.rs` | cPanel / public_html | Legacy static files (images, videos) |

**Important:** `santos.rs` and `www.santos.rs` both point to Vercel — they do NOT serve files from cPanel/public_html anymore.

`assets.santos.rs` is a subdomain that points directly to the cPanel `public_html` directory, where the `fajlovi/` folder lives with all legacy product images, uniform images, and other media files.

### Legacy asset proxy

`next.config.ts` rewrites `/fajlovi/:path*` → `https://assets.santos.rs/fajlovi/:path*` (afterFiles rewrite).

The origin is controlled by the `LEGACY_ASSET_ORIGIN` env var (default: `https://assets.santos.rs`). Set this on Vercel if the subdomain ever changes.

This means:
- All legacy media should be referenced as **relative paths** `/fajlovi/...` in code and the database
- The Next.js rewrite transparently proxies browser requests to `assets.santos.rs`
- `sanitizeStorefrontImageSrc()` in `lib/storefront/image-utils.ts` converts any stored full URLs (`santos.rs`, `www.santos.rs`, `assets.santos.rs`) to relative `/fajlovi/...` paths

### CORS note

`santos.rs` (without www) and `www.santos.rs` are **different origins** from the browser's perspective. Never load images from one when the page is on the other using a direct `<img>` or `<Image unoptimized>` with a full URL — always sanitize to a relative `/fajlovi/...` path first.

## Key env vars (Vercel)

- `LEGACY_ASSET_ORIGIN` — base URL of the legacy file server, default `https://assets.santos.rs`

## Media file locations

- Product images: `assets.santos.rs/fajlovi/product/` (e.g. `074_crop.jpg`)
- Uniform images: bundled in `public/fajlovi/uniforme/` AND on `assets.santos.rs/fajlovi/uniforme/`
- Site assets (admin uploads): Supabase Storage bucket `site-assets`, also mirrored to `public/site-assets/`

## Image handling conventions

- Always use `sanitizeStorefrontImageSrc()` from `lib/storefront/image-utils.ts` before passing any legacy URL to a `<Image>` or `<Image unoptimized>` component
- `StorefrontImage` component does this automatically
- Server-rendered pages with native `<img>` tags must sanitize manually before rendering
- `LEGACY_SANTOS_HOSTS` in `image-utils.ts` includes `santos.rs`, `www.santos.rs`, `assets.santos.rs`, `www.assets.santos.rs` — all convert to relative `/fajlovi/...` paths
