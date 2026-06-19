import type { APIGatewayProxyHandlerV2 } from "aws-lambda"
import {
  SESClient,
  SendEmailCommand,
  type SendEmailCommandInput,
} from "@aws-sdk/client-ses"
import {
  DynamoDBClient,
  QueryCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb"

const ses = new SESClient({})
const dynamo = new DynamoDBClient({})

// Rate limiting: track submissions by email in DynamoDB
// Table name is passed via env var set in backend.ts
const RATE_LIMIT_TABLE = process.env.RATE_LIMIT_TABLE ?? ""
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_HOURS = 24

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json",
  }
}

function ok(body: object) {
  return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify(body) }
}

function err(status: number, message: string) {
  return { statusCode: status, headers: corsHeaders(), body: JSON.stringify({ error: message }) }
}

async function checkRateLimit(email: string): Promise<boolean> {
  if (!RATE_LIMIT_TABLE) return true // table not configured — allow through

  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString()

  try {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: RATE_LIMIT_TABLE,
        KeyConditionExpression: "email = :e AND submittedAt > :w",
        ExpressionAttributeValues: {
          ":e": { S: email.toLowerCase() },
          ":w": { S: windowStart },
        },
        Select: "COUNT",
      })
    )
    return (result.Count ?? 0) < RATE_LIMIT_MAX
  } catch {
    // If rate limit check fails, allow through rather than blocking
    return true
  }
}

async function recordSubmission(email: string): Promise<void> {
  if (!RATE_LIMIT_TABLE) return

  const now = new Date().toISOString()
  const ttl = Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW_HOURS * 3600 + 3600

  try {
    await dynamo.send(
      new PutItemCommand({
        TableName: RATE_LIMIT_TABLE,
        Item: {
          email: { S: email.toLowerCase() },
          submittedAt: { S: now },
          ttl: { N: String(ttl) },
        },
      })
    )
  } catch {
    // Non-fatal — submission proceeds even if recording fails
  }
}

/** Formats a date string like "2026-06-18" to "June 18, 2026" */
function formatDate(iso?: string): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    })
  } catch {
    return iso
  }
}

function buildCustomerEmailBody(ticket: TicketPayload): SendEmailCommandInput["Message"] {
  const lines = [
    `Hi ${ticket.customerName},`,
    "",
    `Thank you for contacting mokhaLab Support. We've received your request and assigned it ticket number ${ticket.ticketId}.`,
    "",
    "We'll get back to you within 24 hours.",
    "",
    "─── Your Submission Summary ───────────────────────",
    "",
    `Ticket ID:         ${ticket.ticketId}`,
    `Case Type:         ${ticket.caseType}`,
    `Product:           ${ticket.productName}`,
    `Country / State:   ${ticket.country} / ${ticket.state}`,
    `Issue Description: ${ticket.issueDescription}`,
  ]

  if (ticket.purchaseDate) {
    lines.push(`Purchase Date:     ${formatDate(ticket.purchaseDate)}`)
  }
  if (ticket.amazonOrderId) {
    lines.push(`Amazon Order ID:   ${ticket.amazonOrderId}`)
  }
  if (ticket.returnReason) {
    const reason =
      ticket.returnReason === "Other" && ticket.returnReasonOther
        ? `Other — ${ticket.returnReasonOther}`
        : ticket.returnReason
    lines.push(`Return Reason:     ${reason}`)
  }
  if (ticket.preferredResolution) {
    const resolution =
      ticket.preferredResolution === "Other" && ticket.preferredResolutionOther
        ? `Other — ${ticket.preferredResolutionOther}`
        : ticket.preferredResolution
    lines.push(`Preferred Resolution: ${resolution}`)
  }

  lines.push(
    "",
    "─────────────────────────────────────────────────",
    "",
    `If you need to follow up, reply to this email or contact us at anas@mokhalab.com`,
    "",
    "Thank you,",
    "mokhaLab Support Team",
    "anas@mokhalab.com"
  )

  return {
    Subject: { Data: `[mokhaLab] Support Request Received — ${ticket.ticketId}`, Charset: "UTF-8" },
    Body: {
      Text: { Data: lines.join("\n"), Charset: "UTF-8" },
    },
  }
}

function buildAdminEmailBody(ticket: TicketPayload): SendEmailCommandInput["Message"] {
  const lines = [
    `New support ticket received: ${ticket.ticketId}`,
    "",
    `Name:              ${ticket.customerName}`,
    `Email:             ${ticket.email}`,
    `Phone:             ${ticket.phone ?? "—"}`,
    `Country / State:   ${ticket.country} / ${ticket.state}`,
    `Case Type:         ${ticket.caseType}`,
    `Product:           ${ticket.productName}`,
    `Amazon Purchase:   ${ticket.amazonPurchase ? "Yes" : "No"}`,
    `Amazon Order ID:   ${ticket.amazonOrderId ?? "—"}`,
    `Purchase Date:     ${formatDate(ticket.purchaseDate)}`,
    `Preferred Contact: ${ticket.preferredContact}`,
    `Issue Description:`,
    ticket.issueDescription,
  ]

  if (ticket.returnReason) {
    const reason =
      ticket.returnReason === "Other" && ticket.returnReasonOther
        ? `Other — ${ticket.returnReasonOther}`
        : ticket.returnReason
    lines.push("", `Return Reason: ${reason}`)
  }

  if (ticket.preferredResolution) {
    const resolution =
      ticket.preferredResolution === "Other" && ticket.preferredResolutionOther
        ? `Other — ${ticket.preferredResolutionOther}`
        : ticket.preferredResolution
    lines.push("", `Preferred Resolution: ${resolution}`)
  }

  if (ticket.photoCount) {
    lines.push("", `Photos uploaded: ${ticket.photoCount}`)
  }

  lines.push("", `Submitted: ${ticket.submissionTimestamp}`)

  return {
    Subject: { Data: `[mokhaLab Support] New Ticket — ${ticket.ticketId} (${ticket.caseType})`, Charset: "UTF-8" },
    Body: {
      Text: { Data: lines.join("\n"), Charset: "UTF-8" },
    },
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketPayload {
  ticketId: string
  customerName: string
  email: string
  phone?: string
  country: string
  state: string
  caseType: string
  productName: string
  amazonPurchase: boolean
  amazonOrderId?: string
  purchaseDate?: string
  issueDescription: string
  returnReason?: string
  returnReasonOther?: string
  preferredResolution?: string
  preferredResolutionOther?: string
  preferredContact: string
  photoCount?: number
  submissionTimestamp: string
  consentTimestamp: string
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (event.requestContext.http.method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" }
  }

  if (event.requestContext.http.method !== "POST") {
    return err(405, "Method Not Allowed")
  }

  let ticket: Partial<TicketPayload>
  try {
    ticket = JSON.parse(event.body ?? "{}")
  } catch {
    return err(400, "Invalid JSON")
  }

  // Basic validation
  if (
    !ticket.customerName?.trim() ||
    !ticket.email?.trim() ||
    !ticket.country?.trim() ||
    !ticket.state?.trim() ||
    !ticket.caseType?.trim() ||
    !ticket.productName?.trim() ||
    !ticket.issueDescription?.trim() ||
    !ticket.preferredContact?.trim() ||
    !ticket.consentTimestamp
  ) {
    return err(400, "Missing required fields")
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ticket.email)) {
    return err(400, "Invalid email address")
  }

  if (!["Inquiry", "Warranty", "Return"].includes(ticket.caseType)) {
    return err(400, "Invalid case type")
  }

  if (!["USA", "Canada"].includes(ticket.country)) {
    return err(400, "Invalid country")
  }

  // Rate limiting
  const allowed = await checkRateLimit(ticket.email)
  if (!allowed) {
    return err(429, "Too many submissions. Please try again after 24 hours.")
  }

  const fromEmail = process.env.SUPPORT_FROM_EMAIL
  const adminEmail = process.env.SUPPORT_ADMIN_EMAIL

  if (!fromEmail || !adminEmail) {
    console.error("Missing SUPPORT_FROM_EMAIL or SUPPORT_ADMIN_EMAIL env vars")
    return err(500, "Server configuration error")
  }

  const fullTicket = ticket as TicketPayload

  try {
    // Send both emails in parallel
    await Promise.all([
      ses.send(
        new SendEmailCommand({
          Source: fromEmail,
          Destination: { ToAddresses: [fullTicket.email] },
          ReplyToAddresses: [adminEmail],
          Message: buildCustomerEmailBody(fullTicket),
        })
      ),
      ses.send(
        new SendEmailCommand({
          Source: fromEmail,
          Destination: { ToAddresses: [adminEmail] },
          ReplyToAddresses: [fullTicket.email],
          Message: buildAdminEmailBody(fullTicket),
        })
      ),
    ])

    await recordSubmission(fullTicket.email)

    return ok({ ok: true, ticketId: fullTicket.ticketId })
  } catch (e) {
    console.error("SES send error:", e)
    return err(500, "Failed to send confirmation email")
  }
}
