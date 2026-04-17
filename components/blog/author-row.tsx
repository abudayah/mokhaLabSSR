"use client"

import { useState } from "react"
import { Share2, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface AuthorRowProps {
  author: string
  date: string
  readTime: number
  title?: string
  className?: string
}

export function AuthorRow({ author, date, readTime, title, className }: AuthorRowProps) {
  const [copied, setCopied] = useState(false)

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const handleShare = async () => {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({ title: title ?? document.title, url })
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Share failed:", err)
        }
      }
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available — silent fail
    }
  }

  return (
    <p className={cn("text-sm text-muted-foreground flex items-center gap-1 flex-wrap", className)}>
      {author} · {formattedDate} · {readTime} min read ·{" "}
      <button
        onClick={handleShare}
        aria-label="Share this post"
        className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground active:opacity-70 transition-colors"
      >
        {copied ? (
          <>
            <Check size={13} aria-hidden="true" /> Copied
          </>
        ) : (
          <>
            <Share2 size={13} aria-hidden="true" /> Share
          </>
        )}
      </button>
    </p>
  )
}
