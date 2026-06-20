# Admin recovery and wash-care symbols design

## Goal

Restore production admin access and let an administrator choose the standard garment-care symbols shown for each webshop product.

## Admin recovery

The production middleware authenticates admin requests with a signed cookie. `ADMIN_SESSION_SECRET` became mandatory in commit `30e65f27`, but it was not configured in Vercel. Requests carrying an existing signed admin cookie therefore threw during middleware execution.

A unique, cryptographically random `ADMIN_SESSION_SECRET` is configured as a sensitive variable in the Vercel Production and Preview environments. The completed feature deployment will activate those values. Authentication code will also fail closed for unverifiable cookies, redirecting the browser to login instead of allowing a missing or invalid cookie to crash middleware.

## Symbol catalogue

Create one typed catalogue shared by admin and storefront code. It contains the common consumer-facing ISO 3758 care-label variants in five groups:

- washing: normal and mild washing temperatures, hand wash, and do not wash;
- bleaching: allowed, oxygen/non-chlorine only, and prohibited;
- drying: tumble-dry temperatures/prohibition and common natural-drying variants;
- ironing: low, medium, high, steam prohibited, and ironing prohibited;
- professional care: common P/F dry-cleaning variants, wet cleaning, and professional-cleaning prohibitions.

Each catalogue entry has a stable key, group, Serbian and English names/descriptions, sort order, and reusable SVG renderer. Product records store only stable keys.

## Admin interaction

The existing product editor popup receives a collapsible dropdown section named `Odrzavanje`. Opening it shows selected-symbol chips, a search field, grouped checkboxes, and a clear-all action. Selecting and deselecting symbols updates the product draft. Saving uses the existing product update endpoint.

An empty selection is explicit: the API persists `washCareIcons: []`. It does not convert it to `null` and does not infer defaults by product type.

Unknown historical keys are ignored when loading a product. The API validates submitted keys against the central catalogue and rejects invalid values rather than storing arbitrary strings.

## Storefront behavior

The product page resolves stored keys through the same catalogue and keeps their catalogue order. When no valid symbols are selected, the `Odrzavanje` tab and its content are not rendered. No automatic symbol set is shown for unconfigured products.

## Tests and verification

Tests cover:

- middleware handling when the signing secret is unavailable or a cookie is invalid;
- catalogue key uniqueness and required metadata;
- API normalization and persistence of an explicit empty list;
- product-detail resolution for selected, unknown, and empty symbols;
- conditional omission of the storefront care tab;
- production build and existing test suite;
- a production smoke check after deployment.

Only files related to authentication resilience and wash-care behavior are in scope. Existing unrelated workspace changes remain untouched.
