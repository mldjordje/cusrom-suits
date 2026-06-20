# Global font management design

## Goal

Activate the existing `/admin/fonts` area and let an administrator control two global storefront font roles: body text and headings. Each role can use a Google Font or a self-hosted font uploaded as one or more WOFF2 files.

## Scope

Font settings apply only to routes inside the storefront route group. The admin panel, packing slips, email templates, and the custom-suits rendering logic retain their existing typography unless they already consume storefront CSS variables.

The two roles are:

- body: paragraphs, navigation, buttons, form controls, product metadata and prices;
- heading: page and section headings, product titles, editorial display text and text-based brand marks.

## Font library

Create a persistent font library separate from active font settings. A font-family record contains a stable ID, display name, source type (`google` or `uploaded`), fallback category (`sans-serif` or `serif`), and available weights.

Google families store a validated Google Fonts family name. Uploaded families store a mapping from numeric weight to a private Supabase Storage path. Initial built-in records cover Montserrat and Playfair Display so existing settings remain compatible.

Uploaded files must:

- use the `.woff2` extension and WOFF2 signature;
- be no larger than 5 MB each;
- declare a supported weight from 300 through 800;
- use a normalized family name and server-generated storage filename.

Files are stored in the existing private `site-assets` bucket under `fonts/<family-id>/<weight>.woff2` and served through the existing `/site-assets/...` application route. The upload endpoint requires the existing admin authentication and font-management permission.

## Admin interface

Keep `/admin/fonts` as the entry point. Replace free-form-only inputs with two selectors backed by the font library while retaining an `Add Google Font` action for a validated family name.

Add an `Upload font` panel with:

- family name;
- serif/sans-serif fallback choice;
- one or more rows containing weight and WOFF2 file;
- upload progress and clear validation errors.

The Body and Heading cards show the selected family, selected default weight, available weights, source type and live preview. Saving active settings is separate from uploading a family. Reset restores Montserrat 400 for body and Playfair Display 700 for headings.

## Storefront application

The async storefront layout loads active settings and the selected library records on every uncached settings refresh. It emits:

- Google Fonts stylesheet links for selected Google families;
- `@font-face` declarations for every uploaded weight in the two selected families;
- scoped CSS variables on a storefront wrapper.

The variables override all current typography aliases, including `--font-montserrat`, `--font-playfair-display`, `--font-family-base`, `--font-heading`, `--font-display`, and `--pf`. Focused CSS cleanup replaces remaining direct family literals in storefront styles with these aliases. Admin styles remain outside the wrapper.

If a selected font or weight cannot be loaded, the configured serif/sans-serif fallback renders the page. Invalid or missing stored records fall back to the default settings rather than failing the request.

## Persistence and cache behavior

The font library and active settings use the existing persistent JSON abstraction backed by Supabase Storage. Successful library or settings writes invalidate the relevant Next.js cache tag so a saved change is visible on the next storefront navigation without a deployment.

Existing legacy settings containing only `bodyFont` and `displayFont` names are normalized to matching built-in/Google records during reads. No destructive migration is required.

## Security and validation

Server code validates family names, source types, weights, MIME type, extension, WOFF2 signature and file size. User-provided names are never interpolated into CSS without escaping. Storage paths are generated from server IDs, not raw filenames. API errors return Serbian admin-facing messages and do not partially update the font library when one file in a batch fails validation.

## Tests and verification

Tests cover settings normalization, legacy compatibility, family-name/CSS escaping, Google URL generation, WOFF2 validation, uploaded `@font-face` generation, active role resolution, fallback behavior and cache invalidation hooks. UI source tests cover upload controls, role selectors and live preview. Final verification includes the full test suite, production build, authenticated admin smoke test, font upload smoke test and storefront computed-font verification.

Only font-management files and focused storefront typography aliases are in scope. Existing unrelated workspace changes remain untouched.
