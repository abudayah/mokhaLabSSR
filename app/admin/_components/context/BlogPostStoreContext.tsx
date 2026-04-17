"use client"

import { createContext, useState, useEffect, useMemo, ReactNode } from "react"
import { generateClient } from "aws-amplify/data"
import type { Schema } from "@/amplify/data/resource"
import type { BlogPost } from "@/lib/blog-posts"
import { seedPosts } from "@/lib/blog-posts"
import type { BlogPostFormData } from "@/app/admin/_components/types/admin"
import { generateSlug } from "@/app/admin/_components/utils/slugUtils"

export interface BlogPostStoreValue {
  posts: BlogPost[]
  loading: boolean
  getPostById: (id: string) => BlogPost | undefined
  getPostBySlug: (slug: string) => BlogPost | undefined
  createPost: (data: BlogPostFormData) => Promise<BlogPost>
  updatePost: (id: string, data: BlogPostFormData) => Promise<void>
  deletePost: (id: string) => Promise<void>
}

const BlogPostStoreContext = createContext<BlogPostStoreValue | null>(null)

/** Generates a unique slug, appending a 2-char random suffix on collision. */
function uniqueSlug(title: string, posts: BlogPost[], excludeId?: string): string {
  const base = generateSlug(title) || "post"
  const others = posts.filter((p) => p.id !== excludeId)
  if (!others.some((p) => p.slug === base)) return base
  const suffix = Math.random().toString(36).slice(2, 4)
  return `${base}-${suffix}`
}

/** Maps a raw DynamoDB item to our BlogPost interface. */
function toPost(item: Schema["BlogPost"]["type"]): BlogPost {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    subtitle: item.subtitle ?? undefined,
    date: item.date,
    author: item.author,
    body: item.body,
    featuredImage: item.featuredImage ?? undefined,
  }
}

export function BlogPostStoreProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const client = useMemo(() => generateClient<Schema>({ authMode: "userPool" }), [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { data: items } = await client.models.BlogPost.list()
        if (cancelled) return

        const mapped = (items ?? []).map(toPost)

        if (mapped.length === 0) {
          const seeded: BlogPost[] = []
          for (const seed of seedPosts) {
            if (cancelled) return
            const { data: created } = await client.models.BlogPost.create(seed)
            if (created) seeded.push(toPost(created))
          }
          if (!cancelled) setPosts(seeded)
        } else {
          if (!cancelled) setPosts(mapped.sort((a, b) => b.date.localeCompare(a.date)))
        }
      } catch (err) {
        console.error("Failed to load blog posts:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [client])

  function getPostById(id: string): BlogPost | undefined {
    return posts.find((p) => p.id === id)
  }

  function getPostBySlug(slug: string): BlogPost | undefined {
    return posts.find((p) => p.slug === slug)
  }

  async function createPost(data: BlogPostFormData): Promise<BlogPost> {
    const date = new Date().toISOString().split("T")[0]
    const slug = uniqueSlug(data.title, posts)
    const { data: created, errors } = await client.models.BlogPost.create({
      ...data,
      slug,
      date,
    })
    if (errors?.length || !created) throw new Error(errors?.[0]?.message ?? "Create failed")
    const post = toPost(created)
    setPosts((prev) => [post, ...prev])
    return post
  }

  async function updatePost(id: string, data: BlogPostFormData): Promise<void> {
    const existing = getPostById(id)
    const slug =
      existing && generateSlug(data.title) === generateSlug(existing.title)
        ? existing.slug
        : uniqueSlug(data.title, posts, id)
    const date = data.date ?? existing?.date
    const { data: updated, errors } = await client.models.BlogPost.update({
      id,
      ...data,
      slug,
      date,
    })
    if (errors?.length || !updated) throw new Error(errors?.[0]?.message ?? "Update failed")
    const post = toPost(updated)
    setPosts((prev) => prev.map((p) => (p.id === id ? post : p)))
  }

  async function deletePost(id: string): Promise<void> {
    const { errors } = await client.models.BlogPost.delete({ id })
    if (errors?.length) throw new Error(errors[0]?.message ?? "Delete failed")
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <BlogPostStoreContext.Provider
      value={{ posts, loading, getPostById, getPostBySlug, createPost, updatePost, deletePost }}
    >
      {children}
    </BlogPostStoreContext.Provider>
  )
}

export { BlogPostStoreContext }
