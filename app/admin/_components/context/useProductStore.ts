"use client"

import { useContext } from "react"
import { ProductStoreContext } from "./ProductStoreContext"
import type { ProductStoreValue } from "./ProductStoreContext"

export function useProductStore(): ProductStoreValue {
  const ctx = useContext(ProductStoreContext)
  if (!ctx) throw new Error("useProductStore must be used within a ProductStoreProvider")
  return ctx
}
