/**
 * Meta Pixel tracking utilities
 *
 * Single source of truth for all fbq() calls. Every event uses the product's
 * `id` field from lib/products.ts as `content_ids` — this must match the
 * "ID" column in the Meta Commerce Catalog exactly.
 *
 * Usage:
 *   import { trackViewContent, trackAddToCart } from "@/src/utils/meta-tracking"
 */

// ─── Type declarations ────────────────────────────────────────────────────────

declare global {
  interface Window {
    fbq?: (
      type: "track" | "trackCustom" | "init",
      eventName: string,
      params?: MetaEventParams
    ) => void
  }
}

interface MetaEventParams {
  content_ids: string[]
  content_type: "product"
  content_name?: string
  value?: number
  currency?: string
  [key: string]: unknown
}

// ─── Internal helper ──────────────────────────────────────────────────────────

function fire(eventName: string, params: MetaEventParams): void {
  try {
    window.fbq?.("track", eventName, params)
  } catch {
    // fbq not available (consent denied, ad blocker, SSR) — fail silently
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fire a ViewContent event when a product detail page is viewed.
 *
 * @param productId  The product's `id` from lib/products.ts (e.g. "ML-PIT-BLK-53-01")
 * @param productName  Human-readable product name for the event label
 */
export function trackViewContent(productId: string, productName: string): void {
  fire("ViewContent", {
    content_ids: [productId],
    content_type: "product",
    content_name: productName,
  })
}

/**
 * Fire an AddToCart event when the user clicks a Buy on Amazon button.
 *
 * @param productId  The product's `id` from lib/products.ts (e.g. "ML-PIT-BLK-53-01")
 * @param productName  Human-readable product name for the event label
 * @param priceUSD  USD price for the value field (pass 0 if unknown)
 */
export function trackAddToCart(
  productId: string,
  productName: string,
  priceUSD: number
): void {
  fire("AddToCart", {
    content_ids: [productId],
    content_type: "product",
    content_name: productName,
    value: priceUSD,
    currency: "USD",
  })
}

/**
 * Fire a Purchase event (for future use — e.g. post-purchase confirmation page).
 *
 * @param productId  The product's `id` from lib/products.ts
 * @param productName  Human-readable product name
 * @param priceUSD  USD price for the value field
 */
export function trackPurchase(
  productId: string,
  productName: string,
  priceUSD: number
): void {
  fire("Purchase", {
    content_ids: [productId],
    content_type: "product",
    content_name: productName,
    value: priceUSD,
    currency: "USD",
  })
}
