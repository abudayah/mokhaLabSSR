import { NextRequest, NextResponse } from "next/server"
import { Amplify } from "aws-amplify"
import { generateClient } from "aws-amplify/data"
import type { Schema } from "@/amplify/data/resource"
import outputs from "@/amplify_outputs.json"
import {
  parseClick,
  incrementJsonCounter,
  incrementHourDistribution,
  addSeenIp,
} from "@/lib/metrics-parser"

// Configure Amplify for server-side data fetching (API key auth by default)
Amplify.configure(outputs, { ssr: true })

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const client = generateClient<Schema>() // uses default apiKey auth

  // ── 1. Look up QrLink by code ────────────────────────────────────────────
  const normalizedCode = params.code.toLowerCase()
  const { data: links } = await client.models.QrLink.list({
    filter: { code: { eq: normalizedCode } },
  })
  const link = links?.[0]
  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // ── 2. Capture request metadata ──────────────────────────────────────────
  const now = new Date()
  const nowIso = now.toISOString()

  const ua = request.headers.get("user-agent") ?? undefined
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("cf-connecting-ip") ??
    undefined
  const referer = request.headers.get("referer") ?? undefined

  // CloudFront geo headers (free, injected by Amplify Hosting / CloudFront)
  const country =
    request.headers.get("cloudfront-viewer-country") ??
    request.headers.get("cf-ipcountry") ??
    undefined

  // ── 3. Fire-and-forget: write ClickEvent + update metrics ────────────────
  void recordClick({
    client,
    link,
    nowIso,
    ua,
    ip,
    referer,
    country,
  }).catch(() => { /* swallow — redirect already sent */ })

  // ── 4. Immediate 302 redirect ────────────────────────────────────────────
  return NextResponse.redirect(link.destinationUrl, 302)
}

// ---------------------------------------------------------------------------
// recordClick — runs fully async after the 302 is returned to the user
// ---------------------------------------------------------------------------

async function recordClick({
  client,
  link,
  nowIso,
  ua,
  ip,
  referer,
  country,
}: {
  client: ReturnType<typeof generateClient<Schema>>
  link: { id: string; clickCount?: number | null; lastClickedAt?: string | null }
  nowIso: string
  ua: string | undefined
  ip: string | undefined
  referer: string | undefined
  country: string | undefined
}) {
  const parsed = parseClick(ua, referer)
  const dateKey = nowIso.slice(0, 10)                    // "YYYY-MM-DD"
  const hour = nowIso.slice(11, 13)                       // "HH"

  // ── Write raw ClickEvent ─────────────────────────────────────────────────
  const [, , existing] = await Promise.all([
    client.models.ClickEvent.create({
      qrLinkId: link.id,
      clickedAt: nowIso,
      userAgent: ua,
      ip,
      referer,
    }),
    // Update QrLink aggregate counter
    client.models.QrLink.update({
      id: link.id,
      clickCount: (link.clickCount ?? 0) + 1,
      lastClickedAt: nowIso,
    }),
    // Fetch existing daily summary for upsert
    client.models.ClickMetricSummary.listClickMetricSummaryByQrLinkId({
      qrLinkId: link.id,
      // @ts-expect-error Amplify filter on secondary index
      filter: { dateKey: { eq: dateKey } },
    }),
  ])

  const summary = (existing?.data ?? [])[0]

  // ── Upsert ClickMetricSummary ────────────────────────────────────────────
  const { seen: ipAlreadySeen, updated: updatedSeenIps } = addSeenIp(
    summary?.seenIps,
    ip ?? "unknown"
  )

  // Country key
  const countryKey = country ?? "Unknown"

  if (!summary) {
    // First click of the day for this link — CREATE
    await client.models.ClickMetricSummary.create({
      qrLinkId: link.id,
      dateKey,
      totalClicks: 1,
      uniqueIps: 1,
      likelyScanClicks: parsed.isLikelyScan ? 1 : 0,
      botClicks: parsed.isBot ? 1 : 0,
      mobileClicks: parsed.deviceCategory === "mobile" ? 1 : 0,
      tabletClicks: parsed.deviceCategory === "tablet" ? 1 : 0,
      desktopClicks: parsed.deviceCategory === "desktop" ? 1 : 0,
      unknownClicks: parsed.deviceCategory === "unknown" || parsed.deviceCategory === "bot" ? 1 : 0,
      topOS: incrementJsonCounter(null, parsed.os),
      topBrowsers: incrementJsonCounter(null, parsed.browser),
      topSources: incrementJsonCounter(null, parsed.source),
      topCountries: incrementJsonCounter(null, countryKey),
      hourDistribution: incrementHourDistribution(null, hour),
      seenIps: updatedSeenIps,
    })
  } else {
    // Subsequent click — UPDATE with incremented counters
    await client.models.ClickMetricSummary.update({
      id: summary.id,
      totalClicks: (summary.totalClicks ?? 0) + 1,
      uniqueIps: (summary.uniqueIps ?? 0) + (ipAlreadySeen ? 0 : 1),
      likelyScanClicks: (summary.likelyScanClicks ?? 0) + (parsed.isLikelyScan ? 1 : 0),
      botClicks: (summary.botClicks ?? 0) + (parsed.isBot ? 1 : 0),
      mobileClicks: (summary.mobileClicks ?? 0) + (parsed.deviceCategory === "mobile" ? 1 : 0),
      tabletClicks: (summary.tabletClicks ?? 0) + (parsed.deviceCategory === "tablet" ? 1 : 0),
      desktopClicks: (summary.desktopClicks ?? 0) + (parsed.deviceCategory === "desktop" ? 1 : 0),
      unknownClicks:
        (summary.unknownClicks ?? 0) +
        (parsed.deviceCategory === "unknown" || parsed.deviceCategory === "bot" ? 1 : 0),
      topOS: incrementJsonCounter(summary.topOS, parsed.os),
      topBrowsers: incrementJsonCounter(summary.topBrowsers, parsed.browser),
      topSources: incrementJsonCounter(summary.topSources, parsed.source),
      topCountries: incrementJsonCounter(summary.topCountries, countryKey),
      hourDistribution: incrementHourDistribution(summary.hourDistribution, hour),
      seenIps: updatedSeenIps,
    })
  }
}
