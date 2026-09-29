"use client"

import { useState, useEffect, useCallback } from "react"
import type { TableProps } from "@cloudscape-design/components/table"

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseTablePreferencesOptions<T> {
  /** Unique key used to namespace this table's preferences in localStorage */
  storageKey: string
  /** Default sort field (column id / sortingField value) — resets on every page load */
  defaultSortingField: string
  /** Default sort direction — resets on every page load */
  defaultSortingDescending?: boolean
  /** Ordered list of all column ids — used to derive the default visible set */
  allColumnIds: string[]
  /** Column ids that should be hidden by default. Defaults to none. */
  defaultHiddenColumnIds?: string[]
}

interface UseTablePreferencesReturn<T> {
  /** Pass directly to <Table sortingColumn={...}> */
  sortingColumn: TableProps.SortingColumn<T>
  /** Pass directly to <Table sortingDescending={...}> */
  sortingDescending: boolean
  /** Call inside onSortingChange — updates state only, not persisted */
  onSortingChange: (detail: TableProps.SortingState<T>) => void
  /** Current column widths keyed by column id */
  columnWidths: Record<string, number>
  /** Call inside onColumnWidthsChange to update + persist */
  onColumnWidthsChange: (
    detail: TableProps.ColumnWidthsChangeDetail,
    columnIds: string[]
  ) => void
  /** Currently visible column ids */
  visibleColumnIds: string[]
  /** Call when the user picks new visible columns in CollectionPreferences */
  setVisibleColumnIds: (ids: string[]) => void
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota / security errors
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTablePreferences<T>({
  storageKey,
  defaultSortingField,
  defaultSortingDescending = false,
  allColumnIds,
  defaultHiddenColumnIds = [],
}: UseTablePreferencesOptions<T>): UseTablePreferencesReturn<T> {
  const defaultVisible = allColumnIds.filter((id) => !defaultHiddenColumnIds.includes(id))
  const prefKey = `table-prefs-${storageKey}`

  // ── Sorting — session state only, never persisted ──────────────────────────
  const [sortingField, setSortingField] = useState<string>(defaultSortingField)
  const [sortingDescending, setSortingDescending] = useState<boolean>(defaultSortingDescending)

  // ── Column widths — persisted ──────────────────────────────────────────────
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})

  // ── Visible columns — persisted ────────────────────────────────────────────
  const [visibleColumnIds, setVisibleColumnIdsState] = useState<string[]>(defaultVisible)

  // Hydrate persisted prefs from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setColumnWidths(load(`${prefKey}-col-widths`, {} as Record<string, number>))
    setVisibleColumnIdsState(load(`${prefKey}-visible-cols`, defaultVisible))
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
      const next: Record<string, number> = { ...columnWidths }
      detail.widths.forEach((w, i) => {
        const id = columnIds[i]
        if (id) next[id] = w
      })
      setColumnWidths(next)
      save(`${prefKey}-col-widths`, next)
    },
    [prefKey, columnWidths]
  )

  const setVisibleColumnIds = useCallback(
    (ids: string[]) => {
      setVisibleColumnIdsState(ids)
      save(`${prefKey}-visible-cols`, ids)
    },
    [prefKey]
  )

  return {
    sortingColumn: { sortingField },
    sortingDescending,
    onSortingChange,
    columnWidths,
    onColumnWidthsChange,
    visibleColumnIds,
    setVisibleColumnIds,
  }
}
