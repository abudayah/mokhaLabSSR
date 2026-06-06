"use client"

import { createContext, useState, useEffect, useMemo, ReactNode } from "react"
import { generateClient } from "aws-amplify/data"
import type { Schema } from "@/amplify/data/resource"
import type { QrLink, ClickEvent } from "@/lib/qr-links"
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
      code = data.customCode.trim()
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

  return (
    <QrLinkStoreContext.Provider
      value={{ links, loading, getLinkById, getLinkByCode, createLink, updateLink, deleteLink, fetchClickEvents }}
    >
      {children}
    </QrLinkStoreContext.Provider>
  )
}

export { QrLinkStoreContext }
