"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, get, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CInput } from "react-hook-form-cloudscape"
import Alert from "@cloudscape-design/components/alert"
import Badge from "@cloudscape-design/components/badge"
import Box from "@cloudscape-design/components/box"
import Button from "@cloudscape-design/components/button"
import ColumnLayout from "@cloudscape-design/components/column-layout"
import Container from "@cloudscape-design/components/container"
import ContentLayout from "@cloudscape-design/components/content-layout"
import Form from "@cloudscape-design/components/form"
import FormField from "@cloudscape-design/components/form-field"
import Header from "@cloudscape-design/components/header"
import Modal from "@cloudscape-design/components/modal"
import Select from "@cloudscape-design/components/select"
import SpaceBetween from "@cloudscape-design/components/space-between"
import StatusIndicator from "@cloudscape-design/components/status-indicator"
import Textarea from "@cloudscape-design/components/textarea"
import Table, { TableProps } from "@cloudscape-design/components/table"
import { useSupportTicketStore } from "@/app/admin/_components/context/useSupportTicketStore"
import { useNotifications } from "@/app/admin/_components/context/NotificationContext"
import { S3Image } from "@/components/S3Image"
import type { SupportTicket, ResponseLogEntry, CallLogEntry } from "@/lib/support-tickets"
import { STATUS_LABELS } from "@/lib/support-tickets"

// ─── Status config ────────────────────────────────────────────────────────────

type CloudscapeStatusType = "info" | "in-progress" | "success" | "stopped"

const STATUS_INDICATOR: Record<SupportTicket["status"], CloudscapeStatusType> = {
  New: "info",
  InProgress: "in-progress",
  Resolved: "success",
  Closed: "stopped",
}

const CASE_TYPE_COLOR: Record<SupportTicket["caseType"], "blue" | "grey" | "red"> = {
  Inquiry: "blue",
  Warranty: "grey",
  Return: "red",
}

const STATUS_OPTIONS = (["New", "InProgress", "Resolved", "Closed"] as const).map((s) => ({
  value: s,
  label: STATUS_LABELS[s],
}))

// ─── Key-value display ────────────────────────────────────────────────────────

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Box variant="awsui-key-label">{label}</Box>
      <Box variant="p">{children ?? "—"}</Box>
    </div>
  )
}

function formatTs(iso?: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  })
}

function formatDateOnly(iso?: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  })
}

// ─── Reply Modal ──────────────────────────────────────────────────────────────

const replySchema = z.object({
  agentName: z.string().min(1, "Agent name is required"),
  content: z.string().min(1, "Reply content is required"),
})
type ReplyFormData = z.infer<typeof replySchema>

function ReplyModal({ ticket, onDismiss }: { ticket: SupportTicket; onDismiss: () => void }) {
  const { addResponseLog } = useSupportTicketStore()
  const { addNotification } = useNotifications()

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ReplyFormData>({
    resolver: zodResolver(replySchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { agentName: "", content: "" },
  })

  async function onSubmit(data: ReplyFormData) {
    try {
      await addResponseLog(ticket.id, {
        content: data.content,
        agentName: data.agentName,
        sentAt: new Date().toISOString(),
      })
      addNotification({ type: "success", content: "Reply logged.", dismissible: true })
      onDismiss()
    } catch {
      addNotification({ type: "error", content: "Failed to log reply.", dismissible: true })
    }
  }

  return (
    <Modal
      visible
      onDismiss={onDismiss}
      size="large"
      header={`Log Reply — ${ticket.customerName}`}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" formAction="none" onClick={onDismiss}>Cancel</Button>
            <Button variant="primary" formAction="submit" form="reply-form" loading={isSubmitting}>
              Log Reply
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <form id="reply-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Form>
          <SpaceBetween size="l">
            <Alert type="info">
              Send your reply from <strong>anas@mokhalab.com</strong> first, then log it here.
            </Alert>
            <FormField label="Agent name" errorText={get(errors, "agentName.message")}>
              <CInput control={control} name="agentName" placeholder="e.g. Anas" />
            </FormField>
            <FormField label="Reply content" errorText={get(errors, "content.message")}>
              <Controller
                name="content"
                control={control}
                render={({ field }) => (
                  <Textarea
                    value={field.value}
                    onChange={({ detail }) => field.onChange(detail.value)}
                    placeholder="Paste or type the reply you sent to the customer…"
                    rows={8}
                  />
                )}
              />
            </FormField>
          </SpaceBetween>
        </Form>
      </form>
    </Modal>
  )
}

// ─── Log Call Modal ───────────────────────────────────────────────────────────

const callSchema = z.object({
  agentName: z.string().min(1, "Agent name is required"),
  callDate: z.string().min(1, "Call date is required"),
  notes: z.string().min(1, "Call notes are required"),
})
type CallFormData = z.infer<typeof callSchema>

function LogCallModal({ ticket, onDismiss }: { ticket: SupportTicket; onDismiss: () => void }) {
  const { addCallLog } = useSupportTicketStore()
  const { addNotification } = useNotifications()

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<CallFormData>({
    resolver: zodResolver(callSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      agentName: "",
      callDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  })

  async function onSubmit(data: CallFormData) {
    try {
      await addCallLog(ticket.id, {
        agentName: data.agentName,
        callDate: data.callDate,
        notes: data.notes,
      })
      addNotification({ type: "success", content: "Call logged.", dismissible: true })
      onDismiss()
    } catch {
      addNotification({ type: "error", content: "Failed to log call.", dismissible: true })
    }
  }

  return (
    <Modal
      visible
      onDismiss={onDismiss}
      header="Log a Call"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" formAction="none" onClick={onDismiss}>Cancel</Button>
            <Button variant="primary" formAction="submit" form="call-form" loading={isSubmitting}>
              Log Call
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <form id="call-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Form>
          <SpaceBetween size="l">
            <FormField label="Agent name" errorText={get(errors, "agentName.message")}>
              <CInput control={control} name="agentName" placeholder="e.g. Anas" />
            </FormField>
            <FormField label="Call date" errorText={get(errors, "callDate.message")}>
              <CInput control={control} name="callDate" />
            </FormField>
            <FormField label="Notes" errorText={get(errors, "notes.message")}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Textarea
                    value={field.value}
                    onChange={({ detail }) => field.onChange(detail.value)}
                    placeholder="Summary of the call…"
                    rows={5}
                  />
                )}
              />
            </FormField>
          </SpaceBetween>
        </Form>
      </form>
    </Modal>
  )
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────

const assignSchema = z.object({
  agentName: z.string(),
})
type AssignFormData = z.infer<typeof assignSchema>

function AssignModal({ ticket, onDismiss }: { ticket: SupportTicket; onDismiss: () => void }) {
  const { assignTicket } = useSupportTicketStore()
  const { addNotification } = useNotifications()

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<AssignFormData>({
    resolver: zodResolver(assignSchema),
    defaultValues: { agentName: ticket.assignedAgent ?? "" },
  })

  async function onSubmit(data: AssignFormData) {
    try {
      await assignTicket(ticket.id, data.agentName.trim())
      addNotification({ type: "success", content: "Ticket assigned.", dismissible: true })
      onDismiss()
    } catch {
      addNotification({ type: "error", content: "Failed to assign ticket.", dismissible: true })
    }
  }

  return (
    <Modal
      visible
      onDismiss={onDismiss}
      header="Assign Ticket"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" formAction="none" onClick={onDismiss}>Cancel</Button>
            <Button variant="primary" formAction="submit" form="assign-form" loading={isSubmitting}>
              Save
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <form id="assign-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Form>
          <FormField label={<>Agent name <i>— leave blank to unassign</i></>}>
            <CInput control={control} name="agentName" placeholder="e.g. Anas" />
          </FormField>
        </Form>
      </form>
    </Modal>
  )
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────

export default function SupportTicketDetailPage({ id }: { id: string }) {
  const { getTicketById, updateTicketStatus, saveInternalNotes } = useSupportTicketStore()
  const { addNotification } = useNotifications()
  const router = useRouter()

  const ticket = getTicketById(id)

  const [replyModalOpen, setReplyModalOpen] = useState(false)
  const [callModalOpen, setCallModalOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState<string | null>(null)
  const [savingStatus, setSavingStatus] = useState(false)

  if (!ticket) {
    return (
      <ContentLayout header={<Header variant="h1">Ticket Detail</Header>}>
        <Alert type="error">
          Ticket not found.{" "}
          <Button variant="inline-link" onClick={() => router.push("/admin/support")}>
            Back to Support Tickets
          </Button>
        </Alert>
      </ContentLayout>
    )
  }

  const photoKeysList = ticket.photoKeys
    ? ticket.photoKeys.split(",").filter(Boolean)
    : []

  const responseLogs: ResponseLogEntry[] = ticket.responseLog
    ? JSON.parse(ticket.responseLog)
    : []

  const callLogs: CallLogEntry[] = ticket.callLog ? JSON.parse(ticket.callLog) : []

  const currentNotes = notesValue !== null ? notesValue : (ticket.internalNotes ?? "")

  async function handleStatusChange(newStatus: SupportTicket["status"]) {
    setSavingStatus(true)
    try {
      await updateTicketStatus(ticket!.id, newStatus)
      addNotification({ type: "success", content: "Status updated.", dismissible: true })
    } catch {
      addNotification({ type: "error", content: "Failed to update status.", dismissible: true })
    } finally {
      setSavingStatus(false)
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true)
    try {
      await saveInternalNotes(ticket!.id, currentNotes)
      addNotification({ type: "success", content: "Notes saved.", dismissible: true })
    } catch {
      addNotification({ type: "error", content: "Failed to save notes.", dismissible: true })
    } finally {
      setSavingNotes(false)
    }
  }

  const responseColumns: TableProps.ColumnDefinition<ResponseLogEntry>[] = [
    { id: "sentAt", header: "Sent At", cell: (r) => formatTs(r.sentAt), minWidth: 160 },
    { id: "agentName", header: "Agent", cell: (r) => r.agentName, minWidth: 100 },
    { id: "content", header: "Content", cell: (r) => (
      <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{r.content}</span>
    )},
  ]

  const callColumns: TableProps.ColumnDefinition<CallLogEntry>[] = [
    { id: "callDate", header: "Date", cell: (r) => formatDateOnly(r.callDate), minWidth: 120 },
    { id: "agentName", header: "Agent", cell: (r) => r.agentName, minWidth: 100 },
    { id: "notes", header: "Notes", cell: (r) => (
      <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{r.notes}</span>
    )},
  ]

  return (
    <>
      <ContentLayout
        header={
          <Header
            variant="h1"
            info={<Badge color={CASE_TYPE_COLOR[ticket.caseType]}>{ticket.caseType}</Badge>}
            description={`Submitted ${formatTs(ticket.submissionTimestamp)}`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button formAction="none" onClick={() => setAssignModalOpen(true)}>
                  Assign
                </Button>
                <Button formAction="none" onClick={() => setCallModalOpen(true)}>
                  Log Call
                </Button>
                <Button variant="primary" formAction="none" onClick={() => setReplyModalOpen(true)}>
                  Log Reply
                </Button>
              </SpaceBetween>
            }
          >
            {ticket.ticketId}
          </Header>
        }
      >
        <SpaceBetween size="l">

          {/* ── Status & Assignment ─────────────────────────────────── */}
          <Container header={<Header variant="h2">Status & Assignment</Header>}>
            <ColumnLayout columns={3} variant="text-grid">
              <div>
                <Box variant="awsui-key-label">Current Status</Box>
                <StatusIndicator type={STATUS_INDICATOR[ticket.status]}>
                  {STATUS_LABELS[ticket.status]}
                </StatusIndicator>
              </div>
              <div>
                <Box variant="awsui-key-label">Assigned To</Box>
                <Box variant="p">{ticket.assignedAgent ?? "Unassigned"}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Update Status</Box>
                <Select
                  selectedOption={
                    STATUS_OPTIONS.find((o) => o.value === ticket.status) ?? STATUS_OPTIONS[0]
                  }
                  options={STATUS_OPTIONS}
                  onChange={({ detail }) =>
                    handleStatusChange(detail.selectedOption.value as SupportTicket["status"])
                  }
                  disabled={savingStatus}
                  ariaLabel="Update ticket status"
                />
              </div>
            </ColumnLayout>
          </Container>

          {/* ── Customer Information ────────────────────────────────── */}
          <Container header={<Header variant="h2">Customer Information</Header>}>
            <ColumnLayout columns={2} variant="text-grid">
              <SpaceBetween size="s">
                <KV label="Full Name">{ticket.customerName}</KV>
                <KV label="Email">
                  <a href={`mailto:${ticket.email}`}>{ticket.email}</a>
                </KV>
                <KV label="Phone">{ticket.phone ?? "—"}</KV>
              </SpaceBetween>
              <SpaceBetween size="s">
                <KV label="Country">{ticket.country}</KV>
                <KV label="State / Province">{ticket.state}</KV>
                <KV label="Preferred Contact">{ticket.preferredContact}</KV>
              </SpaceBetween>
            </ColumnLayout>
          </Container>

          {/* ── Case Details ────────────────────────────────────────── */}
          <Container header={<Header variant="h2">Case Details</Header>}>
            <ColumnLayout columns={2} variant="text-grid">
              <SpaceBetween size="s">
                <KV label="Product">{ticket.productName}</KV>
                <KV label="Amazon Purchase">
                  {ticket.amazonPurchase ? "Yes" : "No"}
                </KV>
                {ticket.amazonOrderId && (
                  <KV label="Amazon Order ID">{ticket.amazonOrderId}</KV>
                )}
                {ticket.purchaseDate && (
                  <KV label="Purchase Date">{formatDateOnly(ticket.purchaseDate)}</KV>
                )}
              </SpaceBetween>
              <SpaceBetween size="s">
                {ticket.returnReason && (
                  <KV label="Return Reason">
                    {ticket.returnReason === "Other" && ticket.returnReasonOther
                      ? `Other — ${ticket.returnReasonOther}`
                      : ticket.returnReason}
                  </KV>
                )}
                {ticket.preferredResolution && (
                  <KV label="Preferred Resolution">
                    {ticket.preferredResolution === "Other" && ticket.preferredResolutionOther
                      ? `Other — ${ticket.preferredResolutionOther}`
                      : ticket.preferredResolution}
                  </KV>
                )}
                <KV label="Consent Timestamp">{formatTs(ticket.consentTimestamp)}</KV>
              </SpaceBetween>
            </ColumnLayout>
            <Box margin={{ top: "l" }}>
              <Box variant="awsui-key-label">Issue Description</Box>
              <Box variant="p" padding={{ top: "xs" }}>
                <span style={{ whiteSpace: "pre-wrap" }}>{ticket.issueDescription}</span>
              </Box>
            </Box>
          </Container>

          {/* ── Attachments ─────────────────────────────────────────── */}
          {(ticket.proofOfPurchaseKey || photoKeysList.length > 0) && (
            <Container header={<Header variant="h2">Attachments</Header>}>
              <SpaceBetween size="m">
                {ticket.proofOfPurchaseKey && (
                  <div>
                    <Box variant="awsui-key-label">Proof of Purchase</Box>
                    <Box margin={{ top: "xs" }}>
                      <S3Image
                        src={ticket.proofOfPurchaseKey}
                        alt="Proof of purchase"
                        style={{ maxWidth: 240, maxHeight: 240, objectFit: "cover", borderRadius: 4, border: "1px solid #aab7b8" }}
                      />
                    </Box>
                  </div>
                )}
                {photoKeysList.length > 0 && (
                  <div>
                    <Box variant="awsui-key-label">Product Photos ({photoKeysList.length})</Box>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
                      {photoKeysList.map((key) => (
                        <S3Image
                          key={key}
                          src={key}
                          alt="Product photo"
                          style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 4, border: "1px solid #aab7b8" }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </SpaceBetween>
            </Container>
          )}

          {/* ── Email Reply Log ──────────────────────────────────────── */}
          <Container
            header={
              <Header
                variant="h2"
                counter={`(${responseLogs.length})`}
                actions={
                  <Button formAction="none" onClick={() => setReplyModalOpen(true)}>
                    Log Reply
                  </Button>
                }
              >
                Email Reply Log
              </Header>
            }
          >
            {responseLogs.length === 0 ? (
              <Box color="text-status-inactive" variant="p">No replies logged yet.</Box>
            ) : (
              <Table
                trackBy="id"
                columnDefinitions={responseColumns}
                items={[...responseLogs].reverse()}
                variant="embedded"
                ariaLabels={{ tableLabel: "Reply log" }}
              />
            )}
          </Container>

          {/* ── Call Log ────────────────────────────────────────────── */}
          <Container
            header={
              <Header
                variant="h2"
                counter={`(${callLogs.length})`}
                actions={
                  <Button formAction="none" onClick={() => setCallModalOpen(true)}>
                    Log Call
                  </Button>
                }
              >
                Call Log
              </Header>
            }
          >
            {callLogs.length === 0 ? (
              <Box color="text-status-inactive" variant="p">No calls logged yet.</Box>
            ) : (
              <Table
                trackBy="id"
                columnDefinitions={callColumns}
                items={[...callLogs].reverse()}
                variant="embedded"
                ariaLabels={{ tableLabel: "Call log" }}
              />
            )}
          </Container>

          {/* ── Internal Notes ───────────────────────────────────────── */}
          <Container header={<Header variant="h2">Internal Notes</Header>}>
            <SpaceBetween size="s">
              <Alert type="warning">
                Internal notes are not visible to the customer.
              </Alert>
              <Textarea
                value={currentNotes}
                onChange={({ detail }) => setNotesValue(detail.value)}
                placeholder="Add internal notes…"
                rows={6}
              />
              <Button
                variant="primary"
                formAction="none"
                loading={savingNotes}
                onClick={handleSaveNotes}
              >
                Save Notes
              </Button>
            </SpaceBetween>
          </Container>

        </SpaceBetween>
      </ContentLayout>

      {replyModalOpen && (
        <ReplyModal ticket={ticket} onDismiss={() => setReplyModalOpen(false)} />
      )}
      {callModalOpen && (
        <LogCallModal ticket={ticket} onDismiss={() => setCallModalOpen(false)} />
      )}
      {assignModalOpen && (
        <AssignModal ticket={ticket} onDismiss={() => setAssignModalOpen(false)} />
      )}
    </>
  )
}
