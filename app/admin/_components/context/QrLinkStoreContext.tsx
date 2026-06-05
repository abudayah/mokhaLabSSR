"use client"

import { createContext, useState, useEffect, useMemo, ReactNode } from "react"
import { generateClient } from "aws-amplify/data"
import type { Schema } from "@/amplify/data/resource"
import type { QrLink, ClickEvent } from "@/lib/qr-links"
import type { QrLinkFormData } from "@/app/admin/_components/schemas/qrLinkSchema"
import { generateUniqueCode } from "@/app/admin/_components/utils/shortCodeUtils"

export interface QrLinkStoreValue {
  links: QrLink[]
  loading: boolean
  getLinkById: (id: string) => QrLink | undefined
  getLinkByCode: (code: string) => QrLink | undefined
  createLink: (data: QrLinkFormData) => Promise<QrLink>
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
    let cancelled = false

    async function load() {
      try {
        const { data: items } = await client.models.QrLink.list()
        if (cancelled) return
        const mapped = (items ?? [])
          .map(toQrLink)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        if (!cancelled) setLinks(mapped)
      } catch (err) {
        console.error("Failed to load QR links:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [client])

  function getLinkById(id: string): QrLink | undefined {
    return links.find((l) => l.id === id)
  }

  function getLinkByCode(code: string): QrLink | undefined {
    return links.find((l) => l.code === code)
  }

  async function createLink(data: QrLinkFormData): Promise<QrLink> {
    // Determine the short code: use customCode if provided, otherwise auto-generate
    const existingCodes = new Set(links.map((l) => l.code.toUpperCase()))
    const code =
      data.customCode && data.customCode.trim() !== ""
        ? data.customCode
        : await generateUniqueCode(existingCodes)

    // Check uniqueness for custom codes
    if (data.customCode && data.customCode.trim() !== "") {
      if (existingCodes.has(data.customCode.toUpperCase())) {
        throw new Error("This short code is already in use.")
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
    const link = toQrLink(created)
    setLinks((prev) => [link, ...prev])
    return link
  }

  async function deleteLink(id: string): Promise<void> {
    // Fetch all associated ClickEvent records and delete them first
    const { data: events } = await client.models.ClickEvent.list({
      filter: { qrLinkId: { eq: id } },
    })
    if (events?.length) {
      await Promise.all(
        events.map((event) => client.models.ClickEvent.delete({ id: event.id }))
      )
    }

    // Now delete the QrLink itself
    const { errors } = await client.models.QrLink.delete({ id })
    if (errors?.length) {
      throw new Error(errors[0]?.message ?? "Failed to delete QR link")
    }
    setLinks((prev) => prev.filter((l) => l.id !== id))
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
      value={{ links, loading, getLinkById, getLinkByCode, createLink, deleteLink, fetchClickEvents }}
    >
      {children}
    </QrLinkStoreContext.Provider>
  )
}

export { QrLinkStoreContext }
