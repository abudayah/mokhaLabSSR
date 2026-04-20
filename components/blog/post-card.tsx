import Link from "next/link"
import type { BlogPost } from "@/lib/blog-posts"
import { estimateReadTime } from "@/lib/blog-posts"
import { S3Image } from "@/components/S3Image"

interface PostCardProps {
  post: BlogPost
}

export function PostCard({ post }: PostCardProps) {
  const formattedDate = new Date(post.date + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const readTime = estimateReadTime(post.body)

  return (
    <Link href={`/blog/${post.slug}`} className="block transition-colors duration-200">
      <article className="py-3">
        {post.featuredImage && (
          <div className="aspect-video overflow-hidden rounded-lg mb-4">
            <S3Image
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <h2 className="text-xl font-[family-name:var(--blog-serif)] font-bold tracking-tight text-foreground mb-2">
          {post.title}
        </h2>

        {post.subtitle && (
          <p className="text-sm text-muted-foreground mb-2">{post.subtitle}</p>
        )}

        <p className="text-sm text-muted-foreground">
          <time dateTime={post.date}>{formattedDate}</time>
          {" · "}
          {readTime} min read
        </p>
      </article>
    </Link>
  )
}
