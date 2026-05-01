"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/**
 * Fires fbq('track', 'PageView') on every client-side route change.
 *
 * The Pixel init script in layout.tsx fires PageView once on the initial
 * hard load. This component handles all subsequent App Router navigations,
 * which don't re-run the inline script.
 */
export function MetaPixelPageView() {
  const pathname = usePathname()

  useEffect(() => {
    try {
      window.fbq?.("track", "PageView")
    } catch {
      // fbq not available — fail silently
    }
  }, [pathname])

  return null
}
