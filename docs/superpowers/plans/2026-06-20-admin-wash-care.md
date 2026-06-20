# Admin Wash-Care Symbols Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore resilient admin authentication and add a validated, per-product selector for the standard consumer garment-care symbols.

**Architecture:** A framework-independent catalogue owns keys, labels, grouping, validation, and product selection. One shared React renderer draws catalogue symbols in both admin and storefront. Existing product raw payloads remain the persistence boundary, with an explicit empty array meaning no care UI.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Vitest, Vercel.

---

## File map

- Create `lib/catalog/washCare.ts`: typed catalogue, localization, grouping, validation and selection helpers.
- Create `app/components/wash-care/WashCareSymbol.tsx`: reusable SVG renderer for every catalogue key.
- Create `app/admin/webshop/WashCareSelector.tsx`: searchable grouped dropdown used by the product modal.
- Modify `lib/adminAuth.ts`: invalid/unverifiable cookies fail closed in middleware while session creation still requires a secret.
- Modify `app/api/admin/webshop/products/route.ts`: validate keys and preserve explicit empty arrays.
- Modify `lib/storefront/product-details.ts`: resolve only explicitly stored care keys; remove inferred defaults.
- Modify `app/components/storefront/ProductDetailTabs.tsx`: use shared renderer and omit the care tab when empty.
- Modify `app/admin/webshop/page.tsx`: remove the five-symbol duplicate and mount the selector.
- Create `__tests__/admin-auth.test.ts`, `__tests__/wash-care.test.ts`; extend `__tests__/product-details.test.ts`.

### Task 1: Admin middleware resilience

- [ ] Add a failing test in `__tests__/admin-auth.test.ts` that clears `ADMIN_SESSION_SECRET` and expects `parseAdminSessionValue("payload.signature")` to resolve to `null`, while `buildAdminSessionValue(viewer)` rejects with `ADMIN_SESSION_SECRET is not configured`.
- [ ] Run `npx vitest run __tests__/admin-auth.test.ts` and confirm the parser test fails with the current thrown configuration error.
- [ ] Change `lib/adminAuth.ts` so verification returns `null` when the secret is absent, but signing a newly issued session throws the configuration error.
- [ ] Re-run `npx vitest run __tests__/admin-auth.test.ts` and confirm both tests pass.

### Task 2: Typed standard symbol catalogue

- [ ] Add failing tests in `__tests__/wash-care.test.ts` asserting at least 20 unique stable keys, all five groups, complete Serbian/English metadata, removal of unknown keys, catalogue ordering, and preservation of `[]`.
- [ ] Run `npx vitest run __tests__/wash-care.test.ts` and confirm module resolution fails because the catalogue does not exist.
- [ ] Implement `lib/catalog/washCare.ts` with washing, bleaching, tumble/natural drying, ironing, dry-cleaning and wet-cleaning variants. Export `WASH_CARE_SYMBOLS`, `WashCareSymbolKey`, `parseWashCareSymbolKeys`, `getLocalizedWashCareItems`, and group labels.
- [ ] Re-run `npx vitest run __tests__/wash-care.test.ts` and confirm it passes.

### Task 3: Shared SVG renderer

- [ ] Add a source-level catalogue coverage test that reads `WashCareSymbol.tsx` and verifies every catalogue key is represented by renderer data or a renderer branch.
- [ ] Run the test and confirm failure because the renderer is absent.
- [ ] Implement `app/components/wash-care/WashCareSymbol.tsx` from reusable base shapes (tub, triangle, square/circle, iron and professional-care circle) plus modifiers for temperature, bars, dots, letters and prohibition crosses.
- [ ] Run `npx vitest run __tests__/wash-care.test.ts` and confirm renderer coverage passes.

### Task 4: Product persistence and storefront resolution

- [ ] Extend `__tests__/product-details.test.ts` with products containing selected keys, unknown keys, no field and `[]`; expect only selected valid symbols and no automatic defaults.
- [ ] Run `npx vitest run __tests__/product-details.test.ts` and confirm the missing/empty cases fail under current inferred defaults.
- [ ] Update `getProductWashCare` in `lib/storefront/product-details.ts` to call catalogue helpers and always return explicit valid selections only.
- [ ] Update `app/api/admin/webshop/products/route.ts` to parse submitted keys with `parseWashCareSymbolKeys`, reject a non-array value, and write `washCareIcons: patch.washCareIcons` without converting `[]` to `null` in both storage paths.
- [ ] Run `npx vitest run __tests__/wash-care.test.ts __tests__/product-details.test.ts` and confirm both suites pass.

### Task 5: Storefront conditional UI

- [ ] Add a source behavior test in `__tests__/wash-care.test.ts` asserting `ProductDetailTabs.tsx` gates both the care tab button and panel on `washCare.items.length > 0` and imports the shared renderer.
- [ ] Run that test and confirm it fails against the unconditional current tab.
- [ ] Remove the local five-symbol renderer from `ProductDetailTabs.tsx`, import the shared renderer, define `hasWashCare`, and conditionally render both navigation and panel.
- [ ] Run `npx vitest run __tests__/wash-care.test.ts` and confirm the suite passes.

### Task 6: Admin dropdown selector

- [ ] Add a source behavior test asserting the selector has a disclosure button, search input, grouped catalogue mapping, checkboxes, selected chips, and clear-all callback.
- [ ] Run that test and confirm failure because `WashCareSelector.tsx` does not exist.
- [ ] Implement `app/admin/webshop/WashCareSelector.tsx` as a controlled component with `value: WashCareSymbolKey[]` and `onChange(next)`; use localized Serbian labels and the shared SVG renderer.
- [ ] Replace local `WashCareIcon`, `VALID_WASH_CARE_ICONS`, and the five hard-coded buttons in `app/admin/webshop/page.tsx` with catalogue parsing and `<WashCareSelector>`.
- [ ] Change the save body to always send `washCareIcons: draft.washCareIcons`, including `[]`.
- [ ] Run `npx vitest run __tests__/wash-care.test.ts` and confirm the admin source checks pass.

### Task 7: Full verification, commit, deploy and push

- [ ] Run `npm test` and resolve only failures caused by these changes.
- [ ] Run `npm run build` and require exit code 0.
- [ ] Run `git diff --check` and inspect `git diff --stat` plus `git status --short`, preserving the unrelated `SuitPreview.tsx` modification.
- [ ] Commit only auth, wash-care, tests, spec and plan files with `git commit -m "feat: add product wash care controls"`.
- [ ] Push `main` to `origin`, then deploy with `npx vercel --prod --yes` so the new secret and code become active.
- [ ] Check the production URL and `/admin` response; require no `MIDDLEWARE_INVOCATION_FAILED` result and verify unauthenticated access redirects to `/admin-login`.
