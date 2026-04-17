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
