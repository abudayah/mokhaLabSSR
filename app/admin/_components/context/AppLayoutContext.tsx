"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

type AppLayoutContentType = "default" | "cards" | "table" | "wizard" | "form" | "dashboard"

interface AppLayoutContextValue {
  contentType: AppLayoutContentType
  setContentType: (type: AppLayoutContentType) => void
}

const AppLayoutContext = createContext<AppLayoutContextValue | null>(null)

export function AppLayoutProvider({ children }: { children: ReactNode }) {
  const [contentType, setContentTypeState] = useState<AppLayoutContentType>("default")

  const setContentType = useCallback((type: AppLayoutContentType) => {
    setContentTypeState(type)
  }, [])

  return (
    <AppLayoutContext.Provider value={{ contentType, setContentType }}>
      {children}
    </AppLayoutContext.Provider>
  )
}

export function useAppLayout(): AppLayoutContextValue {
  const ctx = useContext(AppLayoutContext)
  if (!ctx) throw new Error("useAppLayout must be used within AppLayoutProvider")
  return ctx
}

export type { AppLayoutContentType }
