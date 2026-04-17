import { resolveImageUrl } from "@/lib/image-url"

interface S3ImageProps {
  /** S3 key, relative path, or absolute URL */
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Renders an image from an S3 key, a relative path, or an absolute URL.
 * Resolution logic lives in `lib/image-url.ts`.
 */
export function S3Image({ src, alt, className, style }: S3ImageProps) {
  const resolvedSrc = resolveImageUrl(src)
  if (!resolvedSrc) return null
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolvedSrc} alt={alt} className={className} style={style} />
}
