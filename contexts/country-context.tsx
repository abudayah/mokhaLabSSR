"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type Country = "US" | "CA"

interface CountryContextValue {
  country: Country
  setCountry: (c: Country) => void
}

const CountryContext = createContext<CountryContextValue | null>(null)

function readPersistedCountry(): Country | null {
  try {
    const stored = localStorage.getItem("country")
    if (stored === "US" || stored === "CA") return stored
  } catch {
    // private browsing or storage unavailable
  }
  return null
}

function persistCountry(country: Country): void {
  try {
    localStorage.setItem("country", country)
  } catch {
    // private browsing or storage unavailable
  }
}

export function CountryProvider({ children }: { children: ReactNode }) {
  const [country, setCountryState] = useState<Country>("US")

  useEffect(() => {
    // On mount, restore persisted preference or detect from IP
    const persisted = readPersistedCountry()
    if (persisted) {
      setCountryState(persisted)
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
          setCountryState("CA")
        }
      })
      .catch(() => {
        // timeout or network error — stay on US default
      })
      .finally(() => {
        clearTimeout(timeout)
      })

    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [])

  function setCountry(c: Country) {
    setCountryState(c)
    persistCountry(c)
  }

  return (
    <CountryContext.Provider value={{ country, setCountry }}>
      {children}
    </CountryContext.Provider>
  )
}

export function useCountry(): CountryContextValue {
  const ctx = useContext(CountryContext)
  if (!ctx) throw new Error("useCountry must be used within a CountryProvider")
  return ctx
}
