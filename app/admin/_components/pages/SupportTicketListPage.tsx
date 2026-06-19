"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Table, { TableProps } from "@cloudscape-design/components/table"
import Box from "@cloudscape-design/components/box"
import Button from "@cloudscape-design/components/button"
import Header from "@cloudscape-design/components/header"
import TextFilter from "@cloudscape-design/components/text-filter"
import Select from "@cloudscape-design/components/select"
import SpaceBetween from "@cloudscape-design/components/space-between"
import StatusIndicator from "@cloudscape-design/components/status-indicator"
import Badge from "@cloudscape-design/components/badge"
import { useSupportTicketStore } from "@/app/admin/_components/context/useSupportTicketStore"
import type { SupportTicket } from "@/lib/support-tickets"

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function SupportTicketListPage() {
  const { tickets, loading } = useSupportTicketStore()
  const router = useRouter()

  const [filterText, setFilterText] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [caseTypeFilter, setCaseTypeFilter] = useState("all")
  const [countryFilter, setCountryFilter] = useState("all")
  const [sortingColumn, setSortingColumn] = useState<TableProps.SortingColumn<SupportTicket>>({
    sortingField: "submissionTimestamp",
  })
  const [sortingDescending, setSortingDescending] = useState(true)

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

  const columnDefinitions: TableProps.ColumnDefinition<SupportTicket>[] = [
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
      minWidth: 120,
    },
    {
      id: "customerName",
      header: "Name",
      cell: (item) => item.customerName,
      sortingField: "customerName",
      minWidth: 140,
    },
    {
      id: "caseType",
      header: "Case Type",
      cell: (item) => (
        <Badge color={CASE_TYPE_COLOR[item.caseType]}>{item.caseType}</Badge>
      ),
      sortingField: "caseType",
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
      minWidth: 140,
    },
    {
      id: "country",
      header: "Country",
      cell: (item) => item.country,
      sortingField: "country",
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
      minWidth: 120,
    },
    {
      id: "submissionTimestamp",
      header: "Submitted At",
      cell: (item) => formatSubmittedAt(item.submissionTimestamp),
      sortingField: "submissionTimestamp",
      minWidth: 160,
    },
    {
      id: "assignedAgent",
      header: "Assigned To",
      cell: (item) => item.assignedAgent ?? <span style={{ color: "#aab7b8" }}>Unassigned</span>,
      sortingField: "assignedAgent",
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
      minWidth: 100,
    },
  ]

  const overdueCount = tickets.filter(isSlaBreached).length

  return (
    <Table
      variant="full-page"
      trackBy="id"
      loading={loading}
      loadingText="Loading support tickets…"
      columnDefinitions={columnDefinitions}
      items={sorted}
      sortingColumn={sortingColumn}
      sortingDescending={sortingDescending}
      onSortingChange={({ detail }) => {
        setSortingColumn(detail.sortingColumn)
        setSortingDescending(detail.isDescending ?? false)
      }}
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
