import Link from "next/link";
import Image from "next/image";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import { listPosts } from "@/lib/blog/store";

type SearchParams = Record<string, string | string[] | undefined>;

const toString = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

export const metadata = {
  title: "Blog | Santos & Santorini",
  description: "Santos journal, tailoring notes and legacy news updates.",
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Number.parseInt(toString(params.page), 10) || 1;
  const q = toString(params.q);
  const rawType = toString(params.type);
  const type: "all" | "blog" | "news" = rawType === "blog" || rawType === "news" ? rawType : "all";

  const result = await listPosts({
    query: q,
    type,
    page,
    pageSize: 8,
    onlyPublished: true,
  });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  const makeHref = (nextPage: number, nextType = type) => {
    const url = new URLSearchParams();
    if (q) url.set("q", q);
    if (nextType !== "all") url.set("type", nextType);
    if (nextPage > 1) url.set("page", String(nextPage));
    const search = url.toString();
    return search ? `/blog?${search}` : "/blog";
  };

  return (
    <>
      <StorefrontHeader />
      <main className="page-wrapper">
        <section className="blog-page-title mb-4 mb-xl-5">
          <div className="title-bg">
            <Image
              src="/assets/images/blog_title_bg.jpg"
              width={1780}
              height={420}
              alt="The Blog"
              className="h-auto w-100"
              priority
            />
          </div>
          <div className="container">
            <h2 className="page-title">The Blog</h2>
            <div className="blog__filter">
              <Link href={makeHref(1, "all")} className={`menu-link menu-link_us-s ${type === "all" ? "menu-link_active" : ""}`}>
                ALL
              </Link>
              <Link href={makeHref(1, "blog")} className={`menu-link menu-link_us-s ${type === "blog" ? "menu-link_active" : ""}`}>
                BLOG
              </Link>
              <Link href={makeHref(1, "news")} className={`menu-link menu-link_us-s ${type === "news" ? "menu-link_active" : ""}`}>
                NEWS
              </Link>
            </div>
            <form action="/blog" method="get" className="ss-blog1-search mt-3">
              {type !== "all" ? <input type="hidden" name="type" value={type} /> : null}
              <div className="d-flex flex-wrap gap-2">
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  className="form-control"
                  placeholder="Search blog/news..."
                  style={{ maxWidth: "360px" }}
                />
                <button type="submit" className="btn btn-primary text-uppercase fw-medium">
                  Search
                </button>
                {q ? (
                  <Link href={type === "all" ? "/blog" : `/blog?type=${type}`} className="btn btn-link text-uppercase fw-medium">
                    Reset
                  </Link>
                ) : null}
              </div>
            </form>
          </div>
        </section>

        <section className="blog-page container">
          <h2 className="d-none">The Blog</h2>
          <div className="blog-grid row row-cols-1 row-cols-md-2">
            {result.items.map((post) => (
              <div key={post.id} className="blog-grid__item">
                <div className="blog-grid__item-image">
                  <Link href={`/blog/${post.slug}`}>
                    <Image
                      src={post.coverImage || "/assets/images/blog/blog-1.jpg"}
                      width={690}
                      height={500}
                      alt={post.title}
                      className="h-auto w-100"
                    />
                  </Link>
                </div>
                  <div className="blog-grid__item-detail">
                    <div className="blog-grid__item-meta">
                      <span className="blog-grid__item-meta__author">
                        By Santos Editorial
                      </span>
                      <span className="blog-grid__item-meta__date">
                        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("sr-RS") : ""}
                      </span>
                      <span className="blog-grid__item-meta__author">{post.postType.toUpperCase()}</span>
                    </div>
                    <div className="blog-grid__item-title">
                      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </div>
                  <div className="blog-grid__item-content">
                    <p>{(post.excerpt || "").slice(0, 160) || "Read the full article for more details."}</p>
                    <Link href={`/blog/${post.slug}`} className="readmore-link">
                      Continue Reading
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="mb-5 text-center fw-medium">
            SHOWING {result.items.length} of {result.total} items
          </p>

          <div className="text-center pb-5">
            <Link
              href={makeHref(Math.min(totalPages, result.page + 1), type)}
              className={`btn-link btn-link_lg text-uppercase fw-medium ${result.page >= totalPages ? "disabled pe-none text-secondary" : ""}`}
            >
              Show More
            </Link>
          </div>
        </section>
      </main>
      <StorefrontFooter />
    </>
  );
}
