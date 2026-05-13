import Image from "next/image";

export default function ProductDetailLoading() {
  return (
    <div className="ss-preloader" aria-hidden="true">
      <div className="ss-preloader__backdrop" />
      <div className="ss-preloader__mark">
        <div className="ss-preloader__logo-wrap">
          <Image
            src="/img/logo-header.png"
            alt="Santos and Santorini"
            width={360}
            height={110}
            priority
            className="ss-preloader__logo"
          />
        </div>
        <span className="ss-preloader__caption">Tailored in silence</span>
        <span className="ss-preloader__line" />
      </div>
    </div>
  );
}
