"use client"

import { useCurrency, type Currency } from "@/contexts/currency-context"

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency()

  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value as Currency)}
      aria-label="Select currency"
      className="text-sm border border-border rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
    >
      <option value="USD">USD</option>
      <option value="CAD">CAD</option>
    </select>
  )
}
