"use client"

import { useContext } from "react"
import { SupportTicketStoreContext } from "./SupportTicketStoreContext"
import type { SupportTicketStoreValue } from "./SupportTicketStoreContext"

export function useSupportTicketStore(): SupportTicketStoreValue {
  const ctx = useContext(SupportTicketStoreContext)
  if (!ctx) throw new Error("useSupportTicketStore must be used within SupportTicketStoreProvider")
  return ctx
}
