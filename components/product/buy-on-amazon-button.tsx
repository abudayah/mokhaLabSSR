"use client"

import { ShoppingBag } from "lucide-react"
import { useCountry } from "@/contexts/country-context"

interface BuyOnAmazonButtonProps {
  urls: { us?: string; ca?: string }
  productName?: string
  size?: "md" | "lg"
  align?: "start" | "center"
}

function trackBuyClick(label: string, url: string, store: "us" | "ca") {
  try {
    window.gtag?.("event", "add_to_cart", {
      event_category: "ecommerce",
      event_label: label,
      store,
      outbound_url: url,
    })
  } catch {
    // gtag not available (e.g. consent denied, ad blocker) — fail silently
  }
}

export function BuyOnAmazonButton({ urls, productName, size = "md", align = "start" }: BuyOnAmazonButtonProps) {
  const { country } = useCountry()
  const isCA = country === "CA"

  const hasCA = Boolean(urls.ca)
  const hasUS = Boolean(urls.us)

  // Determine which URL to show as primary based on selected country
  const preferCA = isCA && hasCA
  const primaryUrl = preferCA ? urls.ca! : urls.us!
  const primaryLabel = preferCA ? "Buy on Amazon.ca" : "Buy on Amazon.com"

  // Alt link only makes sense when both URLs exist
  const showAlt = hasCA && hasUS
  const altUrl = preferCA ? urls.us! : urls.ca!
  const altLabel = preferCA ? "Amazon.com" : "Amazon.ca"

  const iconSize = size === "lg" ? 20 : 18
  const textSize = size === "lg" ? "text-[17px]" : "text-[16px]"
  const padding = size === "lg" ? "px-10 py-4 rounded-[14px]" : "px-8 py-4 rounded-[12px]"

  if (!primaryUrl) return null

  return (
    <div className={`flex flex-col gap-2 ${align === "center" ? "items-center" : "items-start"}`}>
      <a
        href={primaryUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackBuyClick(productName ?? primaryLabel, primaryUrl, preferCA ? "ca" : "us")}
        className={`inline-flex items-center justify-center gap-2 bg-[#00A8E1] text-white font-semibold hover:opacity-90 active:opacity-80 transition-opacity ${textSize} ${padding}`}
      >
        <ShoppingBag size={iconSize} aria-hidden="true" />
        {primaryLabel}
      </a>
      {showAlt && (
        <p className="text-[12px] text-muted-foreground text-center">
          Also available on{" "}
          <a
            href={altUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackBuyClick(productName ?? altLabel, altUrl, preferCA ? "us" : "ca")}
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            {altLabel}
          </a>
        </p>
      )}
    </div>
  )
}
