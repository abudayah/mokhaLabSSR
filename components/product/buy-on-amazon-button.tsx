"use client"

import { ShoppingBag } from "lucide-react"
import { useCurrency } from "@/contexts/currency-context"

interface BuyOnAmazonButtonProps {
  urls: { us: string; ca: string }
  size?: "md" | "lg"
  align?: "start" | "center"
}

export function BuyOnAmazonButton({ urls, size = "md", align = "start" }: BuyOnAmazonButtonProps) {
  const { currency } = useCurrency()
  const isCA = currency === "CAD"

  const primaryUrl = isCA ? urls.ca : urls.us
  const primaryLabel = isCA ? "Buy on Amazon.ca" : "Buy on Amazon.com"
  const altUrl = isCA ? urls.us : urls.ca
  const altLabel = isCA ? "Amazon.com" : "Amazon.ca"

  const iconSize = size === "lg" ? 20 : 18
  const textSize = size === "lg" ? "text-[17px]" : "text-[16px]"
  const padding = size === "lg" ? "px-10 py-4 rounded-[14px]" : "px-8 py-4 rounded-[12px]"

  return (
    <div className={`flex flex-col gap-2 ${align === "center" ? "items-center" : "items-start"}`}>
      <a
        href={primaryUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center gap-2 bg-[#00A8E1] text-white font-semibold hover:opacity-90 active:opacity-80 transition-opacity ${textSize} ${padding}`}
      >
        <ShoppingBag size={iconSize} aria-hidden="true" />
        {primaryLabel}
      </a>
      <p className="text-[12px] text-muted-foreground text-center">
        Also available on{" "}
        <a
          href={altUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          {altLabel}
        </a>
      </p>
    </div>
  )
}
