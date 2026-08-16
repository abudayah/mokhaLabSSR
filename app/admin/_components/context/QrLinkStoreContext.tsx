"use client"

import { createContext, useState, useEffect, useMemo, ReactNode } from "react"
import { generateClient } from "aws-amplify/data"
import type { Schema } from "@/amplify/data/resource"
import type { QrLink, ClickEvent, ClickMetricSummary } from "@/lib/qr-links"
import type { QrLinkFormData } from "@/app/admin/_components/schemas/qrLinkSchema"
import { generateUniqueCode } from "@/app/admin/_components/utils/shortCodeUtils"

export interface UpdateLinkData {
  destinationUrl: string
  label: string
}

export interface QrLinkStoreValue {
  links: QrLink[]
  loading: boolean
  getLinkById: (id: string) => QrLink | undefined
  getLinkByCode: (code: string) => QrLink | undefined
  createLink: (data: QrLinkFormData) => Promise<QrLink>
  updateLink: (id: string, data: UpdateLinkData) => Promise<void>
  deleteLink: (id: string) => Promise<void>
  fetchClickEvents: (qrLinkId: string) => Promise<ClickEvent[]>
  fetchMetricSummaries: (qrLinkId: string) => Promise<ClickMetricSummary[]>
  /** Fetches all ClickMetricSummary records for the past `days` days (default 7) across all links */
  fetchRecentMetricSummaries: (days?: number) => Promise<ClickMetricSummary[]>
}

const QrLinkStoreContext = createContext<QrLinkStoreValue | null>(null)

/** Maps a raw DynamoDB item to our QrLink interface. */
function toQrLink(item: Schema["QrLink"]["type"]): QrLink {
  return {
    id: item.id,
    code: item.code,
    destinationUrl: item.destinationUrl,
    label: item.label ?? undefined,
    createdAt: item.createdAt,
    clickCount: item.clickCount ?? 0,
    lastClickedAt: item.lastClickedAt ?? undefined,
  }
}

/** Maps a raw DynamoDB item to our ClickEvent interface. */
function toClickEvent(item: Schema["ClickEvent"]["type"]): ClickEvent {
  return {
    id: item.id,
    qrLinkId: item.qrLinkId,
    clickedAt: item.clickedAt,
    userAgent: item.userAgent ?? undefined,
    ip: item.ip ?? undefined,
    referer: item.referer ?? undefined,
    createdAt: item.createdAt,
  }
}

export function QrLinkStoreProvider({ children }: { children: ReactNode }) {
  const [links, setLinks] = useState<QrLink[]>([])
  const [loading, setLoading] = useState(true)
  const client = useMemo(() => generateClient<Schema>({ authMode: "userPool" }), [])

  useEffect(() => {
    // Use observeQuery for real-time updates — picks up clickCount/lastClickedAt
    // changes written by the redirect handler automatically
    const sub = client.models.QrLink.observeQuery().subscribe({
      next: ({ items }) => {
        const mapped = items
          .map(toQrLink)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        setLinks(mapped)
        setLoading(false)
      },
      error: (err) => {
        console.error("QrLink observeQuery error:", err)
        setLoading(false)
      },
    })
    return () => sub.unsubscribe()
  }, [client])

  function getLinkById(id: string): QrLink | undefined {
    return links.find((l) => l.id === id)
  }

  function getLinkByCode(code: string): QrLink | undefined {
    return links.find((l) => l.code === code)
  }

  async function createLink(data: QrLinkFormData): Promise<QrLink> {
    const existingCodes = new Set(links.map((l) => l.code))

    let code: string
    if (data.customCode && data.customCode.trim() !== "") {
      code = data.customCode.trim().toLowerCase()
      // Verify uniqueness against DynamoDB directly — not just local cache
      const { data: existing } = await client.models.QrLink.list({
        filter: { code: { eq: code } },
      })
      if (existing?.length) {
        throw new Error("This short code is already in use.")
      }
    } else {
      code = await generateUniqueCode(existingCodes)
      // Double-check the generated code against DynamoDB
      const { data: existing } = await client.models.QrLink.list({
        filter: { code: { eq: code } },
      })
      if (existing?.length) {
        // Collision in DB — try once more with a fresh set
        const freshCodes = new Set(Array.from(existingCodes).concat(code))
        code = await generateUniqueCode(freshCodes)
      }
    }

    const { data: created, errors } = await client.models.QrLink.create({
      code,
      destinationUrl: data.destinationUrl,
      label: data.label ?? undefined,
      clickCount: 0,
    })
    if (errors?.length || !created) {
      throw new Error(errors?.[0]?.message ?? "Failed to create QR link")
    }
    // observeQuery will update the list automatically
    return toQrLink(created)
  }

  async function updateLink(id: string, data: UpdateLinkData): Promise<void> {
    const { data: updated, errors } = await client.models.QrLink.update({
      id,
      destinationUrl: data.destinationUrl,
      label: data.label,
    })
    if (errors?.length || !updated) {
      throw new Error(errors?.[0]?.message ?? "Failed to update QR link")
    }
    // observeQuery will update the list automatically
  }

  async function deleteLink(id: string): Promise<void> {
    const { data: events } = await client.models.ClickEvent.list({
      filter: { qrLinkId: { eq: id } },
    })
    if (events?.length) {
      await Promise.all(
        events.map((event) => client.models.ClickEvent.delete({ id: event.id }))
      )
    }
    const { errors } = await client.models.QrLink.delete({ id })
    if (errors?.length) {
      throw new Error(errors[0]?.message ?? "Failed to delete QR link")
    }
    // observeQuery will update the list automatically
  }

  async function fetchClickEvents(qrLinkId: string): Promise<ClickEvent[]> {
    const { data: items, errors } = await client.models.ClickEvent.list({
      filter: { qrLinkId: { eq: qrLinkId } },
    })
    if (errors?.length) {
      throw new Error(errors[0]?.message ?? "Failed to fetch click events")
    }
    return (items ?? []).map(toClickEvent)
  }

  async function fetchMetricSummaries(qrLinkId: string): Promise<ClickMetricSummary[]> {
    const { data: items, errors } = await client.models.ClickMetricSummary.listClickMetricSummaryByQrLinkId({
      qrLinkId,
    })
    if (errors?.length) {
      throw new Error(errors[0]?.message ?? "Failed to fetch metric summaries")
    }
    return (items ?? []).map((item) => ({
      id: item.id,
      qrLinkId: item.qrLinkId,
      dateKey: item.dateKey,
      totalClicks: item.totalClicks ?? 0,
      uniqueIps: item.uniqueIps ?? 0,
      likelyScanClicks: item.likelyScanClicks ?? 0,
      botClicks: item.botClicks ?? 0,
      mobileClicks: item.mobileClicks ?? 0,
      tabletClicks: item.tabletClicks ?? 0,
      desktopClicks: item.desktopClicks ?? 0,
      unknownClicks: item.unknownClicks ?? 0,
      topOS: item.topOS ?? null,
      topBrowsers: item.topBrowsers ?? null,
      topSources: item.topSources ?? null,
      topCountries: item.topCountries ?? null,
      hourDistribution: item.hourDistribution ?? null,
    })).sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  }

  async function fetchRecentMetricSummaries(days = 7): Promise<ClickMetricSummary[]> {
    // Build the date range for the past N days
    const dates: string[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setUTCDate(d.getUTCDate() - i)
      dates.push(d.toISOString().slice(0, 10))
    }
    const since = dates[0]

    // Fetch summaries for each link in parallel, filter by date range
    const allLinks = links
    if (allLinks.length === 0) return []

    const results = await Promise.all(
      allLinks.map((link) =>
        client.models.ClickMetricSummary.listClickMetricSummaryByQrLinkId({
          qrLinkId: link.id,
        }).then((res) => res.data ?? [])
      )
    )

    const flat = results.flat()
    return flat
      .filter((item) => item.dateKey >= since)
      .map((item) => ({
        id: item.id,
        qrLinkId: item.qrLinkId,
        dateKey: item.dateKey,
        totalClicks: item.totalClicks ?? 0,
        uniqueIps: item.uniqueIps ?? 0,
        likelyScanClicks: item.likelyScanClicks ?? 0,
        botClicks: item.botClicks ?? 0,
        mobileClicks: item.mobileClicks ?? 0,
        tabletClicks: item.tabletClicks ?? 0,
        desktopClicks: item.desktopClicks ?? 0,
        unknownClicks: item.unknownClicks ?? 0,
        topOS: item.topOS ?? null,
        topBrowsers: item.topBrowsers ?? null,
        topSources: item.topSources ?? null,
        topCountries: item.topCountries ?? null,
        hourDistribution: item.hourDistribution ?? null,
      }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  }

  return (
    <QrLinkStoreContext.Provider
      value={{ links, loading, getLinkById, getLinkByCode, createLink, updateLink, deleteLink, fetchClickEvents, fetchMetricSummaries, fetchRecentMetricSummaries }}
    >
      {children}
    </QrLinkStoreContext.Provider>
  )
}

export { QrLinkStoreContext }
