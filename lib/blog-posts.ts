export interface BlogPost {
  /** DynamoDB-generated string ID */
  id: string
  /** URL-safe identifier: lowercase letters, digits, hyphens only */
  slug: string
  /** Display title */
  title: string
  /** Optional subtitle rendered below the title in muted style */
  subtitle?: string
  /** ISO 8601 date string, e.g. "2025-07-04" */
  date: string
  /** Author display name */
  author: string
  /** Article body as an HTML string */
  body: string
  /** Optional S3 key or URL for the hero image */
  featuredImage?: string
}

/**
 * Estimates reading time in minutes.
 * Strips HTML tags, splits on whitespace, divides by 200 wpm, rounds up.
 */
export function estimateReadTime(body: string): number {
  const text = body.replace(/<[^>]+>/g, " ")
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.ceil(words / 200)
}

/** Seed posts — written to DynamoDB on first load if the table is empty. */
export const seedPosts: Omit<BlogPost, "id">[] = [
  {
    slug: "why-we-obsess-over-every-detail",
    title: "Why We Obsess Over Every Detail",
    subtitle: "The philosophy behind mokhaLab tools",
    date: "2025-07-10",
    author: "mokhaLab",
    body: `<p>Every mokhaLab tool begins with a single question: what does this moment deserve?</p>`,
  },
  {
    slug: "the-morning-ritual-a-guide-to-intentional-brewing",
    title: "The Morning Ritual",
    subtitle: "A guide to intentional brewing",
    date: "2025-06-22",
    author: "mokhaLab",
    body: `<p>There is a version of the morning that belongs entirely to you.</p>`,
  },
  {
    slug: "coffee-culture-and-the-slow-movement",
    title: "Coffee Culture and the Slow Movement",
    subtitle: "Why the third wave was always about more than taste",
    date: "2025-05-14",
    author: "mokhaLab",
    body: `<p>Specialty coffee arrived at the same moment the world began moving fastest.</p>`,
  },
]
