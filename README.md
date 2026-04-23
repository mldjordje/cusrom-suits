# Santos & Santorini

Next.js app za:

- storefront (`/`, `/web-shop`, `/blog`, `/kontakt`)
- admin (`/admin/*`) za webshop/CMS/integrations operacije
- legacy migraciju i sync pipeline (Ananas + stock inbound/outbound)

## Quick Start

```bash
npm install
npm run dev
```

App: `http://localhost:3000`

Admin access (ako je ukljucen token):

- postavi `ADMIN_ACCESS_TOKEN` u `.env.local`
- otvori jednom `/admin?token=YOUR_TOKEN` da se cookie upise

## Key Routes

- Storefront: `/`, `/web-shop`, `/web-shop/[legacyId]`, `/akcije`, `/blog`, `/kontakt`
- Admin: `/admin`, `/admin/webshop`, `/admin/landing`, `/admin/akcije`, `/admin/blog-posts`, `/admin/integrations`
- APIs: `/api/admin/webshop/*`, `/api/admin/integrations/*`, `/api/blog/*`, `/api/contact`, `/api/legacy/products`

## Scripts

- `npm run dev` - local development
- `npm run build` - production build
- `npm run lint` - lint checks
- `npm run test:integrations` - core integrations tests
- `npm run smoke:webshop-admin` - HTTP smoke check za storefront + admin rute
- `node scripts/optimize-hero-assets.mjs` - kompresuje public/img/*.jpg (hero, odela)
- `node scripts/generate-og-image.mjs` - generise 1200x630 og-default.jpg

Smoke command koristi:

- `SMOKE_BASE_URL` (optional, default `http://localhost:3000`)
- `ADMIN_ACCESS_TOKEN` (optional; ako postoji proverava i admin API rute)

## Environment

Kopiraj `.env.example` u `.env.local` i popuni po potrebi.

Najbitnije varijable:

- `ADMIN_ACCESS_TOKEN`
- `ADMIN_SESSION_SECRET` (OBAVEZNO u produkciji; generisi: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`)
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `RESEND_API_KEY` + `MAIL_FROM` + `ORDER_NOTIFICATION_EMAIL` (email notifikacije za porudzbine i kontakt)
- `ANANAS_*`
- `STOCK_*`

Ako Supabase nije podesen, deo modula radi preko lokalnih `data/*.json` fallback fajlova.

## Integrations Notes

Runbook fajlovi:

- `docs/integrations-runbook.md`
- `docs/legacy-migration-runbook.md`
- `docs/legacy-ananas-sync-map.md`
- `docs/legacy-stock-compatibility-matrix.md`
