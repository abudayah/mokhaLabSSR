"use client"

import { createContext, useState, useEffect, useMemo, ReactNode } from "react"
import { generateClient } from "aws-amplify/data"
import type { Schema } from "@/amplify/data/resource"
import type {
  SupportTicket,
  ResponseLogEntry,
  CallLogEntry,
} from "@/lib/support-tickets"

// ─── Store interface ──────────────────────────────────────────────────────────

export interface SupportTicketStoreValue {
  tickets: SupportTicket[]
  loading: boolean
  getTicketById: (id: string) => SupportTicket | undefined
  updateTicketStatus: (id: string, status: SupportTicket["status"]) => Promise<void>
  assignTicket: (id: string, agentName: string) => Promise<void>
  saveInternalNotes: (id: string, notes: string) => Promise<void>
  addResponseLog: (id: string, entry: Omit<ResponseLogEntry, "id">) => Promise<void>
  addCallLog: (id: string, entry: Omit<CallLogEntry, "id">) => Promise<void>
}

const SupportTicketStoreContext = createContext<SupportTicketStoreValue | null>(null)

// ─── Mapper ───────────────────────────────────────────────────────────────────

function toTicket(item: Schema["SupportTicket"]["type"]): SupportTicket {
  return {
    id: item.id,
    ticketId: item.ticketId,
    customerName: item.customerName,
    email: item.email,
    phone: item.phone ?? undefined,
    country: item.country as "USA" | "Canada",
    state: item.state,
    caseType: item.caseType as "Inquiry" | "Warranty" | "Return",
    productName: item.productName,
    amazonPurchase: item.amazonPurchase,
    amazonOrderId: item.amazonOrderId ?? undefined,
    purchaseDate: item.purchaseDate ?? undefined,
    issueDescription: item.issueDescription,
    returnReason: item.returnReason ?? undefined,
    returnReasonOther: item.returnReasonOther ?? undefined,
    preferredResolution: item.preferredResolution ?? undefined,
    preferredResolutionOther: item.preferredResolutionOther ?? undefined,
    preferredContact: item.preferredContact as "Email" | "Phone",
    photoKeys: item.photoKeys ?? undefined,
    proofOfPurchaseKey: item.proofOfPurchaseKey ?? undefined,
    submissionTimestamp: item.submissionTimestamp,
    consentTimestamp: item.consentTimestamp,
    status: (item.status ?? "New") as SupportTicket["status"],
    assignedAgent: item.assignedAgent ?? undefined,
    internalNotes: item.internalNotes ?? undefined,
    responseLog: item.responseLog ?? undefined,
    callLog: item.callLog ?? undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SupportTicketStoreProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const client = useMemo(() => generateClient<Schema>({ authMode: "userPool" }), [])

  useEffect(() => {
    const sub = client.models.SupportTicket.observeQuery().subscribe({
      next: ({ items }) => {
        const mapped = items
          .map(toTicket)
          .sort((a, b) => b.submissionTimestamp.localeCompare(a.submissionTimestamp))
        setTickets(mapped)
        setLoading(false)
      },
      error: (err) => {
        console.error("SupportTicket observeQuery error:", err)
        setLoading(false)
      },
    })
    return () => sub.unsubscribe()
  }, [client])

  function getTicketById(id: string): SupportTicket | undefined {
    return tickets.find((t) => t.id === id)
  }

  async function updateTicketStatus(
    id: string,
    status: SupportTicket["status"]
  ): Promise<void> {
    const { errors } = await client.models.SupportTicket.update({ id, status })
    if (errors?.length) throw new Error(errors[0]?.message ?? "Update failed")
  }

  async function assignTicket(id: string, agentName: string): Promise<void> {
    const { errors } = await client.models.SupportTicket.update({
      id,
      assignedAgent: agentName || undefined,
    })
    if (errors?.length) throw new Error(errors[0]?.message ?? "Assign failed")
  }

  async function saveInternalNotes(id: string, notes: string): Promise<void> {
    const { errors } = await client.models.SupportTicket.update({ id, internalNotes: notes })
    if (errors?.length) throw new Error(errors[0]?.message ?? "Save failed")
  }

  async function addResponseLog(
    id: string,
    entry: Omit<ResponseLogEntry, "id">
  ): Promise<void> {
    const ticket = getTicketById(id)
    if (!ticket) throw new Error("Ticket not found")

    const existing: ResponseLogEntry[] = ticket.responseLog
      ? JSON.parse(ticket.responseLog)
      : []
    const newEntry: ResponseLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }
    const updated = [...existing, newEntry]

    const { errors } = await client.models.SupportTicket.update({
      id,
      responseLog: JSON.stringify(updated),
    })
    if (errors?.length) throw new Error(errors[0]?.message ?? "Update failed")
  }

  async function addCallLog(
    id: string,
    entry: Omit<CallLogEntry, "id">
  ): Promise<void> {
    const ticket = getTicketById(id)
    if (!ticket) throw new Error("Ticket not found")

    const existing: CallLogEntry[] = ticket.callLog
      ? JSON.parse(ticket.callLog)
      : []
    const newEntry: CallLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }
    const updated = [...existing, newEntry]

    const { errors } = await client.models.SupportTicket.update({
      id,
      callLog: JSON.stringify(updated),
    })
    if (errors?.length) throw new Error(errors[0]?.message ?? "Update failed")
  }

  return (
    <SupportTicketStoreContext.Provider
      value={{
        tickets,
        loading,
        getTicketById,
        updateTicketStatus,
        assignTicket,
        saveInternalNotes,
        addResponseLog,
        addCallLog,
      }}
    >
      {children}
    </SupportTicketStoreContext.Provider>
  )
}

export { SupportTicketStoreContext }
