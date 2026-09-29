"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

type AppLayoutContentType = "default" | "cards" | "table" | "wizard" | "form" | "dashboard"

export interface BreadcrumbItem {
  text: string
  href: string
}

interface AppLayoutContextValue {
  contentType: AppLayoutContentType
  setContentType: (type: AppLayoutContentType) => void
  /** Override the auto-derived breadcrumb label for the current page's leaf crumb.
   *  Pass undefined to clear the override and fall back to the static label. */
  dynamicLabel: string | undefined
  setDynamicLabel: (label: string | undefined) => void
}

const AppLayoutContext = createContext<AppLayoutContextValue | null>(null)

export function AppLayoutProvider({ children }: { children: ReactNode }) {
  const [contentType, setContentTypeState] = useState<AppLayoutContentType>("default")
  const [dynamicLabel, setDynamicLabelState] = useState<string | undefined>(undefined)

  const setContentType = useCallback((type: AppLayoutContentType) => {
    setContentTypeState(type)
  }, [])

  const setDynamicLabel = useCallback((label: string | undefined) => {
    setDynamicLabelState(label)
  }, [])

  return (
    <AppLayoutContext.Provider value={{ contentType, setContentType, dynamicLabel, setDynamicLabel }}>
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
