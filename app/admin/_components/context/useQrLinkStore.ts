"use client"

import { useContext } from "react"
import { QrLinkStoreContext } from "./QrLinkStoreContext"
import type { QrLinkStoreValue } from "./QrLinkStoreContext"

export function useQrLinkStore(): QrLinkStoreValue {
  const ctx = useContext(QrLinkStoreContext)
  if (!ctx) throw new Error("useQrLinkStore must be used within QrLinkStoreProvider")
  return ctx
}
