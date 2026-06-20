# Global Font Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/admin/fonts` control two persistent storefront font roles and support Google families plus multi-weight WOFF2 uploads.

**Architecture:** A typed font library owns source metadata and uploaded weight files; active settings reference library IDs. The storefront route-group layout resolves both roles and emits scoped font links, `@font-face` declarations and compatibility CSS variables without changing admin typography.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase Storage, Vitest.

---

## File map

- Create `lib/storefront/fontLibraryDefaults.ts`: client-safe types, built-in families and allowed weights.
- Create `lib/storefront/fontLibrary.ts`: persistent registry, validation, legacy lookup and uploaded-family creation.
- Create `lib/storefront/fontUpload.ts`: WOFF2 extension, size, MIME and signature validation.
- Create `app/api/admin/fonts/route.ts`: authenticated list/add-Google/upload endpoint.
- Modify `lib/storefront/fontSettingsDefaults.ts`: active role IDs plus backward-compatible fields.
- Modify `lib/storefront/fontSettings.ts`: normalization, caching, resolution and scoped CSS generation.
- Modify `app/api/admin/font-settings/route.ts`: strict payload validation and admin permission check.
- Modify `app/admin/fonts/page.tsx`: library selectors, upload panel and preview.
- Modify `app/(storefront)/layout.tsx`: load and apply resolved typography.
- Modify `app/site-assets/[...path]/route.ts`: return `font/woff2` for uploaded files.
- Modify storefront SCSS only where a direct family literal bypasses compatibility variables.
- Create `__tests__/font-library.test.ts`, `__tests__/font-upload.test.ts`, `__tests__/font-settings.test.ts`, and `__tests__/admin-fonts-ui.test.ts`.

### Task 1: Typed font library and legacy compatibility

- [ ] Write `__tests__/font-library.test.ts` expecting built-in `montserrat` and `playfair-display` records, unique IDs, weights limited to `[300,400,500,600,700,800]`, normalized Google family names, and lookup by legacy family name.
- [ ] Run `npx vitest run __tests__/font-library.test.ts`; expect module-not-found for `fontLibraryDefaults`.
- [ ] Create `fontLibraryDefaults.ts` with `FontFamilyRecord`, `FontSource`, `FontWeight`, `ALLOWED_FONT_WEIGHTS`, `DEFAULT_FONT_LIBRARY`, and `normalizeFontFamilyName`.
- [ ] Create `fontLibrary.ts` using `readPersistentJsonFile("data/font-library.json", ...)` and `writePersistentJsonFile`; merge built-ins into reads and expose `getFontLibrary`, `findFontByLegacyName`, `addGoogleFontFamily`, and `addUploadedFontFamily`.
- [ ] Re-run `npx vitest run __tests__/font-library.test.ts`; require all tests to pass.

### Task 2: WOFF2 upload validation

- [ ] Write `__tests__/font-upload.test.ts` with a valid buffer beginning `77 4f 46 32`, invalid WOFF/TTF signatures, a 5 MB boundary, invalid extensions, invalid weights and normalized server storage paths.
- [ ] Run `npx vitest run __tests__/font-upload.test.ts`; expect module-not-found for `fontUpload`.
- [ ] Implement `validateWoff2Upload({ name, type, size, bytes, weight })` returning `{ ok: true, weight }` or a Serbian error, and `buildUploadedFontStoragePath(familyId, weight)` returning `fonts/<safe-id>/<weight>.woff2`.
- [ ] Re-run the upload tests and require all cases to pass.

### Task 3: Active settings, migration and CSS output

- [ ] Write `__tests__/font-settings.test.ts` proving legacy `{ bodyFont: "Montserrat", displayFont: "Playfair Display" }` maps to built-in IDs, invalid IDs fall back safely, Google URLs encode family names, uploaded weights generate `@font-face`, CSS values escape quotes/backslashes, and all six compatibility variables are emitted.
- [ ] Run `npx vitest run __tests__/font-settings.test.ts`; expect failures because role IDs and resolution helpers do not exist.
- [ ] Extend `FontSettingsShape` with `bodyFontId` and `displayFontId`; preserve legacy name fields in API responses during transition.
- [ ] Add `resolveFontSettings(settings, library)` and pure `buildStorefrontFontCss(resolved)` / `buildGoogleFontUrls(resolved)` helpers. Scope generated rules under `.ss-storefront-font-scope` and emit `--font-montserrat`, `--font-playfair-display`, `--font-family-base`, `--font-heading`, `--font-display`, and `--pf`.
- [ ] Cache settings/library reads with `unstable_cache` tags and invalidate those tags after successful writes.
- [ ] Re-run `npx vitest run __tests__/font-library.test.ts __tests__/font-settings.test.ts`; require green.

### Task 4: Authenticated font APIs

- [ ] Add source/behavior tests asserting both font routes resolve the admin viewer, require `content.manage`, reject invalid JSON/FormData, and never use permissive `hasAdminToken`.
- [ ] Run the API tests and confirm failure against the current route.
- [ ] Update `/api/admin/font-settings` GET/PATCH to use `getAdminViewerFromRequest` and `hasAdminPermission(viewer, "content.manage")`; PATCH accepts only valid IDs, weights and letter spacing.
- [ ] Implement `/api/admin/fonts` GET for library records, JSON POST for Google families, and multipart POST for uploaded families. Validate every file before uploading any file, upload to `site-assets`, then persist one family record containing all weight paths.
- [ ] Add `.woff2: "font/woff2"` to the site-assets delivery route.
- [ ] Run all font API/library/upload tests and require green.

### Task 5: Admin font management UI

- [ ] Write `__tests__/admin-fonts-ui.test.ts` asserting `/admin/fonts` renders Body and Heading library selectors, source/weight details, `Add Google Font`, family/fallback controls, repeatable weight/file rows, `.woff2` accept filter, upload status, reset and live preview.
- [ ] Run the UI source test and confirm it fails against the existing free-form page.
- [ ] Refactor `app/admin/fonts/page.tsx` to load settings and library in parallel, select by family ID, constrain weight options to available family weights, add Google families through JSON POST, and upload one or more WOFF2 rows through FormData.
- [ ] Make preview inject Google links and uploaded `@font-face` rules using returned `/site-assets/fonts/...` paths; do not mutate the saved settings until the user clicks Save.
- [ ] Re-run `npx vitest run __tests__/admin-fonts-ui.test.ts` and require green.

### Task 6: Storefront activation and typography aliases

- [ ] Add a source test asserting `app/(storefront)/layout.tsx` calls the resolver, renders selected Google stylesheet links, injects generated CSS and adds `ss-storefront-font-scope`, while `app/admin/layout.tsx` does not use that class.
- [ ] Run the source test and confirm failure because the storefront layout does not load font settings.
- [ ] Update the async storefront layout to load settings/library, resolve both roles, emit stylesheet links and `<style>` CSS, and wrap providers/content in `<div className="ss-storefront-font-scope">`.
- [ ] Replace storefront-only direct `"Montserrat"` and `"Playfair Display"` declarations that bypass existing variables with `var(--font-family-base)` or `var(--font-display)`; leave fallbacks in variable definitions.
- [ ] Run font tests plus `npx tsc --noEmit`; require zero errors.

### Task 7: Full verification and delivery

- [ ] Run `npm test`; require all test files and tests to pass.
- [ ] Run `npm run build`; require exit code 0 and record only pre-existing warnings separately.
- [ ] Run `git diff --check`, inspect all changed files, and verify the unrelated `app/custom-suits/components/SuitPreview.tsx` modification remains unstaged.
- [ ] Commit only font-management implementation/tests/docs with `git commit -m "feat: activate global font management"`.
- [ ] Merge to `main`, re-run `npm test`, push `main`, and wait for the Vercel Production deployment to become Ready.
- [ ] Smoke-test `/admin/fonts`, upload a small valid test WOFF2, select it for one role, verify the served asset returns `font/woff2`, verify storefront CSS references the uploaded family, then restore the desired production selection.
