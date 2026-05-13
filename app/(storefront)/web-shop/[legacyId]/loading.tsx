export default function ProductDetailLoading() {
  return (
    <div className="page-wrapper ss-product-detail-loading" aria-busy="true" aria-live="polite">
      <div className="container py-4 py-md-5">
        {/* breadcrumb */}
        <div className="ss-pdl__breadcrumb">
          <span className="ss-pdl__pill" />
          <span className="ss-pdl__pill ss-pdl__pill--wide" />
          <span className="ss-pdl__pill" />
        </div>

        <div className="row g-4 g-xl-5 mt-1">
          {/* gallery column */}
          <div className="col-12 col-md-6 col-xl-7">
            <div className="ss-pdl__gallery">
              <div className="ss-pdl__gallery-main" />
              <div className="ss-pdl__gallery-thumbs">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="ss-pdl__gallery-thumb" style={{ animationDelay: `${i * 0.06}s` }} />
                ))}
              </div>
            </div>
          </div>

          {/* info column */}
          <div className="col-12 col-md-6 col-xl-5">
            <div className="ss-pdl__info">
              <span className="ss-pdl__pill ss-pdl__pill--tag" />
              <div className="ss-pdl__title" />
              <div className="ss-pdl__title ss-pdl__title--short mt-2" />
              <div className="ss-pdl__price mt-3" />

              <div className="ss-pdl__divider mt-4" />

              <div className="ss-pdl__sizes mt-4">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="ss-pdl__size-chip" style={{ animationDelay: `${i * 0.05}s` }} />
                ))}
              </div>

              <div className="ss-pdl__cta mt-4" />

              <div className="ss-pdl__desc mt-4">
                <div className="ss-pdl__line" />
                <div className="ss-pdl__line ss-pdl__line--wide mt-2" />
                <div className="ss-pdl__line mt-2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
