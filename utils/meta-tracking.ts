/**
 * Meta Pixel tracking utilities
 *
 * Single source of truth for all fbq() calls. Every event uses the product's
 * `id` field from lib/products.ts as `content_ids` — this must match the
 * "ID" column in the Meta Commerce Catalog exactly.
 *
 * Types provided by @types/facebook-pixel (DefinitelyTyped).
 * window.fbq is declared globally by that package — no manual declare needed.
 *
 * We use the facebook.Pixel.DPA variants for catalog events because they
 * enforce content_type and content_ids as required fields.
 *
 * Event mapping for this site:
 *   - Product page load      → ViewContent
 *   - "Buy on Amazon" click  → InitiateCheckout  (not AddToCart — the user is
 *     leaving to purchase on Amazon, not adding to a cart on this site)
 *   - Post-purchase          → Purchase (future, if a confirmation page is added)
 *
 * Parameter reference: https://developers.facebook.com/docs/meta-pixel/reference
 */

// ─── Internal helper ──────────────────────────────────────────────────────────

function fire(
  eventName: string,
  params:
    | facebook.Pixel.DPA.ViewContentParameters
    | facebook.Pixel.DPA.AddToCartParameters
    | facebook.Pixel.DPA.PurchaseParameters
    | facebook.Pixel.InitiateCheckoutParameters
): void {
  try {
    window.fbq("track", eventName, params)
  } catch {
    // fbq not available (consent denied, ad blocker, SSR) — fail silently
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fire a ViewContent event when a product detail page is viewed.
 *
 * Uses the DPA variant which requires content_type and content_ids —
 * both needed for Advantage+ catalog ad matching.
 *
 * @param productId  The product's `id` from lib/products.ts (e.g. "ML-PIT-BLK-53-01")
 */
export function trackViewContent(productId: string): void {
  fire("ViewContent", {
    content_ids: [productId],
    content_type: "product",
    contents: [{ id: productId, quantity: 1 }],
  } satisfies facebook.Pixel.DPA.ViewContentParameters)
}

/**
 * Fire an InitiateCheckout event when the user clicks "Buy on Amazon".
 *
 * InitiateCheckout is the correct Standard Event here — the user is leaving
 * this site to complete a purchase on Amazon. AddToCart would imply an item
 * was added to a cart on this site, which never happens.
 *
 * @param productId  The product's `id` from lib/products.ts
 * @param prices     Both USD and CAD prices from the product entry
 * @param store      Which storefront the user clicked — determines currency reported
 */
export function trackInitiateCheckout(
  productId: string,
  prices: { USD: number; CAD: number },
  store: "us" | "ca"
): void {
  const isCA = store === "ca"
  // Extend the base type — the official spec includes content_type and contents
  // but the community @types package hasn't added them yet.
  const params: facebook.Pixel.InitiateCheckoutParameters & {
    content_type: string
    contents: Array<{ id: string; quantity: number }>
  } = {
    content_ids: [productId],
    content_type: "product",
    contents: [{ id: productId, quantity: 1 }],
    num_items: 1,
    value: isCA ? prices.CAD : prices.USD,
    currency: isCA ? "CAD" : "USD",
  }
  fire("InitiateCheckout", params)
}

/**
 * Fire a Purchase event (future use — if a post-purchase confirmation page is added).
 * currency and value are required by the spec.
 *
 * @param productId  The product's `id` from lib/products.ts
 * @param prices     Both USD and CAD prices from the product entry
 * @param store      Which storefront — determines currency reported
 */
export function trackPurchase(
  productId: string,
  prices: { USD: number; CAD: number },
  store: "us" | "ca"
): void {
  const isCA = store === "ca"
  // Extend the DPA base type — the official spec includes contents
  // but the community @types package hasn't added it yet.
  const params: facebook.Pixel.DPA.PurchaseParameters & {
    contents: Array<{ id: string; quantity: number }>
    num_items: number
  } = {
    content_ids: [productId],
    content_type: "product",
    contents: [{ id: productId, quantity: 1 }],
    num_items: 1,
    value: isCA ? prices.CAD : prices.USD,
    currency: isCA ? "CAD" : "USD",
  }
  fire("Purchase", params)
}
