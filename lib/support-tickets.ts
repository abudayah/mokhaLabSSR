/** Canonical SupportTicket interface used throughout the admin portal. */
export interface SupportTicket {
  id: string
  ticketId: string
  customerName: string
  email: string
  phone?: string
  country: "USA" | "Canada"
  state: string
  caseType: "Inquiry" | "Warranty" | "Return"
  productName: string
  amazonPurchase: boolean
  amazonOrderId?: string
  purchaseDate?: string
  issueDescription: string
  returnReason?: string
  returnReasonOther?: string
  preferredResolution?: string
  preferredResolutionOther?: string
  preferredContact: "Email" | "Phone"
  photoKeys?: string      // comma-separated S3 keys
  proofOfPurchaseKey?: string
  submissionTimestamp: string
  consentTimestamp: string
  status: "New" | "InProgress" | "Resolved" | "Closed"
  assignedAgent?: string
  internalNotes?: string
  responseLog?: string    // JSON: ResponseLogEntry[]
  callLog?: string        // JSON: CallLogEntry[]
  createdAt: string
  updatedAt: string
}

export interface ResponseLogEntry {
  id: string
  content: string
  sentAt: string
  agentName: string
}

export interface CallLogEntry {
  id: string
  callDate: string
  agentName: string
  notes: string
}

export const STATUS_LABELS: Record<SupportTicket["status"], string> = {
  New: "New",
  InProgress: "In Progress",
  Resolved: "Resolved",
  Closed: "Closed",
}

export const STATUS_COLORS: Record<SupportTicket["status"], string> = {
  New: "#0972d3",
  InProgress: "#8d6605",
  Resolved: "#037f0c",
  Closed: "#5f6b7a",
}
