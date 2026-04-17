import type { BlogPost } from "@/lib/blog-posts"

/**
 * Converts a title string to a URL-safe slug.
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Strips non-alphanumeric characters (except hyphens)
 * - Collapses multiple consecutive hyphens into one
 * - Trims leading/trailing hyphens
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Validates that a slug is unique among existing posts.
 * In edit mode, pass currentId to exclude the current post from the check.
 * Returns true if the slug is unique (safe to use), false if it conflicts.
 */
export function validateSlugUniqueness(
  slug: string,
  posts: BlogPost[],
  currentId?: string
): boolean {
  return !posts.some((post) => post.slug === slug && post.id !== currentId)
}
