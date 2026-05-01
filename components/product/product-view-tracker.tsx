"use client"

import { useEffect } from "react"
import { trackViewContent } from "@/utils/meta-tracking"

interface ProductViewTrackerProps {
  productId: string
  productName: string
}

/**
 * Fires a Meta Pixel ViewContent event once when the product page mounts.
 * Renders nothing — purely a side-effect component.
 *
 * Drop this into the product page Server Component:
 *   <ProductViewTracker productId={product.id} productName={product.name} />
 */
export function ProductViewTracker({ productId, productName }: ProductViewTrackerProps) {
  useEffect(() => {
    trackViewContent(productId)
  }, [productId, productName])

  return null
}
