"use client"

import { useMemo } from "react"
import { useCountry } from "@/contexts/country-context"

interface ProductPriceProps {
  prices: { USD: number; CAD: number }
}

export function ProductPrice({ prices }: ProductPriceProps) {
  const { country } = useCountry()
  const isCA = country === "CA"

  const amount = isCA ? prices.CAD : prices.USD
  const currency = isCA ? "CAD" : "USD"

  const formatted = useMemo(() => {
    if (!amount) return null
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }, [amount, currency])

  if (!formatted) return null

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
        MSRP
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-[28px] font-semibold tracking-tight text-foreground">
          {formatted}
        </span>
        <span className="text-[13px] text-muted-foreground uppercase tracking-wide">
          {currency}
        </span>
      </div>
    </div>
  )
}
