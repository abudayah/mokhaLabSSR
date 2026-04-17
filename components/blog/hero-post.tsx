import Link from "next/link"
import type { BlogPost } from "@/lib/blog-posts"
import { estimateReadTime } from "@/lib/blog-posts"
import { S3Image } from "@/components/S3Image"

interface HeroPostProps {
  post: BlogPost
}

export function HeroPost({ post }: HeroPostProps) {
  const formattedDate = new Date(post.date + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const readTime = estimateReadTime(post.body)

  return (
    <article className="space-y-4">
      {post.featuredImage && (
        <Link
          href={`/blog/${post.slug}`}
          className="block aspect-[16/9] rounded-xl overflow-hidden w-full"
        >
          <S3Image
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </Link>
      )}

      <div className="space-y-3">
        <Link
          href={`/blog/${post.slug}`}
          className="block font-[family-name:var(--blog-serif)] text-3xl md:text-4xl font-bold transition-colors duration-200 hover:text-muted-foreground"
        >
          {post.title}
        </Link>

        {post.subtitle && (
          <p className="text-muted-foreground">{post.subtitle}</p>
        )}

        <p className="text-sm text-muted-foreground">
          <time dateTime={post.date}>{formattedDate}</time>
          {" · "}
          {readTime} min read
        </p>
      </div>
    </article>
  )
}
