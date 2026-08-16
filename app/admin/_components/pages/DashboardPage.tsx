"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ContentLayout from "@cloudscape-design/components/content-layout"
import Header from "@cloudscape-design/components/header"
import Container from "@cloudscape-design/components/container"
import ColumnLayout from "@cloudscape-design/components/column-layout"
import SpaceBetween from "@cloudscape-design/components/space-between"
import Button from "@cloudscape-design/components/button"
import Box from "@cloudscape-design/components/box"
import Link from "@cloudscape-design/components/link"
import StatusIndicator from "@cloudscape-design/components/status-indicator"
import Badge from "@cloudscape-design/components/badge"
import BarChart from "@cloudscape-design/components/bar-chart"
import PieChart from "@cloudscape-design/components/pie-chart"
import Spinner from "@cloudscape-design/components/spinner"
import { useBlogPostStore } from "@/app/admin/_components/context/useBlogPostStore"
import { useProductStore } from "@/app/admin/_components/context/useProductStore"
import { useQrLinkStore } from "@/app/admin/_components/context/useQrLinkStore"
import { useSupportTicketStore } from "@/app/admin/_components/context/useSupportTicketStore"
import { parseMetricCounter, type ClickMetricSummary } from "@/lib/qr-links"

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({
  title,
  value,
  loading,
  href,
  linkText,
  status,
}: {
  title: string
  value: number | string
  loading?: boolean
  href: string
  linkText: string
  status?: "success" | "warning" | "error" | "info"
}) {
  const colorMap: Record<string, string> = {
    success: "text-status-success",
    warning: "text-status-warning",
    error: "text-status-error",
    info: "text-status-info",
  }
  const color = status ? colorMap[status] : "text-label"

  return (
    <div>
      <Box variant="awsui-key-label">{title}</Box>
      {loading ? (
        <Box padding={{ vertical: "xs" }}>
          <StatusIndicator type="loading">Loading</StatusIndicator>
        </Box>
      ) : (
        <Box
          variant="h1"
          fontSize="display-l"
          fontWeight="bold"
          color={color as Parameters<typeof Box>[0]["color"]}
          padding={{ vertical: "xs" }}
        >
          {String(value)}
        </Box>
      )}
      <Link href={href}>{linkText}</Link>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quick action card
// ---------------------------------------------------------------------------
function QuickActionCard({
  title,
  description,
  buttonText,
  href,
}: {
  title: string
  description: string
  buttonText: string
  href: string
}) {
  const router = useRouter()
  return (
    <SpaceBetween size="s">
      <div>
        <Box variant="h3" padding="n">{title}</Box>
        <Box variant="p" color="text-body-secondary">{description}</Box>
      </div>
      <Button onClick={() => router.push(href)}>{buttonText}</Button>
    </SpaceBetween>
  )
}

// ---------------------------------------------------------------------------
// Weekly metrics helpers
// ---------------------------------------------------------------------------

/** Returns the last N day strings in YYYY-MM-DD format (oldest first) */
function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - (n - 1 - i))
    return d.toISOString().slice(0, 10)
  })
}

/** Short label: "Mon 14" */
function shortDay(dateKey: string): string {
  const d = new Date(dateKey + "T12:00:00Z")
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" })
}

interface WeeklyChartData {
  dailyClicks: Array<{ x: string; y: number }>
  /** Per-country per-day clicks: Map<country, Map<dayLabel, count>> */
  countryByDay: Map<string, Map<string, number>>
  countryTotals: Map<string, number>
  weekTotal: number
  weekUnique: number
  weekScans: number
}

function buildWeeklyChartData(
  summaries: ClickMetricSummary[],
  days: string[]
): WeeklyChartData {
  const byDate = new Map<string, number>()
  const countryTotals = new Map<string, number>()
  const countryByDay = new Map<string, Map<string, number>>()
  let weekTotal = 0
  let weekUnique = 0
  let weekScans = 0

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
      const dayMap = countryByDay.get(item.name)!
      dayMap.set(dayLabel, (dayMap.get(dayLabel) ?? 0) + item.count)
    }
  }

  const dailyClicks = days.map((d) => ({
    x: shortDay(d),
    y: byDate.get(d) ?? 0,
  }))

  return { dailyClicks, countryByDay, countryTotals, weekTotal, weekUnique, weekScans }
}

const chartEmptyState = (
  <Box textAlign="center" color="inherit">
    <b>No data yet</b>
    <Box variant="p" color="inherit">Click events will appear after QR links are scanned.</Box>
  </Box>
)

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const { posts, loading: postsLoading } = useBlogPostStore()
  const { products, loading: productsLoading } = useProductStore()
  const { links, loading: linksLoading, fetchRecentMetricSummaries } = useQrLinkStore()
  const { tickets, loading: ticketsLoading } = useSupportTicketStore()

  // Weekly metrics state
  const [weeklySummaries, setWeeklySummaries] = useState<ClickMetricSummary[]>([])
  const [weeklyLoading, setWeeklyLoading] = useState(true)

  // Fetch weekly metrics once links are loaded
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

  // Ticket stats
  const newTickets = tickets.filter((t) => t.status === "New")
  const openTickets = tickets.filter((t) => t.status === "New" || t.status === "InProgress")

  // QR stats
  const totalClicks = links.reduce((sum, l) => sum + (l.clickCount ?? 0), 0)
  const topLinks = [...links].sort((a, b) => (b.clickCount ?? 0) - (a.clickCount ?? 0)).slice(0, 4)

  // Recent content
  const recentTickets = tickets.slice(0, 5)
  const recentPosts = [...posts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)

  // Weekly chart data
  const days7 = lastNDays(7)
  const weekly = buildWeeklyChartData(weeklySummaries, days7)
  const topCountries = Array.from(weekly.countryTotals.entries())
    .map(([name, count]) => ({ title: name, value: count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          actions={
            <Button href="/" target="_blank" iconAlign="right" iconName="external">
              View site
            </Button>
          }
        >
          Dashboard
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* ── Overview stats ──────────────────────────────────── */}
        <Container header={<Header variant="h2">Overview</Header>}>
          <ColumnLayout columns={4} variant="text-grid">
            <StatCard
              title="Open tickets"
              value={openTickets.length}
              loading={ticketsLoading}
              href="/admin/support"
              linkText="View support"
              status={openTickets.length === 0 ? "success" : newTickets.length > 0 ? "error" : "warning"}
            />
            <StatCard
              title="New (unread)"
              value={newTickets.length}
              loading={ticketsLoading}
              href="/admin/support"
              linkText="View new tickets"
              status={newTickets.length > 0 ? "error" : "success"}
            />
            <StatCard
              title="Total QR clicks"
              value={totalClicks.toLocaleString()}
              loading={linksLoading}
              href="/admin/qr-links"
              linkText="View QR links"
            />
            <StatCard
              title="Active QR links"
              value={links.length}
              loading={linksLoading}
              href="/admin/qr-links"
              linkText="Manage QR links"
            />
          </ColumnLayout>
        </Container>

        {/* ── Weekly traffic charts ────────────────────────────── */}
        <Container
          header={
            <Header
              variant="h2"
              counter={weeklyLoading ? undefined : `(${weekly.weekTotal.toLocaleString()} clicks this week)`}
              description="Aggregated QR link traffic for the past 7 days"
            >
              Weekly traffic
            </Header>
          }
        >
          {weeklyLoading ? (
            <Box textAlign="center" padding="xl">
              <Spinner size="large" />
            </Box>
          ) : (
            <SpaceBetween size="l">
              {/* Weekly highlight stats */}
              <ColumnLayout columns={3} variant="text-grid">
                <div>
                  <Box variant="awsui-key-label">Total clicks (7 days)</Box>
                  <Box variant="h1" fontSize="display-l" fontWeight="bold" padding={{ vertical: "xs" }}>
                    {weekly.weekTotal.toLocaleString()}
                  </Box>
                </div>
                <div>
                  <Box variant="awsui-key-label">Unique visitors (est.)</Box>
                  <Box variant="h1" fontSize="display-l" fontWeight="bold" padding={{ vertical: "xs" }}>
                    {weekly.weekUnique.toLocaleString()}
                  </Box>
                </div>
                <div>
                  <Box variant="awsui-key-label">Physical QR scans</Box>
                  <Box variant="h1" fontSize="display-l" fontWeight="bold" padding={{ vertical: "xs" }}>
                    {weekly.weekScans.toLocaleString()}
                  </Box>
                  <Box variant="small" color="text-body-secondary">
                    mobile + no referrer
                  </Box>
                </div>
              </ColumnLayout>

              {/* Daily clicks bar chart + countries pie */}
              <ColumnLayout columns={weekly.weekTotal > 0 && topCountries.length > 0 ? 2 : 1}>
                {/* Clicks per day — stacked by country if data exists, plain bar otherwise */}
                <div>
                  <Box variant="h3" padding={{ bottom: "s" }}>Clicks per day by country</Box>
                  <BarChart
                    series={
                      weekly.weekTotal > 0 && topCountries.length > 0
                        ? // Stacked bar series — one per country
                          Array.from(weekly.countryByDay.entries())
                            .sort((a, b) => {
                              const totA = Array.from(a[1].values()).reduce((s, v) => s + v, 0)
                              const totB = Array.from(b[1].values()).reduce((s, v) => s + v, 0)
                              return totB - totA
                            })
                            .slice(0, 8)
                            .map(([country, dayMap]) => ({
                              title: country,
                              type: "bar" as const,
                              data: days7.map((d) => ({
                                x: shortDay(d),
                                y: dayMap.get(shortDay(d)) ?? 0,
                              })),
                            }))
                        : [
                            {
                              title: "Clicks",
                              type: "bar" as const,
                              data: weekly.dailyClicks,
                              color: "#0972d3",
                            },
                          ]
                    }
                    xDomain={days7.map(shortDay)}
                    yDomain={[0, Math.max(1, ...weekly.dailyClicks.map((d) => d.y))]}
                    xTitle="Day"
                    yTitle="Clicks"
                    height={220}
                    stackedBars={weekly.weekTotal > 0 && topCountries.length > 0}
                    statusType="finished"
                    empty={chartEmptyState}
                    noMatch={chartEmptyState}
                    i18nStrings={{
                      xTickFormatter: (v) => String(v),
                      yTickFormatter: (v) => String(v),
                      legendAriaLabel: "Legend",
                      chartAriaRoleDescription: "bar chart",
                      xAxisAriaRoleDescription: "x axis",
                      yAxisAriaRoleDescription: "y axis",
                    }}
                  />
                </div>

                {/* Countries breakdown pie */}
                {weekly.weekTotal > 0 && topCountries.length > 0 && (
                  <div>
                    <Box variant="h3" padding={{ bottom: "s" }}>Countries</Box>
                    <PieChart
                      data={topCountries}
                      statusType="finished"
                      empty={chartEmptyState}
                      noMatch={chartEmptyState}
                      i18nStrings={{
                        legendAriaLabel: "Legend",
                        chartAriaRoleDescription: "pie chart",
                        segmentAriaRoleDescription: "segment",
                      }}
                    />
                  </div>
                )}
              </ColumnLayout>
            </SpaceBetween>
          )}
        </Container>

        {/* ── Quick actions ────────────────────────────────────── */}
        <Container header={<Header variant="h2">Quick actions</Header>}>
          <ColumnLayout columns={3}>
            <QuickActionCard
              title="Add a product"
              description="Create a new product listing with pricing, images, and availability."
              buttonText="Create product"
              href="/admin/products/new"
            />
            <QuickActionCard
              title="Write a blog post"
              description="Publish a new article to the mokhaLab blog."
              buttonText="Create post"
              href="/admin/blog/new"
            />
            <QuickActionCard
              title="View open tickets"
              description="Review and respond to customer support requests."
              buttonText="View support"
              href="/admin/support"
            />
          </ColumnLayout>
        </Container>

        {/* ── Tickets + QR links ──────────────────────────────── */}
        <ColumnLayout columns={2}>
          <Container
            header={
              <Header
                variant="h2"
                counter={`(${openTickets.length} open)`}
                actions={<Link href="/admin/support">View all</Link>}
              >
                Support tickets
              </Header>
            }
          >
            {ticketsLoading ? (
              <StatusIndicator type="loading">Loading tickets</StatusIndicator>
            ) : recentTickets.length === 0 ? (
              <Box variant="p" color="text-body-secondary">No tickets yet.</Box>
            ) : (
              <SpaceBetween size="s">
                {recentTickets.map((ticket) => (
                  <div key={ticket.id}>
                    <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                      <Link href={`/admin/support/${ticket.id}`}>{ticket.ticketId}</Link>
                      <Badge
                        color={
                          ticket.status === "New" ? "red"
                          : ticket.status === "InProgress" ? "blue"
                          : ticket.status === "Resolved" ? "green"
                          : "grey"
                        }
                      >
                        {ticket.status === "InProgress" ? "In Progress" : ticket.status}
                      </Badge>
                    </SpaceBetween>
                    <Box variant="small" color="text-body-secondary">
                      {ticket.customerName} &middot; {ticket.caseType} &middot; {ticket.productName}
                    </Box>
                  </div>
                ))}
              </SpaceBetween>
            )}
          </Container>

          <Container
            header={
              <Header
                variant="h2"
                counter={`(${totalClicks.toLocaleString()} total clicks)`}
                actions={<Link href="/admin/qr-links">View all</Link>}
              >
                QR link performance
              </Header>
            }
          >
            {linksLoading ? (
              <StatusIndicator type="loading">Loading QR links</StatusIndicator>
            ) : topLinks.length === 0 ? (
              <Box variant="p" color="text-body-secondary">No QR links yet.</Box>
            ) : (
              <SpaceBetween size="s">
                {topLinks.map((link) => (
                  <div key={link.id}>
                    <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                      <Link href={`/admin/qr-links/${link.id}`}>{link.label ?? link.code}</Link>
                      <Box variant="small" color="text-body-secondary">
                        {(link.clickCount ?? 0).toLocaleString()} clicks
                      </Box>
                    </SpaceBetween>
                    <Box variant="small" color="text-body-secondary">
                      /{link.code} &rarr;{" "}
                      <Link href={link.destinationUrl} external fontSize="inherit">
                        {link.destinationUrl.replace(/^https?:\/\//, "").slice(0, 40)}
                        {link.destinationUrl.length > 47 ? "…" : ""}
                      </Link>
                    </Box>
                  </div>
                ))}
              </SpaceBetween>
            )}
          </Container>
        </ColumnLayout>

        {/* ── Content summary ─────────────────────────────────── */}
        <ColumnLayout columns={2}>
          <Container
            header={
              <Header variant="h2" counter={`(${posts.length})`} actions={<Link href="/admin/blog">View all</Link>}>
                Recent posts
              </Header>
            }
          >
            {postsLoading ? (
              <StatusIndicator type="loading">Loading posts</StatusIndicator>
            ) : recentPosts.length === 0 ? (
              <Box variant="p" color="text-body-secondary">
                No posts yet. <Link href="/admin/blog/new">Create your first post</Link>
              </Box>
            ) : (
              <SpaceBetween size="s">
                {recentPosts.map((post) => (
                  <div key={post.id}>
                    <Link href={`/admin/blog/${post.id}/edit`}>{post.title}</Link>
                    <Box variant="small" color="text-body-secondary">
                      {post.date} &middot; {post.author}
                    </Box>
                  </div>
                ))}
              </SpaceBetween>
            )}
          </Container>

          <Container
            header={
              <Header variant="h2" counter={`(${products.length})`} actions={<Link href="/admin/products">View all</Link>}>
                Products
              </Header>
            }
          >
            {productsLoading ? (
              <StatusIndicator type="loading">Loading products</StatusIndicator>
            ) : products.length === 0 ? (
              <Box variant="p" color="text-body-secondary">
                No products yet. <Link href="/admin/products/new">Add your first product</Link>
              </Box>
            ) : (
              <SpaceBetween size="s">
                {products.slice(0, 4).map((product) => (
                  <div key={product.id}>
                    <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                      <Link href={`/admin/products/${product.id}/edit`}>{product.name}</Link>
                      <SpaceBetween direction="horizontal" size="xxs">
                        {product.availableUS && <Badge color="blue">US</Badge>}
                        {product.availableCA && <Badge color="green">CA</Badge>}
                      </SpaceBetween>
                    </SpaceBetween>
                    <Box variant="small" color="text-body-secondary">
                      ${product.priceUSD.toFixed(2)} USD &middot;{" "}
                      <Link href={`/products/${product.slug}`} external fontSize="inherit">
                        View on site
                      </Link>
                    </Box>
                  </div>
                ))}
              </SpaceBetween>
            )}
          </Container>
        </ColumnLayout>
      </SpaceBetween>
    </ContentLayout>
  )
}
