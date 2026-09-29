import { cookies } from "next/headers"
import type { Metadata } from "next"
import { SITE_URL } from "@/lib/image-url"
import { getPublishedPosts, getAllPosts } from "@/lib/blog-api"
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils"
import { fetchAuthSession } from "aws-amplify/auth/server"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { HeroPost } from "@/components/blog/hero-post"
import { PostCard } from "@/components/blog/post-card"
import type { BlogPost } from "@/lib/blog-posts"

// Revalidate every 60 seconds for public readers; admins get force-dynamic below
export const revalidate = 60

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Stories about coffee culture, brewing rituals, and the philosophy behind mokhaLab tools.",
  openGraph: {
    title: "Blog | mokhaLab",
    description:
      "Stories about coffee culture, brewing rituals, and the philosophy behind mokhaLab tools.",
    url: `${SITE_URL}/blog`,
    siteName: "mokhaLab",
    locale: "en_US",
    type: "website",
    images: [{ url: `${SITE_URL}/images/hero.webp` }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | mokhaLab",
    description:
      "Stories about coffee culture, brewing rituals, and the philosophy behind mokhaLab tools.",
    images: [`${SITE_URL}/images/hero.webp`],
  },
  alternates: {
    canonical: `${SITE_URL}/blog`,
    languages: {
      "en-US": `${SITE_URL}/blog`,
      "en-CA": `${SITE_URL}/blog`,
      "x-default": `${SITE_URL}/blog`,
    },
  },
}

async function isAdmin(): Promise<boolean> {
  try {
    return await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (ctx) => {
        const session = await fetchAuthSession(ctx)
        return session.tokens !== undefined
      },
    })
  } catch {
    return false
  }
}

function applyDraftPrefix(posts: BlogPost[]): BlogPost[] {
  return posts.map((p) =>
    p.status === "draft" ? { ...p, title: `[DRAFT] ${p.title}` } : p
  )
}

export default async function BlogListPage() {
  const admin = await isAdmin()
  const raw = admin ? await getAllPosts() : await getPublishedPosts()
  const posts = admin ? applyDraftPrefix(raw) : raw

  return (
    <div className="min-h-screen blog-bg">
      <SiteHeader />

      <main className="pt-14">
        <div className="max-w-5xl mx-auto px-6 py-16 space-y-16">
          <p className="block text-center font-[family-name:var(--blog-serif)] text-3xl md:text-4xl font-bold duration-200">
            Stories about coffee
          </p>

          {posts.length > 0 && <HeroPost post={posts[0]} />}

          {posts.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {posts.slice(1).map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          )}

          {posts.length === 0 && (
            <p className="text-muted-foreground text-sm">No posts yet — check back soon.</p>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
