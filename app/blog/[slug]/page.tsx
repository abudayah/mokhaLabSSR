import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import type { BlogPost } from "@/lib/blog-posts"
import { estimateReadTime } from "@/lib/blog-posts"
import { resolveImageUrl, resolveOgImageUrl, SITE_URL } from "@/lib/image-url"
import { getPublishedPosts, getPublishedPost } from "@/lib/blog-api"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { S3Image } from "@/components/S3Image"
import { AuthorRow } from "@/components/blog/author-row"
import { PostCard } from "@/components/blog/post-card"
import { ReadingProgressBar } from "@/components/blog/reading-progress-bar"
import { ScrollToTopButton } from "@/components/blog/scroll-to-top-button"

// Revalidate every 60 seconds (ISR)
export const revalidate = 60

const DEFAULT_IMAGE = `${SITE_URL}/images/hero.webp`

// Tell Next.js which slugs to pre-render at build time
export async function generateStaticParams() {
  const posts = await getPublishedPosts()
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const post = await getPublishedPost(params.slug)
  if (!post) return { title: "Post not found" }

  const title = `${post.title} | mokhaLab`
  const description = post.subtitle ?? post.title
  const ogImage = post.featuredImage
    ? resolveOgImageUrl(post.featuredImage)
    : `${SITE_URL}/images/og-blog.jpg`
  const url = `${SITE_URL}/blog/${post.slug}/`

  return {
    title: post.title,
    description,
    alternates: {
      canonical: url,
      languages: {
        "en-US": url,
        "en-CA": url,
        "x-default": url,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "mokhaLab",
      locale: "en_US",
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  }
}

function pickRandom<T>(arr: T[], count: number, excludeIndex: number): T[] {
  const pool = arr.filter((_, i) => i !== excludeIndex)
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count)
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const [post, allPosts] = await Promise.all([
    getPublishedPost(params.slug),
    getPublishedPosts(),
  ])

  if (!post) notFound()

  const suggestions = pickRandom(
    allPosts,
    2,
    allPosts.findIndex((p) => p.slug === params.slug)
  )

  const bodyHtml = post.body

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.subtitle ?? post.title,
    image: post.featuredImage
      ? resolveImageUrl(post.featuredImage, DEFAULT_IMAGE)
      : DEFAULT_IMAGE,
    datePublished: post.date,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "mokhaLab",
      url: SITE_URL,
    },
    url: `${SITE_URL}/blog/${post.slug}/`,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReadingProgressBar />
      <div className="min-h-screen bg-white">
        <SiteHeader />
        <main className="pt-14 blog-bg">
          <div className="max-w-3xl mx-auto px-6 py-12">
            <Link
              href="/blog"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 inline-block mb-8"
            >
              ← All Posts
            </Link>

            <article>
              <header className="mb-8">
                <h1 className="font-[family-name:var(--blog-serif)] text-4xl md:text-5xl font-bold mb-4">
                  {post.title}
                </h1>

                {post.subtitle && (
                  <p className="font-[family-name:var(--blog-serif)] text-muted-foreground mb-4 text-lg">
                    {post.subtitle}
                  </p>
                )}

                <AuthorRow
                  author={post.author}
                  date={post.date}
                  readTime={estimateReadTime(post.body)}
                  title={post.title}
                />
              </header>

              {post.featuredImage && (
                <figure className="mb-8">
                  <S3Image
                    src={post.featuredImage}
                    alt={post.title}
                    className="w-full rounded-xl"
                  />
                </figure>
              )}

              <div
                className="blog-prose prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            </article>

            <hr className="border-t border-neutral-100 mt-16" />
          </div>

          {suggestions.length > 0 && (
            <div className="border-t border-neutral-100 mt-4">
              <div className="max-w-3xl mx-auto px-6 py-12">
                <h3 className="text-muted-foreground mb-6">You might also enjoy</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {suggestions.map((s) => (
                    <PostCard key={s.slug} post={s} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
        <SiteFooter />
      </div>
      <ScrollToTopButton />
    </>
  )
}
