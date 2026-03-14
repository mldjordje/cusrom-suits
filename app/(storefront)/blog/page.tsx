import Link from "next/link";
import Image from "next/image";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import Reveal from "@/app/components/motion/Reveal";
import { listPosts } from "@/lib/blog/store";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";

type SearchParams = Record<string, string | string[] | undefined>;

const toString = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

export const metadata = {
  title: "Blog | Santos & Santorini",
  description: "Santos blog i novosti iz kolekcije, stila i brenda.",
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const lang = await resolveStorefrontLanguage(params);
  const isEn = lang === "en";
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
      <StorefrontHeader lang={lang} />
      <main className="page-wrapper">
        <Reveal as="section" className="blog-page-title mb-4 mb-xl-5">
          <div className="title-bg">
            <Image
              src="/img/hero.jpg"
              width={1780}
              height={420}
              alt="Santos blog"
              className="h-auto w-100 object-fit-cover"
              priority
            />
          </div>
          <div className="container">
            <h2 className="page-title">Blog</h2>
            <div className="blog__filter">
              <Link href={makeHref(1, "all")} className={`menu-link menu-link_us-s ${type === "all" ? "menu-link_active" : ""}`}>
                SVE
              </Link>
              <Link href={makeHref(1, "blog")} className={`menu-link menu-link_us-s ${type === "blog" ? "menu-link_active" : ""}`}>
                BLOG
              </Link>
              <Link href={makeHref(1, "news")} className={`menu-link menu-link_us-s ${type === "news" ? "menu-link_active" : ""}`}>
                {isEn ? "NEWS" : "VESTI"}
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
                  placeholder={isEn ? "Search blog and news..." : "Pretraži blog i vesti..."}
                  style={{ maxWidth: "360px" }}
                />
                <button type="submit" className="btn btn-primary text-uppercase fw-medium">
                  {isEn ? "Search" : "Pretraži"}
                </button>
                {q ? (
                  <Link href={type === "all" ? "/blog" : `/blog?type=${type}`} className="btn btn-link text-uppercase fw-medium">
                    {isEn ? "Reset" : "Resetuj"}
                  </Link>
                ) : null}
              </div>
            </form>
          </div>
        </Reveal>

        <Reveal as="section" className="blog-page container" delay={0.04}>
          <h2 className="d-none">{isEn ? "The Blog" : "Blog"}</h2>
          <div className="blog-grid row row-cols-1 row-cols-md-2">
            {result.items.map((post) => (
              <div key={post.id} className="blog-grid__item ss-card-hover">
                <div className="blog-grid__item-image">
                  <Link href={`/blog/${post.slug}`}>
                    <Image
                      src={post.coverImage || "/img/hero2.jpg"}
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
                        Santos Editorial
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
                    <p>{(post.excerpt || "").slice(0, 160) || (isEn ? "Read the full article for more details." : "Pročitajte ceo tekst za više detalja.")}</p>
                    <Link href={`/blog/${post.slug}`} className="readmore-link">
                      {isEn ? "Read more" : "Pročitaj više"}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="mb-5 text-center fw-medium">
            {isEn ? `Showing ${result.items.length} of ${result.total} posts` : `Prikazano ${result.items.length} od ${result.total} objava`}
          </p>

          <div className="text-center pb-5">
            <Link
              href={makeHref(Math.min(totalPages, result.page + 1), type)}
              className={`btn-link btn-link_lg text-uppercase fw-medium ${result.page >= totalPages ? "disabled pe-none text-secondary" : ""}`}
            >
              {isEn ? "Load more" : "Učitaj još"}
            </Link>
          </div>
        </Reveal>
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
