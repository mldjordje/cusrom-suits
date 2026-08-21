# Santos & Santorini — Project Notes for AI Agents

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

## TLS certificate warnings on a client device over A1 mobile data (investigated 2026-08-21)

One client reports HTTPS warnings on **A1 Serbia mobile data only** (Wi-Fi is fine). Two
screenshots, two different errors, and they point at different mechanisms:

| Device | Error | Meaning |
|---|---|---|
| iPhone / Safari | "may be impersonating www.santos.rs" | certificate name does not match |
| Android / Chrome | `NET::ERR_CERT_AUTHORITY_INVALID` | issuing CA is not trusted by the device |

**Not a bug in this codebase, and not a certificate problem.** Verified against the live
edge:

- `santos.rs` cert: Let's Encrypt, `CN=santos.rs` — valid
- `www.santos.rs` cert: Let's Encrypt, `CN=www.santos.rs` — valid
- chain served is complete and cross-signed, `Verify return code: 0 (ok)`:
  `www.santos.rs` -> `LE YR1` -> `ISRG Root YR` -> cross-signed by `ISRG Root X1`
- `www.santos.rs` CNAME -> `cname.vercel-dns.com`, confirmed on the authoritative
  `dns1-4.orion.rs` and on 8.8.8.8 / 1.1.1.1
- apex -> www is a 308, HSTS present, TLS 1.2 and 1.3 both negotiate

**Scope is a single device, not the carrier.** Other people on the same A1 network do not
reproduce it. So a network-wide A1 middlebox is ruled out; the cause is tied to that
subscriber line or that handset.

`ERR_CERT_AUTHORITY_INVALID` specifically means something is presenting a certificate signed
by a CA the phone does not trust — a real interception, not a name mismatch. Ranked causes:

1. A1's content-filtering / parental-control service enabled **on that line** (per-subscription,
   mobile-data only, intercepts TLS with its own CA)
2. An app on the handset installing its own root CA — VPN, antivirus "web protection", MDM
3. An outdated device root store (unlikely — Wi-Fi on the same handset works)

Ask the client to check **Settings -> Security -> Encryption & credentials -> Trusted
credentials -> "User" tab**. Any certificate listed there is the culprit and names the
interceptor. Also check VPN and Private DNS are off.

For reference, absent SNI every host in this setup returns a fallback certificate, which
produces the *name mismatch* variant (the iPhone screenshot). This is normal behaviour, not
a misconfiguration:

| Endpoint | SNI sent | Certificate returned |
|---|---|---|
| `76.76.21.21` (Vercel apex) | none | `CN=no-sni.vercel-infra.com` |
| `76.76.21.123` (Vercel www) | none | `CN=no-sni.vercel-infra.com` |
| `77.105.36.120` (cPanel) | none | `CN=*.orion.rs` (Sectigo) |
| any of the above | correct host | correct Let's Encrypt cert |

Useful commands:

```bash
echo | openssl s_client -connect 76.76.21.123:443 -servername www.santos.rs -showcerts 2>/dev/null | grep -E "^ *[0-9]+ s:|^ *i:"
echo | openssl s_client -connect 76.76.21.123:443 2>/dev/null | openssl x509 -noout -subject
```

**Outstanding DNS improvement (requires orion.rs panel access, not done):** apex `santos.rs`
still points at `76.76.21.21`, Vercel's legacy shared anycast IP. Move it to an ALIAS/ANAME
on `cname.vercel-dns.com` if orion.rs supports apex aliasing, otherwise to the current
Vercel A record `216.198.79.1`. Unrelated to the warnings above — it just gets the apex off
a heavily-shared legacy IP that some carriers route poorly.
