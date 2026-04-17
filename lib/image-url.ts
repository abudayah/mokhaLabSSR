import outputs from "@/amplify_outputs.json"

const storage = (outputs as { storage?: { bucket_name?: string; aws_region?: string } }).storage
const BUCKET = storage?.bucket_name ?? ""
const REGION = storage?.aws_region ?? "us-west-2"

/** Canonical public domain for the site. */
export const SITE_URL = "https://www.mokhalab.ca"

/**
 * Resolves any image reference to a fully-qualified public URL.
 *
 * Handles three input formats:
 *  - S3 key        e.g. "blog-images/photo.webp"
 *                  → https://<bucket>.s3.<region>.amazonaws.com/blog-images/photo.webp
 *  - Relative path e.g. "/images/hero.webp"
 *                  → https://www.mokhalab.ca/images/hero.webp
 *  - Absolute URL  e.g. "https://example.com/photo.webp"
 *                  → returned as-is
 *
 * Returns `fallback` (defaults to `""`) when `src` is empty.
 */
export function resolveImageUrl(src: string, fallback = ""): string {
  if (!src) return fallback
  if (src.startsWith("http")) return src
  if (src.startsWith("/")) return `${SITE_URL}${src}`
  // S3 key — no leading slash or protocol
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${src}`
}

/**
 * Derives the OG image URL from a display image key/URL by convention.
 *
 * The uploader always writes two variants to S3:
 *   blog-images/1234-photo.webp      ← display image (stored in featuredImage)
 *   blog-images/1234-photo-og.webp   ← OG image (1200×630, derived by this fn)
 *
 * Falls back to the branded static OG image for posts that predate this
 * convention (i.e. uploaded before the dual-variant uploader was in place).
 */
export function resolveOgImageUrl(src: string): string {
  const fallback = `${SITE_URL}/images/og-blog.jpg`
  if (!src) return fallback

  // Already an absolute URL — insert -og before the extension
  if (src.startsWith("http")) {
    return src.replace(/(\.[^./?#]+)(\?.*)?$/, "-og$1$2")
  }

  // Relative public path e.g. "/images/hero.webp" — no OG variant exists, use fallback
  if (src.startsWith("/")) return fallback

  // S3 key — derive the -og key and resolve it
  const ogKey = src.replace(/(\.[^.]+)$/, "-og$1")
  return resolveImageUrl(ogKey, fallback)
}
