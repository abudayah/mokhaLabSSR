"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import Table, { TableProps } from "@cloudscape-design/components/table"
import Box from "@cloudscape-design/components/box"
import Button from "@cloudscape-design/components/button"
import ButtonDropdown from "@cloudscape-design/components/button-dropdown"
import CollectionPreferences, { CollectionPreferencesProps } from "@cloudscape-design/components/collection-preferences"
import Header from "@cloudscape-design/components/header"
import TextFilter from "@cloudscape-design/components/text-filter"
import Select from "@cloudscape-design/components/select"
import SpaceBetween from "@cloudscape-design/components/space-between"
import StatusIndicator from "@cloudscape-design/components/status-indicator"
import Badge from "@cloudscape-design/components/badge"
import { useSupportTicketStore } from "@/app/admin/_components/context/useSupportTicketStore"
import { useTablePreferences } from "@/app/admin/_components/hooks/useTablePreferences"
import type { SupportTicket } from "@/lib/support-tickets"
import { useAppLayout } from "@/app/admin/_components/context/AppLayoutContext"

// ─── SLA helpers ──────────────────────────────────────────────────────────────

const SLA_HOURS = 24

function isSlaBreached(ticket: SupportTicket): boolean {
  if (ticket.status === "Resolved" || ticket.status === "Closed") return false
  const submitted = new Date(ticket.submissionTimestamp).getTime()
  return Date.now() - submitted > SLA_HOURS * 60 * 60 * 1000
}

function formatSubmittedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

// ─── Status indicator mapping ─────────────────────────────────────────────────

type CloudscapeStatusType = "info" | "in-progress" | "success" | "stopped" | "warning" | "error" | "pending" | "loading"

const STATUS_INDICATOR: Record<SupportTicket["status"], CloudscapeStatusType> = {
  New: "info",
  InProgress: "in-progress",
  Resolved: "success",
  Closed: "stopped",
}

const STATUS_LABEL: Record<SupportTicket["status"], string> = {
  New: "New",
  InProgress: "In Progress",
  Resolved: "Resolved",
  Closed: "Closed",
}

const CASE_TYPE_COLOR: Record<SupportTicket["caseType"], "blue" | "grey" | "red"> = {
  Inquiry: "blue",
  Warranty: "grey",
  Return: "red",
}

// ─── Filter options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "New", label: "New" },
  { value: "InProgress", label: "In Progress" },
  { value: "Resolved", label: "Resolved" },
  { value: "Closed", label: "Closed" },
]

const CASE_TYPE_OPTIONS = [
  { value: "all", label: "All case types" },
  { value: "Inquiry", label: "Inquiry" },
  { value: "Warranty", label: "Warranty" },
  { value: "Return", label: "Return" },
]

const COUNTRY_OPTIONS = [
  { value: "all", label: "All countries" },
  { value: "USA", label: "United States" },
  { value: "Canada", label: "Canada" },
]

// ─── Column config ────────────────────────────────────────────────────────────

const ALL_COLUMN_IDS = [
  "ticketId", "customerName", "caseType", "productName",
  "country", "status", "submissionTimestamp", "assignedAgent", "sla", "actions",
]

const CONTENT_DISPLAY_OPTIONS: CollectionPreferencesProps.ContentDisplayOption[] = [
  { id: "ticketId", label: "Ticket ID", alwaysVisible: true },
  { id: "customerName", label: "Name" },
  { id: "caseType", label: "Case Type" },
  { id: "productName", label: "Product" },
  { id: "country", label: "Country" },
  { id: "status", label: "Status" },
  { id: "submissionTimestamp", label: "Submitted At" },
  { id: "assignedAgent", label: "Assigned To" },
  { id: "sla", label: "SLA" },
  { id: "actions", label: "Actions", alwaysVisible: true },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function SupportTicketListPage() {
  const { tickets, loading } = useSupportTicketStore()
  const { setContentType } = useAppLayout()
  const router = useRouter()

  useEffect(() => { setContentType("table") }, [setContentType])

  const [filterText, setFilterText] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [caseTypeFilter, setCaseTypeFilter] = useState("all")
  const [countryFilter, setCountryFilter] = useState("all")

  const {
    sortingColumn,
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
  } = useTablePreferences<SupportTicket>({
    storageKey: "support-tickets",
    defaultSortingField: "submissionTimestamp",
    defaultSortingDescending: true,
    allColumnIds: ALL_COLUMN_IDS,
  })

  const filtered = useMemo(() => {
    const lower = filterText.toLowerCase()
    return tickets.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (caseTypeFilter !== "all" && t.caseType !== caseTypeFilter) return false
      if (countryFilter !== "all" && t.country !== countryFilter) return false
      if (
        lower &&
        !t.ticketId.toLowerCase().includes(lower) &&
        !t.customerName.toLowerCase().includes(lower) &&
        !t.email.toLowerCase().includes(lower) &&
        !(t.amazonOrderId ?? "").toLowerCase().includes(lower)
      )
        return false
      return true
    })
  }, [tickets, filterText, statusFilter, caseTypeFilter, countryFilter])

  const sorted = useMemo(() => {
    const field = (sortingColumn.sortingField ?? "submissionTimestamp") as keyof SupportTicket
    return [...filtered].sort((a, b) => {
      const valA = String(a[field] ?? "")
      const valB = String(b[field] ?? "")
      const cmp = valA.localeCompare(valB)
      return sortingDescending ? -cmp : cmp
    })
  }, [filtered, sortingColumn, sortingDescending])

  const allColumnDefinitions: TableProps.ColumnDefinition<SupportTicket>[] = [
    {
      id: "ticketId",
      header: "Ticket ID",
      cell: (item) => (
        <Button
          variant="inline-link"
          onClick={() => router.push(`/admin/support/${item.id}`)}
        >
          {item.ticketId}
        </Button>
      ),
      sortingField: "ticketId",
      isRowHeader: true,
      width: columnWidths["ticketId"],
      minWidth: 120,
    },    {
      id: "customerName",
      header: "Name",
      cell: (item) => item.customerName,
      sortingField: "customerName",
      width: columnWidths["customerName"],
      minWidth: 140,
    },
    {
      id: "caseType",
      header: "Case Type",
      cell: (item) => (
        <Badge color={CASE_TYPE_COLOR[item.caseType]}>{item.caseType}</Badge>
      ),
      sortingField: "caseType",
      width: columnWidths["caseType"],
      minWidth: 100,
    },
    {
      id: "productName",
      header: "Product",
      cell: (item) => (
        <span
          style={{
            maxWidth: 200,
            display: "inline-block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            verticalAlign: "bottom",
          }}
          title={item.productName}
        >
          {item.productName}
        </span>
      ),
      width: columnWidths["productName"],
      minWidth: 140,
    },
    {
      id: "country",
      header: "Country",
      cell: (item) => item.country,
      sortingField: "country",
      width: columnWidths["country"],
      minWidth: 90,
    },
    {
      id: "status",
      header: "Status",
      cell: (item) => (
        <StatusIndicator type={STATUS_INDICATOR[item.status]}>
          {STATUS_LABEL[item.status]}
        </StatusIndicator>
      ),
      sortingField: "status",
      width: columnWidths["status"],
      minWidth: 120,
    },
    {
      id: "submissionTimestamp",
      header: "Submitted At",
      cell: (item) => formatSubmittedAt(item.submissionTimestamp),
      sortingField: "submissionTimestamp",
      width: columnWidths["submissionTimestamp"],
      minWidth: 160,
    },
    {
      id: "assignedAgent",
      header: "Assigned To",
      cell: (item) => item.assignedAgent ?? <span style={{ color: "#aab7b8" }}>Unassigned</span>,
      sortingField: "assignedAgent",
      width: columnWidths["assignedAgent"],
      minWidth: 120,
    },
    {
      id: "sla",
      header: "SLA",
      cell: (item) =>
        isSlaBreached(item) ? (
          <StatusIndicator type="error">Overdue</StatusIndicator>
        ) : item.status === "Resolved" || item.status === "Closed" ? (
          <StatusIndicator type="success">Met</StatusIndicator>
        ) : (
          <StatusIndicator type="pending">On time</StatusIndicator>
        ),
      width: columnWidths["sla"],
      minWidth: 100,
    },
    {
      id: "actions",
      header: "Actions",
      cell: (item) => (
        <ButtonDropdown
          variant="inline-icon"
          ariaLabel={`Actions for ${item.ticketId}`}
          expandToViewport
          items={[
            { id: "view", text: "View details", iconName: "zoom-in" },
          ]}
          onItemClick={({ detail }) => {
            if (detail.id === "view") {
              router.push(`/admin/support/${item.id}`)
            }
          }}
        />
      ),
      width: columnWidths["actions"] ?? 80,
      minWidth: 80,
    },
  ]

  const columnDefinitions = allColumnDefinitions.filter((col) =>
    contentDisplay.find((c) => c.id === col.id)?.visible ?? true
  )

  const overdueCount = tickets.filter(isSlaBreached).length

  return (
    <Table
      variant="full-page"
      trackBy="id"
      loading={loading}
      loadingText="Loading support tickets…"
      columnDefinitions={columnDefinitions}
      columnDisplay={contentDisplay}
      items={sorted}
      resizableColumns
      wrapLines={wrapLines}
      stripedRows={stripedRows}
      contentDensity={contentDensity}
      stickyColumns={{ last: stickyLastColumns }}
      onColumnWidthsChange={({ detail }) =>
        onColumnWidthsChange(detail, columnDefinitions.map((c) => c.id!))
      }
      sortingColumn={sortingColumn}
      sortingDescending={sortingDescending}
      onSortingChange={({ detail }) => onSortingChange(detail)}
      filter={
        <SpaceBetween direction="horizontal" size="xs">
          <TextFilter
            filteringText={filterText}
            filteringPlaceholder="Search name, email, ticket ID, order ID"
            filteringAriaLabel="Filter tickets"
            onChange={({ detail }) => setFilterText(detail.filteringText)}
          />
          <Select
            selectedOption={STATUS_OPTIONS.find((o) => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
            options={STATUS_OPTIONS}
            onChange={({ detail }) => setStatusFilter(detail.selectedOption.value ?? "all")}
            ariaLabel="Filter by status"
          />
          <Select
            selectedOption={CASE_TYPE_OPTIONS.find((o) => o.value === caseTypeFilter) ?? CASE_TYPE_OPTIONS[0]}
            options={CASE_TYPE_OPTIONS}
            onChange={({ detail }) => setCaseTypeFilter(detail.selectedOption.value ?? "all")}
            ariaLabel="Filter by case type"
          />
          <Select
            selectedOption={COUNTRY_OPTIONS.find((o) => o.value === countryFilter) ?? COUNTRY_OPTIONS[0]}
            options={COUNTRY_OPTIONS}
            onChange={({ detail }) => setCountryFilter(detail.selectedOption.value ?? "all")}
            ariaLabel="Filter by country"
          />
        </SpaceBetween>
      }
      preferences={
        <CollectionPreferences
          title="Table preferences"
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          onConfirm={({ detail }) => onPreferencesConfirm(detail)}
          contentDisplayPreference={{
            title: "Column order and visibility",
            options: CONTENT_DISPLAY_OPTIONS,
          }}
          wrapLinesPreference={{ label: "Wrap lines", description: "Enable to wrap long text" }}
          stripedRowsPreference={{ label: "Striped rows", description: "Alternate row background colors" }}
          contentDensityPreference={{ label: "Compact mode", description: "Reduce vertical padding in rows" }}
          stickyColumnsPreference={{
            lastColumns: {
              title: "Stick last column",
              description: "Keep the last column visible while scrolling horizontally",
              options: [
                { label: "None", value: 0 },
                { label: "Last column", value: 1 },
              ],
            },
          }}
          preferences={{
            contentDisplay,
            wrapLines,
            stripedRows,
            contentDensity,
            stickyColumns: { last: stickyLastColumns },
          }}
        />
      }
      header={
        <Header
          variant="awsui-h1-sticky"
          counter={`(${tickets.length})`}
          description={
            overdueCount > 0
              ? `${overdueCount} ticket${overdueCount > 1 ? "s" : ""} overdue (>24h without response)`
              : undefined
          }
        >
          Support Tickets
        </Header>
      }
      empty={
        <Box textAlign="center" color="inherit">
          <Box variant="strong" textAlign="center" color="inherit">No tickets</Box>
          <Box variant="p" padding={{ bottom: "s" }} color="inherit">
            No support tickets to display.
          </Box>
        </Box>
      }
      ariaLabels={{
        tableLabel: "Support tickets table",
        activateEditLabel: (col) => `Edit ${String(col.header)}`,
        cancelEditLabel: (col) => `Cancel editing ${String(col.header)}`,
        submitEditLabel: (col) => `Submit edit ${String(col.header)}`,
        allItemsSelectionLabel: () => "Select all tickets",
        itemSelectionLabel: (_, item) => item.ticketId,
      }}
    />
  )
}
