export default function WebShopLoading() {
  return (
    <div className="container py-5 ss-shop-loading" aria-busy="true" aria-live="polite">
      <div className="ss-shop-loading__hero" />
      <div className="ss-shop-loading__body">
        <div className="ss-shop-loading__rail">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="ss-shop-loading__grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="ss-shop-loading__card" style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="ss-shop-loading__image" />
              <span className="ss-shop-loading__text ss-shop-loading__text--wide" />
              <span className="ss-shop-loading__text" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
