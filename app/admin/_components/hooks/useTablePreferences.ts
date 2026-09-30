"use client"

import { useState, useEffect, useCallback } from "react"
import type { TableProps } from "@cloudscape-design/components/table"
import type { CollectionPreferencesProps } from "@cloudscape-design/components/collection-preferences"

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContentDisplayItem = { id: string; visible: boolean }

interface UseTablePreferencesOptions<T> {
  /** Unique key used to namespace this table's preferences in localStorage */
  storageKey: string
  /** Default sort field — resets on every page load, never persisted */
  defaultSortingField: string
  /** Default sort direction — resets on every page load, never persisted */
  defaultSortingDescending?: boolean
  /** Ordered list of all column ids */
  allColumnIds: string[]
  /** Column ids that should be hidden by default */
  defaultHiddenColumnIds?: string[]
}

interface UseTablePreferencesReturn<T> {
  // ── Sorting (session-only) ─────────────────────────────────────────────────
  sortingColumn: TableProps.SortingColumn<T>
  sortingDescending: boolean
  onSortingChange: (detail: TableProps.SortingState<T>) => void

  // ── Column widths (persisted) ─────────────────────────────────────────────
  columnWidths: Record<string, number>
  onColumnWidthsChange: (detail: TableProps.ColumnWidthsChangeDetail, columnIds: string[]) => void

  // ── CollectionPreferences values (all persisted) ──────────────────────────
  /** Ordered list of {id, visible} — drives column order + visibility */
  contentDisplay: ContentDisplayItem[]
  wrapLines: boolean
  stripedRows: boolean
  contentDensity: "comfortable" | "compact"
  /** Number of columns to stick on the right (0 = none) */
  stickyLastColumns: number

  /** Pass the full detail from CollectionPreferences onConfirm */
  onPreferencesConfirm: (detail: CollectionPreferencesProps.Preferences) => void
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function load<V>(key: string, fallback: V): V {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as V) : fallback
  } catch {
    return fallback
  }
}

function save<V>(key: string, value: V): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTablePreferences<T>({
  storageKey,
  defaultSortingField,
  defaultSortingDescending = false,
  allColumnIds,
  defaultHiddenColumnIds = [],
}: UseTablePreferencesOptions<T>): UseTablePreferencesReturn<T> {
  const prefKey = `table-prefs-${storageKey}`

  const defaultContentDisplay: ContentDisplayItem[] = allColumnIds.map((id) => ({
    id,
    visible: !defaultHiddenColumnIds.includes(id),
  }))

  // ── Sorting — session only ─────────────────────────────────────────────────
  const [sortingField, setSortingField] = useState(defaultSortingField)
  const [sortingDescending, setSortingDescending] = useState(defaultSortingDescending)

  // ── Persisted preferences ──────────────────────────────────────────────────
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [contentDisplay, setContentDisplay] = useState<ContentDisplayItem[]>(defaultContentDisplay)
  const [wrapLines, setWrapLines] = useState(false)
  const [stripedRows, setStripedRows] = useState(false)
  const [contentDensity, setContentDensity] = useState<"comfortable" | "compact">("comfortable")
  const [stickyLastColumns, setStickyLastColumns] = useState(0)

  // Hydrate from localStorage after mount
  useEffect(() => {
    setColumnWidths(load(`${prefKey}-col-widths`, {}))
    setContentDisplay(load(`${prefKey}-content-display`, defaultContentDisplay))
    setWrapLines(load(`${prefKey}-wrap-lines`, false))
    setStripedRows(load(`${prefKey}-striped-rows`, false))
    setContentDensity(load(`${prefKey}-content-density`, "comfortable"))
    setStickyLastColumns(load(`${prefKey}-sticky-last`, 0))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefKey])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const onSortingChange = useCallback(
    (detail: TableProps.SortingState<T>) => {
      setSortingField(String(detail.sortingColumn.sortingField ?? defaultSortingField))
      setSortingDescending(detail.isDescending ?? false)
    },
    [defaultSortingField]
  )

  const onColumnWidthsChange = useCallback(
    (detail: TableProps.ColumnWidthsChangeDetail, columnIds: string[]) => {
      const next = { ...columnWidths }
      detail.widths.forEach((w, i) => {
        const id = columnIds[i]
        if (id) next[id] = w
      })
      setColumnWidths(next)
      save(`${prefKey}-col-widths`, next)
    },
    [prefKey, columnWidths]
  )

  const onPreferencesConfirm = useCallback(
    (detail: CollectionPreferencesProps.Preferences) => {
      if (detail.contentDisplay) {
        const next = [...detail.contentDisplay] as ContentDisplayItem[]
        setContentDisplay(next)
        save(`${prefKey}-content-display`, next)
      }
      if (detail.wrapLines !== undefined) {
        setWrapLines(detail.wrapLines)
        save(`${prefKey}-wrap-lines`, detail.wrapLines)
      }
      if (detail.stripedRows !== undefined) {
        setStripedRows(detail.stripedRows)
        save(`${prefKey}-striped-rows`, detail.stripedRows)
      }
      if (detail.contentDensity !== undefined) {
        setContentDensity(detail.contentDensity)
        save(`${prefKey}-content-density`, detail.contentDensity)
      }
      if (detail.stickyColumns?.last !== undefined) {
        setStickyLastColumns(detail.stickyColumns.last)
        save(`${prefKey}-sticky-last`, detail.stickyColumns.last)
      }
    },
    [prefKey]
  )

  return {
    sortingColumn: { sortingField },
    sortingDescending,
    onSortingChange,
    columnWidths,
    onColumnWidthsChange,
    contentDisplay,
    wrapLines,
    stripedRows,
    contentDensity,
    stickyLastColumns,
    onPreferencesConfirm,
  }
}
