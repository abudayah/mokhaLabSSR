import { NextRequest, NextResponse } from "next/server"
import { Amplify } from "aws-amplify"
import { generateClient } from "aws-amplify/data"
import type { Schema } from "@/amplify/data/resource"
import outputs from "@/amplify_outputs.json"

// Configure Amplify for server-side data fetching (API key auth by default)
Amplify.configure(outputs, { ssr: true })

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const client = generateClient<Schema>() // uses default apiKey auth

  // 1. Look up QrLink by code
  const { data: links } = await client.models.QrLink.list({
    filter: { code: { eq: params.code } },
  })
  const link = links?.[0]
  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // 2. Capture request metadata for the ClickEvent
  const now = new Date().toISOString()
  const ua = request.headers.get("user-agent") ?? undefined
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("cf-connecting-ip") ??
    undefined
  const referer = request.headers.get("referer") ?? undefined

  // 3. Fire-and-forget click recording — does NOT delay the redirect
  void Promise.all([
    client.models.ClickEvent.create({
      qrLinkId: link.id,
      clickedAt: now,
      userAgent: ua,
      ip,
      referer,
    }),
    client.models.QrLink.update({
      id: link.id,
      clickCount: (link.clickCount ?? 0) + 1,
      lastClickedAt: now,
    }),
  ]).catch(() => {
    /* swallow — redirect already sent */
  })

  // 4. Immediate 302 redirect to destination
  return NextResponse.redirect(link.destinationUrl, 302)
}
