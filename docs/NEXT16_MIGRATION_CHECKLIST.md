# Next 16 Migration Checklist

## Scope
- Migrate storefront/admin app from Next 15.5.7 to Next 16.x with minimum production risk.
- Keep React 19.x and existing Supabase integration.
- Replace deprecated `next lint` workflow with ESLint CLI workflow.

## 1. Pre-Migration Baseline
1. Confirm branch is green:
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npm run test:integrations`
2. Capture baseline timings in production-like env:
   - `/web-shop` first load
   - `/web-shop` filtered load (`q`, `categoryId`, `inStock`)
   - `/web-shop/[legacyId]` product detail load
3. Export current Vercel environment variables and build settings snapshot.

## 2. Dependency Upgrade
1. Upgrade core packages:
   - `next@16.x`
   - `eslint-config-next@16.x`
2. Keep aligned packages updated:
   - `react` / `react-dom` 19.x
   - `@types/react` / `@types/react-dom`
3. Run install and lock refresh:
   - `npm install`

## 3. Lint Pipeline Migration
1. Replace `next lint` command in `package.json` with ESLint CLI command.
2. Run codemod once:
   - `npx @next/codemod@canary next-lint-to-eslint-cli .`
3. Validate same lint gates in CI and local.

## 4. Runtime & Build Compatibility
1. Run:
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npm run build`
2. Fix breaking changes from Next 16 release notes:
   - Routing behavior changes
   - Image optimization/remote patterns
   - Caching defaults and `fetch` behavior
3. Verify `app/(storefront)` pages:
   - Home, shop listing, product detail, navigation links
4. Verify admin pages:
   - `/admin/webshop`
   - `/admin/integrations`

## 5. Data & Integration Validation
1. Validate catalog read paths:
   - Supabase catalog listing
   - Product detail lookup
2. Validate stock integration flow:
   - `productwarehouse` aggregation behavior
   - `stock_total` and `stock_warehouse_1` consistency
3. Validate promotion rules calculation path and cache behavior.

## 6. Performance Regression Check
1. Compare baseline vs upgraded timings for:
   - `/web-shop`
   - filter apply
   - `/web-shop/[legacyId]`
2. Confirm no image payload regressions:
   - product listing cards
   - product gallery
3. Confirm cache hit behavior in production logs.

## 7. Vercel Rollout
1. Deploy preview from migration branch.
2. Run smoke test on preview:
   - navigation
   - shop filtering
   - product detail
   - admin webshop sync pages
3. Promote to production during low-traffic window.

## 8. Rollback Plan
1. Keep previous production commit SHA documented before release.
2. If major issue appears:
   - redeploy previous known-good commit in Vercel
   - open hotfix branch from previous commit
3. Post-incident:
   - root cause note
   - patch migration checklist

## 9. Done Criteria
1. Production deploy on Next 16 is stable for 24h.
2. No P1/P2 regressions in storefront/admin flows.
3. Lint/build/test pipeline passes with ESLint CLI workflow.
