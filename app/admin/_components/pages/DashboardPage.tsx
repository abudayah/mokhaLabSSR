"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Board, { BoardProps } from "@cloudscape-design/board-components/board"
import BoardItem from "@cloudscape-design/board-components/board-item"
import ContentLayout from "@cloudscape-design/components/content-layout"
import Header from "@cloudscape-design/components/header"
import Container from "@cloudscape-design/components/container"
import ColumnLayout from "@cloudscape-design/components/column-layout"
import SpaceBetween from "@cloudscape-design/components/space-between"
import Button from "@cloudscape-design/components/button"
import ButtonDropdown from "@cloudscape-design/components/button-dropdown"
import Box from "@cloudscape-design/components/box"
import Link from "@cloudscape-design/components/link"
import StatusIndicator from "@cloudscape-design/components/status-indicator"
import Badge from "@cloudscape-design/components/badge"
import LineChart from "@cloudscape-design/components/line-chart"
import PieChart from "@cloudscape-design/components/pie-chart"
import Spinner from "@cloudscape-design/components/spinner"
import Table from "@cloudscape-design/components/table"
import { useBlogPostStore } from "@/app/admin/_components/context/useBlogPostStore"
import { useProductStore } from "@/app/admin/_components/context/useProductStore"
import { useQrLinkStore } from "@/app/admin/_components/context/useQrLinkStore"
import { useSupportTicketStore } from "@/app/admin/_components/context/useSupportTicketStore"
import { useAppLayout } from "@/app/admin/_components/context/AppLayoutContext"
import { parseMetricCounter, type ClickMetricSummary } from "@/lib/qr-links"
import { S3Image } from "@/components/S3Image"

// ---------------------------------------------------------------------------
// Board i18n strings (required by Board + BoardItem)
// ---------------------------------------------------------------------------
const boardI18n: BoardProps.I18nStrings<WidgetData> = {
  liveAnnouncementDndStarted: (op) => `Started ${op}`,
  liveAnnouncementDndItemReordered: () => "Item reordered",
  liveAnnouncementDndItemResized: () => "Item resized",
  liveAnnouncementDndItemInserted: () => "Item inserted",
  liveAnnouncementDndCommitted: (op) => `${op} committed`,
  liveAnnouncementDndDiscarded: (op) => `${op} discarded`,
  liveAnnouncementItemRemoved: () => "Item removed",
  navigationAriaLabel: "Board navigation",
  navigationAriaDescription: "Click on non-empty item to move focus over",
  navigationItemAriaLabel: (item) => item?.data.title ?? "Empty",
}

const boardItemI18n = {
  dragHandleAriaLabel: "Drag handle",
  dragHandleAriaDescription: "Use Space or Enter to activate drag, arrow keys to move, Space or Enter to submit, Escape to discard.",
  resizeHandleAriaLabel: "Resize handle",
  resizeHandleAriaDescription: "Use Space or Enter to activate resize, arrow keys to change size, Space or Enter to submit, Escape to discard.",
}

// ---------------------------------------------------------------------------
// Widget registry
// ---------------------------------------------------------------------------
type WidgetId = "overview" | "traffic" | "tickets" | "qr-links" | "recent-posts" | "products"

interface WidgetData {
  title: string
  description?: string
  disableContentPaddings?: boolean
}

// Default layout — column spans map to a 4-column board
const DEFAULT_LAYOUT: BoardProps.Item<WidgetData>[] = [
  {
    id: "overview",
    rowSpan: 2,
    columnSpan: 4,
    data: { title: "Overview" },
  },
  {
    id: "traffic",
    rowSpan: 5,
    columnSpan: 4,
    data: { title: "Weekly traffic", description: "QR link clicks for the past 7 days" },
  },
  {
    id: "tickets",
    rowSpan: 4,
    columnSpan: 2,
    data: { title: "Support tickets", disableContentPaddings: true },
  },
  {
    id: "qr-links",
    rowSpan: 4,
    columnSpan: 2,
    data: { title: "QR link performance", disableContentPaddings: true },
  },
  {
    id: "recent-posts",
    rowSpan: 5,
    columnSpan: 2,
    data: { title: "Recent posts" },
  },
  {
    id: "products",
    rowSpan: 5,
    columnSpan: 2,
    data: { title: "Products" },
  },
]

const STORAGE_KEY = "dashboard-layout-v1"

function loadLayout(): BoardProps.Item<WidgetData>[] {
  if (typeof window === "undefined") return DEFAULT_LAYOUT
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return DEFAULT_LAYOUT
    // Merge saved positions with current default data (keeps titles/descriptions fresh)
    const savedItems = JSON.parse(saved) as Array<{ id: string; rowSpan: number; columnSpan: number; columnOffset?: Record<string, number> }>
    return DEFAULT_LAYOUT.map((def) => {
      const saved = savedItems.find((s) => s.id === def.id)
      if (!saved) return def
      return { ...def, rowSpan: saved.rowSpan, columnSpan: saved.columnSpan, columnOffset: saved.columnOffset }
    })
  } catch {
    return DEFAULT_LAYOUT
  }
}

function saveLayout(items: BoardProps.Item<WidgetData>[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items.map(({ id, rowSpan, columnSpan, columnOffset }) => ({ id, rowSpan, columnSpan, columnOffset })))
    )
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Weekly metrics helpers
// ---------------------------------------------------------------------------

function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - (n - 1 - i))
    return d.toISOString().slice(0, 10)
  })
}

function shortDay(dateKey: string): string {
  const d = new Date(dateKey + "T12:00:00Z")
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" })
}

interface WeeklyChartData {
  dailyClicks: Array<{ x: string; y: number }>
  countryByDay: Map<string, Map<string, number>>
  countryTotals: Map<string, number>
  weekTotal: number
  weekUnique: number
  weekScans: number
}

function buildWeeklyChartData(summaries: ClickMetricSummary[], days: string[]): WeeklyChartData {
  const byDate = new Map<string, number>()
  const countryTotals = new Map<string, number>()
  const countryByDay = new Map<string, Map<string, number>>()
  let weekTotal = 0, weekUnique = 0, weekScans = 0

  for (const s of summaries) {
    if (!days.includes(s.dateKey)) continue
    const dayLabel = shortDay(s.dateKey)
    byDate.set(s.dateKey, (byDate.get(s.dateKey) ?? 0) + s.totalClicks)
    weekTotal += s.totalClicks
    weekUnique += s.uniqueIps
    weekScans += s.likelyScanClicks
    for (const item of parseMetricCounter(s.topCountries)) {
      countryTotals.set(item.name, (countryTotals.get(item.name) ?? 0) + item.count)
      if (!countryByDay.has(item.name)) countryByDay.set(item.name, new Map())
      countryByDay.get(item.name)!.set(dayLabel, (countryByDay.get(item.name)!.get(dayLabel) ?? 0) + item.count)
    }
  }

  return {
    dailyClicks: days.map((d) => ({ x: shortDay(d), y: byDate.get(d) ?? 0 })),
    countryByDay,
    countryTotals,
    weekTotal,
    weekUnique,
    weekScans,
  }
}

const chartEmpty = (
  <Box textAlign="center" color="inherit">
    <b>No data yet</b>
    <Box variant="p" color="inherit">Scan a QR link to start seeing data.</Box>
  </Box>
)

// ---------------------------------------------------------------------------
// Widget content components
// ---------------------------------------------------------------------------

function OverviewContent({
  openTickets, newTickets, totalClicks, linksCount, ticketsLoading, linksLoading,
}: {
  openTickets: number
  newTickets: number
  totalClicks: number
  linksCount: number
  ticketsLoading: boolean
  linksLoading: boolean
}) {
  function StatCell({ title, value, loading, href, linkText, status }: {
    title: string; value: number | string; loading?: boolean
    href: string; linkText: string; status?: "success" | "warning" | "error"
  }) {
    const colorMap = { success: "text-status-success", warning: "text-status-warning", error: "text-status-error" } as const
    return (
      <div>
        <Box variant="awsui-key-label">{title}</Box>
        {loading ? (
          <Box padding={{ vertical: "xs" }}><StatusIndicator type="loading">Loading</StatusIndicator></Box>
        ) : (
          <Box
            variant="h1"
            fontSize="display-l"
            fontWeight="bold"
            color={status ? colorMap[status] : "text-label"}
            padding={{ vertical: "xs" }}
          >
            {String(value)}
          </Box>
        )}
        <Link href={href}>{linkText}</Link>
      </div>
    )
  }

  return (
    <ColumnLayout columns={4} variant="text-grid">
      <StatCell title="Open tickets" value={openTickets} loading={ticketsLoading} href="/admin/support" linkText="View support" status={openTickets === 0 ? "success" : newTickets > 0 ? "error" : "warning"} />
      <StatCell title="New (unread)" value={newTickets} loading={ticketsLoading} href="/admin/support" linkText="View new tickets" status={newTickets > 0 ? "error" : "success"} />
      <StatCell title="Total QR clicks" value={totalClicks.toLocaleString()} loading={linksLoading} href="/admin/qr-links" linkText="View QR links" />
      <StatCell title="Active QR links" value={linksCount} loading={linksLoading} href="/admin/qr-links" linkText="Manage QR links" />
    </ColumnLayout>
  )
}

function TrafficContent({
  weekly, days7, weeklyLoading, topCountries,
}: {
  weekly: WeeklyChartData
  days7: string[]
  weeklyLoading: boolean
  topCountries: Array<{ title: string; value: number }>
}) {
  if (weeklyLoading) {
    return <Box textAlign="center" padding="xl"><Spinner size="large" /></Box>
  }

  const countrySeries = Array.from(weekly.countryByDay.entries())
    .sort((a, b) => Array.from(b[1].values()).reduce((s, v) => s + v, 0) - Array.from(a[1].values()).reduce((s, v) => s + v, 0))
    .slice(0, 8)
    .map(([country, dayMap]) => ({
      title: country,
      type: "line" as const,
      data: days7.map((d) => ({ x: shortDay(d), y: dayMap.get(shortDay(d)) ?? 0 })),
    }))

  const series = countrySeries.length > 0
    ? countrySeries
    : [{ title: "Unknown", type: "line" as const, data: weekly.dailyClicks }]

  return (
    <SpaceBetween size="l">
      <ColumnLayout columns={3} variant="text-grid">
        <div>
          <Box variant="awsui-key-label">Total clicks (7 days)</Box>
          <Box variant="h1" fontSize="display-l" fontWeight="bold" padding={{ vertical: "xs" }}>{weekly.weekTotal.toLocaleString()}</Box>
        </div>
        <div>
          <Box variant="awsui-key-label">Unique visitors (est.)</Box>
          <Box variant="h1" fontSize="display-l" fontWeight="bold" padding={{ vertical: "xs" }}>{weekly.weekUnique.toLocaleString()}</Box>
        </div>
        <div>
          <Box variant="awsui-key-label">Physical QR scans</Box>
          <Box variant="h1" fontSize="display-l" fontWeight="bold" padding={{ vertical: "xs" }}>{weekly.weekScans.toLocaleString()}</Box>
          <Box variant="small" color="text-body-secondary">mobile + no referrer</Box>
        </div>
      </ColumnLayout>

      <ColumnLayout columns={weekly.weekTotal > 0 && topCountries.length > 0 ? 2 : 1}>
        <div>
          <Box variant="h3" padding={{ bottom: "s" }}>Clicks per day by country</Box>
          <LineChart
            series={series}
            xDomain={days7.map(shortDay)}
            yDomain={[0, Math.max(1, ...weekly.dailyClicks.map((d) => d.y))]}
            xScaleType="categorical"
            xTitle="Day" yTitle="Clicks"
            height={220}
            hideFilter
            statusType="finished"
            empty={chartEmpty}
            noMatch={chartEmpty}
            i18nStrings={{
              xTickFormatter: (v) => String(v),
              yTickFormatter: (v) => String(v),
              legendAriaLabel: "Legend",
              chartAriaRoleDescription: "line chart",
              xAxisAriaRoleDescription: "x axis",
              yAxisAriaRoleDescription: "y axis",
            }}
          />
        </div>
        {weekly.weekTotal > 0 && topCountries.length > 0 && (
          <div>
            <Box variant="h3" padding={{ bottom: "s" }}>Countries</Box>
            <PieChart
              data={topCountries}
              statusType="finished"
              empty={chartEmpty}
              noMatch={chartEmpty}
              i18nStrings={{ legendAriaLabel: "Legend", chartAriaRoleDescription: "pie chart", segmentAriaRoleDescription: "segment" }}
            />
          </div>
        )}
      </ColumnLayout>
    </SpaceBetween>
  )
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const { posts, loading: postsLoading } = useBlogPostStore()
  const { products, loading: productsLoading } = useProductStore()
  const { links, loading: linksLoading, fetchRecentMetricSummaries } = useQrLinkStore()
  const { tickets, loading: ticketsLoading } = useSupportTicketStore()
  const { setContentType } = useAppLayout()

  useEffect(() => {
    setContentType("dashboard")
  }, [setContentType])

  const [weeklySummaries, setWeeklySummaries] = useState<ClickMetricSummary[]>([])
  const [weeklyLoading, setWeeklyLoading] = useState(true)
  const [boardItems, setBoardItems] = useState<BoardProps.Item<WidgetData>[]>(DEFAULT_LAYOUT)

  // Load saved layout on mount (client-only)
  useEffect(() => { setBoardItems(loadLayout()) }, [])

  useEffect(() => {
    if (linksLoading) return
    let cancelled = false
    setWeeklyLoading(true)
    fetchRecentMetricSummaries(7)
      .then((data) => { if (!cancelled) setWeeklySummaries(data) })
      .catch(() => { if (!cancelled) setWeeklySummaries([]) })
      .finally(() => { if (!cancelled) setWeeklyLoading(false) })
    return () => { cancelled = true }
  }, [linksLoading, fetchRecentMetricSummaries])

  const newTickets = tickets.filter((t) => t.status === "New")
  const openTickets = tickets.filter((t) => t.status === "New" || t.status === "InProgress")
  const totalClicks = links.reduce((sum, l) => sum + (l.clickCount ?? 0), 0)
  const topLinks = [...links].sort((a, b) => (b.clickCount ?? 0) - (a.clickCount ?? 0)).slice(0, 5)
  const recentTickets = [...tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)
  const recentPosts = [...posts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)

  const days7 = lastNDays(7)
  const weekly = buildWeeklyChartData(weeklySummaries, days7)
  const topCountries = Array.from(weekly.countryTotals.entries())
    .map(([name, count]) => ({ title: name, value: count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const router = useRouter()

  // ── Widget renderers ──────────────────────────────────────────────────────

  function renderWidgetHeader(id: WidgetId, title: string) {
    switch (id) {
      case "overview":
        return <Header variant="h2">Overview</Header>
      case "traffic":
        return (
          <Header
            variant="h2"
            counter={weeklyLoading ? undefined : `(${weekly.weekTotal.toLocaleString()} clicks this week)`}
            description="Aggregated QR link traffic for the past 7 days"
          >
            Weekly traffic
          </Header>
        )
      case "tickets":
        return (
          <Header variant="h2" counter={`(${openTickets.length} open)`} actions={<Link href="/admin/support">View all</Link>}>
            Support tickets
          </Header>
        )
      case "qr-links":
        return (
          <Header variant="h2" counter={`(${totalClicks.toLocaleString()} clicks)`} actions={<Link href="/admin/qr-links">View all</Link>}>
            QR link performance
          </Header>
        )
      case "recent-posts":
        return (
          <Header variant="h2" counter={`(${posts.length})`} actions={<Link href="/admin/blog">View all</Link>}>
            Recent posts
          </Header>
        )
      case "products":
        return (
          <Header variant="h2" counter={`(${products.length})`} actions={<Link href="/admin/products">View all</Link>}>
            Products
          </Header>
        )
      default:
        return <Header variant="h2">{title}</Header>
    }
  }

  function renderWidgetContent(id: WidgetId) {
    switch (id) {

      case "overview":
        return (
          <OverviewContent
            openTickets={openTickets.length}
            newTickets={newTickets.length}
            totalClicks={totalClicks}
            linksCount={links.length}
            ticketsLoading={ticketsLoading}
            linksLoading={linksLoading}
          />
        )

      case "traffic":
        return (
          <TrafficContent
            weekly={weekly}
            days7={days7}
            weeklyLoading={weeklyLoading}
            topCountries={topCountries}
          />
        )

      case "tickets":
        return (
          <Table
            variant="borderless"
            loading={ticketsLoading}
            loadingText="Loading tickets"
            empty={<Box textAlign="center" color="text-body-secondary" padding="m">No tickets yet.</Box>}
            trackBy="id"
            items={recentTickets}
            columnDefinitions={[
              {
                id: "ticket",
                header: "Ticket",
                isRowHeader: true,
                cell: (t) => <Link href={`/admin/support/${t.id}`} fontSize="body-s">{t.ticketId}</Link>,
                width: 100,
              },
              {
                id: "customer",
                header: "Customer",
                cell: (t) => <Box fontSize="body-s">{t.customerName}</Box>,
              },
              {
                id: "type",
                header: "Type",
                cell: (t) => <Box fontSize="body-s">{t.caseType}</Box>,
                width: 85,
              },
              {
                id: "status",
                header: "Status",
                cell: (t) => (
                  <Badge color={t.status === "New" ? "red" : t.status === "InProgress" ? "blue" : t.status === "Resolved" ? "green" : "grey"}>
                    {t.status === "InProgress" ? "In Progress" : t.status}
                  </Badge>
                ),
                width: 95,
              },
            ]}
          />
        )

      case "qr-links":
        return (
          <Table
            variant="borderless"
            loading={linksLoading}
            loadingText="Loading QR links"
            empty={<Box textAlign="center" color="text-body-secondary" padding="m">No QR links yet.</Box>}
            trackBy="id"
            items={topLinks}
            columnDefinitions={[
              {
                id: "label",
                header: "Label",
                isRowHeader: true,
                cell: (l) => <Link href={`/admin/qr-links/${l.id}`} fontSize="body-s">{l.label ?? l.code}</Link>,
              },
              {
                id: "code",
                header: "Code",
                cell: (l) => <Box fontSize="body-s" color="text-body-secondary">/{l.code}</Box>,
                width: 80,
              },
              {
                id: "clicks",
                header: "Clicks",
                cell: (l) => <Box fontSize="body-s" textAlign="right">{(l.clickCount ?? 0).toLocaleString()}</Box>,
                width: 65,
              },
            ]}
          />
        )

      case "recent-posts":
        if (postsLoading) return <StatusIndicator type="loading">Loading posts</StatusIndicator>
        if (recentPosts.length === 0) return (
          <Box variant="p" color="text-body-secondary">No posts yet. <Link href="/admin/blog/new">Create your first post</Link></Box>
        )
        return (
          <SpaceBetween size="s">
            {recentPosts.map((post) => (
              <div key={post.id} style={{ display: "flex", gap: "12px", alignItems: "flex-start", paddingBottom: "12px", borderBottom: "1px solid var(--color-border-divider-default)" }}>
                <div style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 4, overflow: "hidden", background: "var(--color-background-input-disabled)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {post.featuredImage
                    ? <S3Image src={post.featuredImage} alt={post.title} style={{ width: 56, height: 56, objectFit: "cover", display: "block" }} />
                    : <Box color="text-body-secondary" fontSize="body-s">—</Box>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <Link href={`/admin/blog/${post.id}/edit`} fontSize="body-m">{post.title}</Link>
                  <Box variant="small" color="text-body-secondary">{post.date} · {post.author}</Box>
                  {post.subtitle && (
                    <div style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 12, color: "var(--color-text-body-secondary)" } as React.CSSProperties}>
                      {post.subtitle}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </SpaceBetween>
        )

      case "products":
        if (productsLoading) return <StatusIndicator type="loading">Loading products</StatusIndicator>
        if (products.length === 0) return (
          <Box variant="p" color="text-body-secondary">No products yet. <Link href="/admin/products/new">Add your first product</Link></Box>
        )
        return (
          <SpaceBetween size="s">
            {products.slice(0, 4).map((product) => (
              <div key={product.id} style={{ display: "flex", gap: "12px", alignItems: "flex-start", paddingBottom: "12px", borderBottom: "1px solid var(--color-border-divider-default)" }}>
                <div style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 4, overflow: "hidden", background: "var(--color-background-input-disabled)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {product.image
                    ? <S3Image src={product.image} alt={product.name} style={{ width: 56, height: 56, objectFit: "cover", display: "block" }} />
                    : <Box color="text-body-secondary" fontSize="body-s">—</Box>}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                    <Link href={`/admin/products/${product.id}/edit`} fontSize="body-m">{product.name}</Link>
                    <SpaceBetween direction="horizontal" size="xxs">
                      {product.availableUS && <Badge color="blue">US</Badge>}
                      {product.availableCA && <Badge color="green">CA</Badge>}
                    </SpaceBetween>
                  </SpaceBetween>
                  <Box variant="small" color="text-body-secondary">
                    {product.priceUSD > 0 ? `$${product.priceUSD.toFixed(2)} USD` : "Price not set"}
                    {" · "}
                    <Link href={`/products/${product.slug}`} external fontSize="inherit">View on site</Link>
                  </Box>
                  {product.tagline && (
                    <div style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 12, color: "var(--color-text-body-secondary)" } as React.CSSProperties}>
                      {product.tagline}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </SpaceBetween>
        )

      default:
        return null
    }
  }

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <ButtonDropdown
                variant="primary"
                items={[
                  { id: "product", text: "New product", iconName: "add-plus" },
                  { id: "blog", text: "New blog post", iconName: "add-plus" },
                  { id: "qr-link", text: "New QR link", iconName: "add-plus" },
                ]}
                onItemClick={({ detail }) => {
                  if (detail.id === "product") router.push("/admin/products/new")
                  else if (detail.id === "blog") router.push("/admin/blog/new")
                  else if (detail.id === "qr-link") router.push("/admin/qr-links/new")
                }}
              >
                Create
              </ButtonDropdown>
              <Button href="/" target="_blank" iconAlign="right" iconName="external">
                View site
              </Button>
            </SpaceBetween>
          }
        >
          Dashboard
        </Header>
      }
    >
      <Board
        items={boardItems}
        i18nStrings={boardI18n}
        onItemsChange={({ detail }) => {
          const next = detail.items as BoardProps.Item<WidgetData>[]
          setBoardItems(next)
          saveLayout(next)
        }}
        empty={
          <Container>
            <Box textAlign="center" padding="l" color="text-body-secondary">No widgets.</Box>
          </Container>
        }
        renderItem={(item) => {
          const id = item.id as WidgetId
          return (
            <BoardItem
              key={item.id}
              header={renderWidgetHeader(id, item.data.title)}
              disableContentPaddings={item.data.disableContentPaddings}
              i18nStrings={boardItemI18n}
            >
              {renderWidgetContent(id)}
            </BoardItem>
          )
        }}
      />
    </ContentLayout>
  )
}
