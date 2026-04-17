"use client"

import { useContext } from "react"
import { BlogPostStoreContext } from "./BlogPostStoreContext"
import type { BlogPostStoreValue } from "./BlogPostStoreContext"

export function useBlogPostStore(): BlogPostStoreValue {
  const ctx = useContext(BlogPostStoreContext)
  if (!ctx) throw new Error("useBlogPostStore must be used within BlogPostStoreProvider")
  return ctx
}
