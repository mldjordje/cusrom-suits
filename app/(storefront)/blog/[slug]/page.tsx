import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/app/components/seo/JsonLd";
import Reveal from "@/app/components/motion/Reveal";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import StorefrontSmartImage from "@/app/components/storefront/StorefrontSmartImage";
import { getPostBySlug, listPosts } from "@/lib/blog/store";
import {
  COMPANY_INFO,
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildSeoMetadata,
  truncateText,
} from "@/lib/seo";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const lang = await resolveStorefrontLanguage(await searchParams);
  const post = await getPostBySlug(slug);

  if (!post) {
    return buildSeoMetadata({
      title: "Post not found",
      description: "Trazeni blog post nije pronadjen.",
      path: "/blog",
      lang,
      noIndex: true,
    });
  }

  return buildSeoMetadata({
    title: post.title,
    description: post.excerpt || post.title,
    path: `/blog/${post.slug}`,
    lang,
    image: post.coverImage || "/img/hero.jpg",
    type: "article",
    keywords: [post.postType, post.title, "Santos blog"],
  });
}

export default async function BlogDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const pageSearchParams = await searchParams;
  const lang = await resolveStorefrontLanguage(pageSearchParams);
  const isEn = lang === "en";
  const post = await getPostBySlug(slug);
  if (!post || !post.isPublished) notFound();

  const allPosts = await listPosts({
    type: "all",
    page: 1,
    pageSize: 200,
    onlyPublished: true,
  });
  const currentIndex = allPosts.items.findIndex((item) => item.slug === post.slug);
  const prevPost =
    currentIndex >= 0 && currentIndex < allPosts.items.length - 1
      ? allPosts.items[currentIndex + 1]
      : null;
  const nextPost = currentIndex > 0 ? allPosts.items[currentIndex - 1] : null;

  const canonicalPath = isEn ? `/blog/${post.slug}?lang=en` : `/blog/${post.slug}`;
  const encodedUrl = encodeURIComponent(absoluteUrl(canonicalPath));
  const encodedTitle = encodeURIComponent(post.title);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: isEn ? "Home" : "Pocetna", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: post.title, path: canonicalPath },
  ]);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: truncateText(post.excerpt || post.title, 240),
    image: absoluteUrl(post.coverImage || "/img/hero.jpg"),
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt || post.publishedAt || post.createdAt,
    author: {
      "@type": "Organization",
      name: COMPANY_INFO.name,
    },
    publisher: {
      "@type": "Organization",
      name: COMPANY_INFO.name,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/img/logo.png"),
      },
    },
    mainEntityOfPage: absoluteUrl(canonicalPath),
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={articleJsonLd} />
      <StorefrontHeader lang={lang} />
      <main className="page-wrapper">
        <Reveal as="section" className="blog-page blog-single container pt-4 pb-5">
          <div className="mw-930">
            <div className="breadcrumb mb-3">
              <Link href={isEn ? "/?lang=en" : "/"} className="menu-link menu-link_us-s text-uppercase fw-medium">
                {isEn ? "Home" : "Pocetna"}
              </Link>
              <span className="breadcrumb-separator menu-link fw-medium ps-1 pe-1">/</span>
              <Link href={isEn ? "/blog?lang=en" : "/blog"} className="menu-link menu-link_us-s text-uppercase fw-medium">
                Blog
              </Link>
              <span className="breadcrumb-separator menu-link fw-medium ps-1 pe-1">/</span>
              <span className="menu-link fw-medium text-uppercase">{post.title}</span>
            </div>
            <h1 className="page-title">{post.title}</h1>
            <div className="blog-single__item-meta">
              <span className="blog-single__item-meta__author">
                {isEn ? "By Santos Editorial" : "Santos Editorial"}
              </span>
              <span className="blog-single__item-meta__date">
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString("sr-RS")
                  : ""}
              </span>
              <span className="blog-single__item-meta__category">
                {post.postType.toUpperCase()}
              </span>
            </div>
          </div>

          <article className="blog-single__item-content">
            <p>
              <StorefrontSmartImage
                sources={[post.coverImage || "", "/assets/images/blog/blog-single.jpg"]}
                fallbackSrc="/assets/images/blog/blog-single.jpg"
                width={1410}
                height={550}
                alt={post.title}
                className="w-100 h-auto d-block"
                priority
              />
            </p>
            <div className="mw-930">
              <div
                className="blog-single__content"
                dangerouslySetInnerHTML={{
                  __html:
                    post.bodyHtml ||
                    `<p>${
                      post.excerpt ||
                      (isEn
                        ? "No content available for this post."
                        : "Sadrzaj trenutno nije dostupan.")
                    }</p>`,
                }}
              />
            </div>
          </article>

          <div className="blog-single__item-share mw-930">
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
              className="btn btn-share btn-facebook"
              target="_blank"
              rel="noreferrer"
            >
              <span>{isEn ? "Share on Facebook" : "Podeli na Facebook-u"}</span>
            </a>
            <a
              href={`https://twitter.com/share?text=${encodedTitle}&url=${encodedUrl}`}
              className="btn btn-share btn-twitter"
              target="_blank"
              rel="noreferrer"
            >
              <span>{isEn ? "Share on Twitter" : "Podeli na X/Twitter-u"}</span>
            </a>
            <a
              href={`https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`}
              className="btn btn-share btn-pinterest"
              target="_blank"
              rel="noreferrer"
            >
              <span>{isEn ? "Share on Pinterest" : "Podeli na Pinterest-u"}</span>
            </a>
          </div>

          <div className="blog-single__item-pagination mw-930">
            <div className="row">
              <div className="col-lg-6">
                {prevPost ? (
                  <>
                    <Link
                      href={isEn ? `/blog/${prevPost.slug}?lang=en` : `/blog/${prevPost.slug}`}
                      className="btn-link d-inline-flex align-items-center"
                    >
                      <span className="fw-medium">
                        {isEn ? "PREVIOUS POST" : "PRETHODNA OBJAVA"}
                      </span>
                    </Link>
                    <p>{prevPost.title}</p>
                  </>
                ) : null}
              </div>
              <div className="col-lg-6 text-lg-right">
                {nextPost ? (
                  <>
                    <Link
                      href={isEn ? `/blog/${nextPost.slug}?lang=en` : `/blog/${nextPost.slug}`}
                      className="btn-link d-inline-flex align-items-center"
                    >
                      <span className="fw-medium me-1">
                        {isEn ? "NEXT POST" : "SLEDECA OBJAVA"}
                      </span>
                    </Link>
                    <p>{nextPost.title}</p>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </Reveal>
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
