import { notFound } from "next/navigation"
import { generateClient } from "aws-amplify/data"
import { Amplify } from "aws-amplify"
import type { Metadata } from "next"
import Link from "next/link"
import type { Schema } from "@/amplify/data/resource"
import type { BlogPost } from "@/lib/blog-posts"
import { estimateReadTime } from "@/lib/blog-posts"
import { resolveImageUrl, resolveOgImageUrl, SITE_URL } from "@/lib/image-url"
import outputs from "@/amplify_outputs.json"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { S3Image } from "@/components/S3Image"
import { AuthorRow } from "@/components/blog/author-row"
import { PostCard } from "@/components/blog/post-card"
import { ReadingProgressBar } from "@/components/blog/reading-progress-bar"
import { ScrollToTopButton } from "@/components/blog/scroll-to-top-button"

Amplify.configure(outputs, { ssr: true })

const DEFAULT_IMAGE = `${SITE_URL}/images/hero.webp`

async function getAllPosts(): Promise<BlogPost[]> {
  try {
    const client = generateClient<Schema>()
    const { data } = await client.models.BlogPost.list()
    return (data ?? []).map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      subtitle: item.subtitle ?? undefined,
      date: item.date,
      author: item.author,
      body: item.body,
      featuredImage: item.featuredImage ?? undefined,
    }))
  } catch {
    return []
  }
}

async function getPost(slug: string): Promise<BlogPost | null> {
  const all = await getAllPosts()
  return all.find((p) => p.slug === slug) ?? null
}

// Tell Next.js which slugs to pre-render at build time
export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((p) => ({ slug: p.slug }))
}

// Revalidate every 60 seconds (ISR)
export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const post = await getPost(params.slug)
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
  const all = await getAllPosts()
  const post = all.find((p) => p.slug === params.slug)

  if (!post) notFound()

  const suggestions = pickRandom(
    all,
    2,
    all.findIndex((p) => p.slug === params.slug)
  )

  // Server-side sanitization — strip tags server-side; DOMPurify runs client-side only
  // We trust our own CMS content, so we render HTML directly.
  // If untrusted HTML is ever possible, add server-side sanitization here.
  const bodyHtml = post.body

  // JSON-LD structured data
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
