import Link from "next/link";

export default function StorefrontFooter() {
  return (
    <footer className="footer footer_type_1">
      <div className="footer-middle container">
        <div className="row row-cols-lg-5 row-cols-2">
          <div className="footer-column footer-store-info col-12 mb-4 mb-lg-0">
            <div className="logo">
              <Link href="/" className="menu-link menu-link_us-s">
                SANTOS & SANTORINI
              </Link>
            </div>
            <p className="footer-address">Obrenoviceva 10, Nis, Serbia</p>
            <p className="m-0">
              <strong className="fw-medium">atelier@santos.rs</strong>
            </p>
            <p>
              <strong className="fw-medium">+381 18 250 250</strong>
            </p>
          </div>

          <div className="footer-column footer-menu mb-4 mb-lg-0">
            <h5 className="sub-menu__title text-uppercase">Company</h5>
            <ul className="sub-menu__list list-unstyled">
              <li className="sub-menu__item">
                <Link href="/" className="menu-link menu-link_us-s">
                  Home
                </Link>
              </li>
              <li className="sub-menu__item">
                <Link href="/blog" className="menu-link menu-link_us-s">
                  Blog
                </Link>
              </li>
              <li className="sub-menu__item">
                <Link href="/o-nama" className="menu-link menu-link_us-s">
                  O nama
                </Link>
              </li>
              <li className="sub-menu__item">
                <Link href="/kontakt" className="menu-link menu-link_us-s">
                  Kontakt
                </Link>
              </li>
              <li className="sub-menu__item">
                <Link href="/custom-suits" className="menu-link menu-link_us-s">
                  Custom Suits
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer-column footer-menu mb-4 mb-lg-0">
            <h5 className="sub-menu__title text-uppercase">Shop</h5>
            <ul className="sub-menu__list list-unstyled">
              <li className="sub-menu__item">
                <Link href="/web-shop" className="menu-link menu-link_us-s">
                  Web Shop
                </Link>
              </li>
              <li className="sub-menu__item">
                <Link href="/web-shop?inStock=1" className="menu-link menu-link_us-s">
                  In Stock
                </Link>
              </li>
              <li className="sub-menu__item">
                <Link href="/blog" className="menu-link menu-link_us-s">
                  Blog
                </Link>
              </li>
              <li className="sub-menu__item">
                <Link href="/akcije" className="menu-link menu-link_us-s">
                  Akcije
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer-column footer-menu mb-4 mb-lg-0">
            <h5 className="sub-menu__title text-uppercase">Support</h5>
            <ul className="sub-menu__list list-unstyled">
              <li className="sub-menu__item">
                <Link href="/admin" className="menu-link menu-link_us-s">
                  Admin
                </Link>
              </li>
              <li className="sub-menu__item">
                <Link href="/custom-suits/measure" className="menu-link menu-link_us-s">
                  Measure
                </Link>
              </li>
              <li className="sub-menu__item">
                <Link href="/kontakt" className="menu-link menu-link_us-s">
                  Kontakt
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer-column footer-newsletter col-12 mb-4 mb-lg-0">
            <h5 className="sub-menu__title text-uppercase">Newsletter</h5>
            <p>Get updates for new arrivals, tailoring events, and campaigns.</p>
            <form className="footer-newsletter__form position-relative bg-body" action="#" method="post">
              <input className="form-control border-white" type="email" name="email" placeholder="Your email address" />
              <input className="btn-link fw-medium bg-white position-absolute top-0 end-0 h-100" type="submit" value="JOIN" />
            </form>
          </div>
        </div>
      </div>

      <div className="footer-bottom container">
        <div className="d-block d-md-flex align-items-center">
          <span className="footer-copyright me-auto">Copyright {new Date().getFullYear()} Santos and Santorini</span>
        </div>
      </div>
    </footer>
  );
}
