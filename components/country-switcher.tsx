"use client"

import { useCountry } from "@/contexts/country-context"

export function CountrySwitcher() {
  const { country, setCountry } = useCountry()

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border p-0.5">
      <button
        onClick={() => setCountry("US")}
        aria-label="Switch to US store"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors ${
          country === "US"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span aria-hidden="true">🇺🇸</span>
        US
      </button>
      <button
        onClick={() => setCountry("CA")}
        aria-label="Switch to CA store"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors ${
          country === "CA"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span aria-hidden="true">🇨🇦</span>
        CA
      </button>
    </div>
  )
}
