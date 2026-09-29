/**
 * Lightweight AppSync fetcher for server-side public blog reads.
 *
 * Uses a plain fetch() instead of the Amplify JS client so Next.js can
 * manage caching (next.revalidate) without the Amplify SDK making
 * uncacheable no-store requests to Cognito identity.
 */

import outputs from "@/amplify_outputs.json"
import type { BlogPost } from "@/lib/blog-posts"

const ENDPOINT: string = outputs.data.url
const API_KEY: string = outputs.data.api_key ?? ""

interface AppSyncResponse<T> {
  data?: T
  errors?: { message: string }[]
}

async function appsync<T>(
  query: string,
  variables?: Record<string, unknown>,
  revalidate?: number
): Promise<T | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify({ query, variables }),
      next: revalidate !== undefined ? { revalidate } : { revalidate: 60 },
    })
    const json: AppSyncResponse<T> = await res.json()
    if (json.errors?.length) {
      console.error("AppSync errors:", json.errors)
      return null
    }
    return json.data ?? null
  } catch (err) {
    console.error("AppSync fetch error:", err)
    return null
  }
}

const LIST_POSTS_QUERY = /* GraphQL */ `
  query ListBlogPosts {
    listBlogPosts(filter: { status: { eq: "published" } }) {
      items {
        id
        slug
        title
        subtitle
        date
        author
        body
        featuredImage
        status
      }
    }
  }
`

const LIST_ALL_POSTS_QUERY = /* GraphQL */ `
  query ListAllBlogPosts {
    listBlogPosts {
      items {
        id
        slug
        title
        subtitle
        date
        author
        body
        featuredImage
        status
      }
    }
  }
`

interface ListBlogPostsData {
  listBlogPosts: {
    items: {
      id: string
      slug: string
      title: string
      subtitle: string | null
      date: string
      author: string
      body: string
      featuredImage: string | null
      status: string | null
    }[]
  }
}

function toPost(item: ListBlogPostsData["listBlogPosts"]["items"][number]): BlogPost {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    subtitle: item.subtitle ?? undefined,
    date: item.date,
    author: item.author,
    body: item.body,
    featuredImage: item.featuredImage ?? undefined,
    status: item.status === "published" ? "published" : "draft",
  }
}

/** Fetch all published posts, sorted newest first. Revalidates every 60s. */
export async function getPublishedPosts(revalidate = 60): Promise<BlogPost[]> {
  const data = await appsync<ListBlogPostsData>(LIST_POSTS_QUERY, undefined, revalidate)
  const items = data?.listBlogPosts?.items ?? []
  return items.map(toPost).sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * Fetch ALL posts (draft + published) sorted newest first.
 * Only used for admin preview — always fetches fresh (no-store).
 */
export async function getAllPosts(): Promise<BlogPost[]> {
  const data = await appsync<ListBlogPostsData>(LIST_ALL_POSTS_QUERY, undefined, 0)
  const items = data?.listBlogPosts?.items ?? []
  return items.map(toPost).sort((a, b) => b.date.localeCompare(a.date))
}

/** Fetch a single published post by slug. Returns null if not found. */
export async function getPublishedPost(slug: string, revalidate = 60): Promise<BlogPost | null> {
  const posts = await getPublishedPosts(revalidate)
  return posts.find((p) => p.slug === slug) ?? null
}

/**
 * Fetch any post (draft or published) by slug.
 * Used for admin preview — always fetches fresh.
 */
export async function getAnyPost(slug: string): Promise<BlogPost | null> {
  const posts = await getAllPosts()
  return posts.find((p) => p.slug === slug) ?? null
}
