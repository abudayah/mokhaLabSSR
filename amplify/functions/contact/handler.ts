import type { APIGatewayProxyHandlerV2 } from "aws-lambda"
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses"

const ses = new SESClient({})

const ALLOWED_SUBJECTS = [
  "General Question",
  "Product Support",
  "Order & Shipping",
  "Wholesale & Vendors",
  "Press & Media",
  "Other",
]

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // CORS preflight
  if (event.requestContext.http.method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: "",
    }
  }

  if (event.requestContext.http.method !== "POST") {
    return { statusCode: 405, headers: corsHeaders(), body: "Method Not Allowed" }
  }

  let body: { name?: string; email?: string; subject?: string; message?: string }
  try {
    body = JSON.parse(event.body ?? "{}")
  } catch {
    return { statusCode: 400, headers: corsHeaders(), body: "Invalid JSON" }
  }

  const { name, email, subject, message } = body

  // Basic validation
  if (
    !name?.trim() ||
    !email?.trim() ||
    !subject?.trim() ||
    !message?.trim()
  ) {
    return { statusCode: 400, headers: corsHeaders(), body: "Missing required fields" }
  }

  if (!isValidEmail(email)) {
    return { statusCode: 400, headers: corsHeaders(), body: "Invalid email address" }
  }

  if (!ALLOWED_SUBJECTS.includes(subject)) {
    return { statusCode: 400, headers: corsHeaders(), body: "Invalid subject" }
  }

  const fromEmail = process.env.CONTACT_FROM_EMAIL
  const toEmail = process.env.CONTACT_TO_EMAIL

  if (!fromEmail || !toEmail) {
    console.error("Missing CONTACT_FROM_EMAIL or CONTACT_TO_EMAIL env vars")
    return { statusCode: 500, headers: corsHeaders(), body: "Server configuration error" }
  }

  try {
    await ses.send(
      new SendEmailCommand({
        Source: fromEmail,
        Destination: { ToAddresses: [toEmail] },
        ReplyToAddresses: [email],
        Message: {
          Subject: {
            Data: `[mokhaLab Contact] ${subject}`,
            Charset: "UTF-8",
          },
          Body: {
            Text: {
              Data: [
                `Name: ${name}`,
                `Email: ${email}`,
                `Subject: ${subject}`,
                "",
                message,
              ].join("\n"),
              Charset: "UTF-8",
            },
          },
        },
      })
    )

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: true }),
    }
  } catch (err) {
    console.error("SES send error:", err)
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: "Failed to send message",
    }
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json",
  }
}
