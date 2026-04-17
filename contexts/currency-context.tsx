"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type Currency = "USD" | "CAD"

interface CurrencyContextValue {
  currency: Currency
  setCurrency: (c: Currency) => void
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

function readPersistedCurrency(): Currency | null {
  try {
    const stored = localStorage.getItem("currency")
    if (stored === "USD" || stored === "CAD") return stored
  } catch {
    // private browsing or storage unavailable
  }
  return null
}

function persistCurrency(currency: Currency): void {
  try {
    localStorage.setItem("currency", currency)
  } catch {
    // private browsing or storage unavailable
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("USD")
  const [detected, setDetected] = useState(false)

  useEffect(() => {
    // On mount, restore persisted preference or detect from IP
    const persisted = readPersistedCurrency()
    if (persisted) {
      setCurrencyState(persisted)
      setDetected(true)
      return
    }

    // Auto-detect based on IP geolocation
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    fetch("https://ipapi.co/json/", { signal: controller.signal })
      .then((res) => res.json())
      .then((data: unknown) => {
        if (
          data !== null &&
          typeof data === "object" &&
          "country_code" in data &&
          (data as Record<string, unknown>).country_code === "CA"
        ) {
          setCurrencyState("CAD")
        }
      })
      .catch(() => {
        // timeout or network error — stay on USD default
      })
      .finally(() => {
        clearTimeout(timeout)
        setDetected(true)
      })

    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [])

  function setCurrency(c: Currency) {
    setCurrencyState(c)
    persistCurrency(c)
  }

  // Suppress render until detection is done to avoid hydration mismatch
  if (!detected) return null

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error("useCurrency must be used within a CurrencyProvider")
  return ctx
}
