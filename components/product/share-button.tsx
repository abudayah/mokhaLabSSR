"use client"

import { Share2 } from "lucide-react"

interface ShareButtonProps {
  title: string
  text?: string
}

export function ShareButton({ title, text }: ShareButtonProps) {
  async function handleShare() {
    try {
      await navigator.share({
        title,
        text: text ?? title,
        url: window.location.href,
      })
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Share failed:", err)
      }
    }
  }

  // navigator.share is browser-only — render nothing on the server,
  // show the button only when the share API is available
  if (typeof window !== "undefined" && !navigator.share) return null

  return (
    <button
      onClick={handleShare}
      aria-label="Share this product"
      className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-[14px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground active:opacity-70 transition-colors"
    >
      <Share2 size={15} aria-hidden="true" />
      Share
    </button>
  )
}
