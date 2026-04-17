import { generateClient } from "aws-amplify/data"
import { Amplify } from "aws-amplify"
import type { Metadata } from "next"
import { SITE_URL } from "@/lib/image-url"
import type { Schema } from "@/amplify/data/resource"
import type { BlogPost } from "@/lib/blog-posts"
import outputs from "@/amplify_outputs.json"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { HeroPost } from "@/components/blog/hero-post"
import { PostCard } from "@/components/blog/post-card"

// Configure Amplify for server-side data fetching
Amplify.configure(outputs, { ssr: true })

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Explore stories about specialty coffee culture, espresso brewing rituals, and the craft philosophy behind every mokhaLab precision tool.",
  openGraph: {
    title: "The mokhaLab Blog — Coffee Culture & Craft Espresso Stories",
    description:
      "Explore stories about specialty coffee culture, espresso brewing rituals, and the craft philosophy behind every mokhaLab precision tool.",
    url: `${SITE_URL}/blog/`,
    siteName: "mokhaLab",
    locale: "en_CA",
    type: "website",
    // Next.js auto-serves /blog/opengraph-image from the route convention file
  },
  twitter: {
    card: "summary_large_image",
    title: "The mokhaLab Blog — Coffee Culture & Craft Espresso Stories",
    description:
      "Explore stories about specialty coffee culture, espresso brewing rituals, and the craft philosophy behind every mokhaLab precision tool.",
  },
  alternates: { canonical: `${SITE_URL}/blog/` },
}

async function getPosts(): Promise<BlogPost[]> {
  try {
    const client = generateClient<Schema>()
    const { data } = await client.models.BlogPost.list()
    const posts: BlogPost[] = (data ?? []).map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      subtitle: item.subtitle ?? undefined,
      date: item.date,
      author: item.author,
      body: item.body,
      featuredImage: item.featuredImage ?? undefined,
    }))
    return posts.sort((a, b) => b.date.localeCompare(a.date))
  } catch {
    return []
  }
}

export default async function BlogListPage() {
  const posts = await getPosts()

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
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
