import { CATEGORY_SEO_COPY, CATEGORY_SEO_BY_KEY } from "@/lib/storefront/categorySeoCopy";

/**
 * SEO description block rendered below the web-shop product grid.
 *
 * - When a category is active (`activeKey`), shows that single category's copy
 *   as an open, always-visible paragraph.
 * - On the default "all products" view (`activeKey` null), shows every category
 *   as a collapsed `<details>` accordion so the primary /web-shop URL carries
 *   the full crawlable copy without flooding the mobile viewport.
 *
 * Client-supplied copy is Serbian only, so the block is gated to the SR locale
 * by the caller — it never renders on the EN storefront.
 */
export default function WebShopCategorySeo({ activeKey }: { activeKey: string | null }) {
  const active = activeKey ? CATEGORY_SEO_BY_KEY[activeKey] : null;

  if (active) {
    return (
      <section className="ss-shop-seo container" aria-label={`O kategoriji ${active.title}`}>
        <div className="ss-shop-seo__single">
          <h2 className="ss-shop-seo__title">{active.title}</h2>
          <p className="ss-shop-seo__body">{active.body}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="ss-shop-seo container" aria-label="O kategorijama">
      <h2 className="ss-shop-seo__title">Muška garderoba za svaku priliku</h2>
      <div className="ss-shop-seo__grid">
        {CATEGORY_SEO_COPY.map((entry) => (
          <details key={entry.key} className="ss-shop-seo__item">
            <summary className="ss-shop-seo__summary">{entry.title}</summary>
            <p className="ss-shop-seo__body">{entry.body}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
