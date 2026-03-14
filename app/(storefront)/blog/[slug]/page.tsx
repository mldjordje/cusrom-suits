import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import Reveal from "@/app/components/motion/Reveal";
import { getPostBySlug, listPosts } from "@/lib/blog/store";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return {
      title: "Post not found | Santos & Santorini",
      description: "Post not found",
    };
  }
  return {
    title: `${post.title} | Santos & Santorini`,
    description: post.excerpt || post.title,
  };
}

export default async function BlogDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const lang = await resolveStorefrontLanguage(await searchParams);
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
  const prevPost = currentIndex >= 0 && currentIndex < allPosts.items.length - 1 ? allPosts.items[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? allPosts.items[currentIndex - 1] : null;

  const encodedUrl = encodeURIComponent(`/blog/${post.slug}`);
  const encodedTitle = encodeURIComponent(post.title);

  return (
    <>
      <StorefrontHeader lang={lang} />
      <main className="page-wrapper">
        <Reveal as="section" className="blog-page blog-single container pt-4 pb-5">
          <div className="mw-930">
            <div className="breadcrumb mb-3">
              <Link href="/" className="menu-link menu-link_us-s text-uppercase fw-medium">
                {isEn ? "Home" : "Početna"}
              </Link>
              <span className="breadcrumb-separator menu-link fw-medium ps-1 pe-1">/</span>
              <Link href="/blog" className="menu-link menu-link_us-s text-uppercase fw-medium">
                Blog
              </Link>
              <span className="breadcrumb-separator menu-link fw-medium ps-1 pe-1">/</span>
              <span className="menu-link fw-medium text-uppercase">{post.title}</span>
            </div>
            <h1 className="page-title">{post.title}</h1>
            <div className="blog-single__item-meta">
              <span className="blog-single__item-meta__author">{isEn ? "By Santos Editorial" : "Santos Editorial"}</span>
              <span className="blog-single__item-meta__date">
                {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("sr-RS") : ""}
              </span>
              <span className="blog-single__item-meta__category">{post.postType.toUpperCase()}</span>
            </div>
          </div>

          <article className="blog-single__item-content">
            <p>
              <Image
                src={post.coverImage || "/assets/images/blog/blog-single.jpg"}
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
                    `<p>${post.excerpt || (isEn ? "No content available for this post." : "Sadržaj trenutno nije dostupan.")}</p>`,
                }}
              />
            </div>
          </article>

          <div className="blog-single__item-share mw-930">
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} className="btn btn-share btn-facebook" target="_blank" rel="noreferrer">
              <span>{isEn ? "Share on Facebook" : "Podeli na Facebook-u"}</span>
            </a>
            <a href={`https://twitter.com/share?text=${encodedTitle}&url=${encodedUrl}`} className="btn btn-share btn-twitter" target="_blank" rel="noreferrer">
              <span>{isEn ? "Share on Twitter" : "Podeli na X/Twitter-u"}</span>
            </a>
            <a href={`https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`} className="btn btn-share btn-pinterest" target="_blank" rel="noreferrer">
              <span>{isEn ? "Share on Pinterest" : "Podeli na Pinterest-u"}</span>
            </a>
          </div>

          <div className="blog-single__item-pagination mw-930">
            <div className="row">
              <div className="col-lg-6">
                {prevPost ? (
                  <>
                    <Link href={`/blog/${prevPost.slug}`} className="btn-link d-inline-flex align-items-center">
                      <span className="fw-medium">{isEn ? "PREVIOUS POST" : "PRETHODNA OBJAVA"}</span>
                    </Link>
                    <p>{prevPost.title}</p>
                  </>
                ) : null}
              </div>
              <div className="col-lg-6 text-lg-right">
                {nextPost ? (
                  <>
                    <Link href={`/blog/${nextPost.slug}`} className="btn-link d-inline-flex align-items-center">
                      <span className="fw-medium me-1">{isEn ? "NEXT POST" : "SLEDEĆA OBJAVA"}</span>
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
