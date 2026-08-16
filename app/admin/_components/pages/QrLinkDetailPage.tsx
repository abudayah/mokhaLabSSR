"use client"

import { useEffect, useState } from "react"
import { useForm, get } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CInput } from "react-hook-form-cloudscape"
import Alert from "@cloudscape-design/components/alert"
import BarChart from "@cloudscape-design/components/bar-chart"
import Box from "@cloudscape-design/components/box"
import Button from "@cloudscape-design/components/button"
import ColumnLayout from "@cloudscape-design/components/column-layout"
import Container from "@cloudscape-design/components/container"
import ContentLayout from "@cloudscape-design/components/content-layout"
import Form from "@cloudscape-design/components/form"
import FormField from "@cloudscape-design/components/form-field"
import Header from "@cloudscape-design/components/header"
import Modal from "@cloudscape-design/components/modal"
import PieChart from "@cloudscape-design/components/pie-chart"
import SpaceBetween from "@cloudscape-design/components/space-between"
import CopyToClipboard from "@cloudscape-design/components/copy-to-clipboard"
import Spinner from "@cloudscape-design/components/spinner"
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs"
import ProgressBar from "@cloudscape-design/components/progress-bar"
import Link from "@cloudscape-design/components/link"
import { useQrLinkStore } from "@/app/admin/_components/context/useQrLinkStore"
import { useNotifications } from "@/app/admin/_components/context/NotificationContext"
import { generateQrSvg, downloadQrSvg } from "@/app/admin/_components/utils/qrCodeUtils"
import {
  type ClickMetricSummary,
  parseMetricCounter,
  parseHourDistribution,
  type QrLink,
} from "@/lib/qr-links"

const BASE_URL = "https://mokhalab.com"

// ─── Edit schema ──────────────────────────────────────────────────────────────

const editSchema = z.object({
  destinationUrl: z.string().min(1, "Destination URL is required").url("Must be a valid URL"),
  label: z.string().min(1, "Label is required"),
})
type EditFormData = z.infer<typeof editSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyState = (
  <Box textAlign="center" color="inherit">
    <b>No data yet</b>
    <Box variant="p" color="inherit">Click events will appear here after the first scan.</Box>
  </Box>
)

function pct(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

/** Aggregates all daily summaries into a single totals object */
function aggregateSummaries(summaries: ClickMetricSummary[]) {
  const totals = {
    totalClicks: 0,
    uniqueIps: 0,
    likelyScanClicks: 0,
    botClicks: 0,
    mobileClicks: 0,
    tabletClicks: 0,
    desktopClicks: 0,
    unknownClicks: 0,
    osMap: new Map<string, number>(),
    browserMap: new Map<string, number>(),
    sourceMap: new Map<string, number>(),
    countryMap: new Map<string, number>(),
    hourMap: new Map<string, number>(),
  }

  for (const s of summaries) {
    totals.totalClicks += s.totalClicks
    totals.uniqueIps += s.uniqueIps
    totals.likelyScanClicks += s.likelyScanClicks
    totals.botClicks += s.botClicks
    totals.mobileClicks += s.mobileClicks
    totals.tabletClicks += s.tabletClicks
    totals.desktopClicks += s.desktopClicks
    totals.unknownClicks += s.unknownClicks

    for (const item of parseMetricCounter(s.topOS)) {
      totals.osMap.set(item.name, (totals.osMap.get(item.name) ?? 0) + item.count)
    }
    for (const item of parseMetricCounter(s.topBrowsers)) {
      totals.browserMap.set(item.name, (totals.browserMap.get(item.name) ?? 0) + item.count)
    }
    for (const item of parseMetricCounter(s.topSources)) {
      totals.sourceMap.set(item.name, (totals.sourceMap.get(item.name) ?? 0) + item.count)
    }
    for (const item of parseMetricCounter(s.topCountries)) {
      totals.countryMap.set(item.name, (totals.countryMap.get(item.name) ?? 0) + item.count)
    }
    for (const { hour, clicks } of parseHourDistribution(s.hourDistribution)) {
      totals.hourMap.set(hour, (totals.hourMap.get(hour) ?? 0) + clicks)
    }
  }

  return totals
}

function mapToSorted(map: Map<string, number>, topN = 8) {
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditQrLinkModal({ link, onDismiss }: { link: QrLink; onDismiss: () => void }) {
  const { updateLink } = useQrLinkStore()
  const { addNotification } = useNotifications()

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { destinationUrl: link.destinationUrl, label: link.label ?? "" },
  })

  async function onSubmit(data: EditFormData) {
    try {
      await updateLink(link.id, data)
      addNotification({ type: "success", content: "QR link updated.", dismissible: true })
      onDismiss()
    } catch (err) {
      addNotification({
        type: "error",
        content: err instanceof Error ? err.message : "Failed to update.",
        dismissible: true,
      })
    }
  }

  return (
    <Modal
      visible
      onDismiss={onDismiss}
      header="Edit QR link"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" formAction="none" onClick={onDismiss}>Cancel</Button>
            <Button variant="primary" formAction="submit" form="edit-qr-link-form" loading={isSubmitting}>Save</Button>
          </SpaceBetween>
        </Box>
      }
    >
      <form id="edit-qr-link-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Form>
          <SpaceBetween size="l">
            <FormField label="Destination URL" errorText={get(errors, "destinationUrl.message")}>
              <CInput control={control} name="destinationUrl" placeholder="https://example.com" />
            </FormField>
            <FormField label="Label" errorText={get(errors, "label.message")}>
              <CInput control={control} name="label" placeholder="e.g. Summer Campaign" />
            </FormField>
          </SpaceBetween>
        </Form>
      </form>
    </Modal>
  )
}

// ─── Detail Page ──────────────────────────────────────────────────────────────

export default function QrLinkDetailPage({ id }: { id: string }) {
  const { getLinkById, fetchMetricSummaries } = useQrLinkStore()
  const link = getLinkById(id)

  const [summaries, setSummaries] = useState<ClickMetricSummary[]>([])
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [downloadingQr, setDownloadingQr] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)

  useEffect(() => {
    let cancelled = false
    setMetricsLoading(true)
    fetchMetricSummaries(id)
      .then((data) => { if (!cancelled) setSummaries(data) })
      .catch(() => { if (!cancelled) setSummaries([]) })
      .finally(() => { if (!cancelled) setMetricsLoading(false) })
    return () => { cancelled = true }
  }, [id, fetchMetricSummaries])

  async function handleDownloadQr() {
    if (!link) return
    setDownloadingQr(true)
    try {
      const svg = await generateQrSvg(link.code)
      downloadQrSvg(svg, link.code)
    } finally {
      setDownloadingQr(false)
    }
  }

  if (!link) {
    return (
      <ContentLayout header={<Header variant="h1">QR Link</Header>}>
        <Alert type="error">QR link not found.</Alert>
      </ContentLayout>
    )
  }

  const label = link.label ?? link.code
  const formattedDate = new Date(link.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  })
  const formattedLastClick = link.lastClickedAt
    ? new Date(link.lastClickedAt).toLocaleString("en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "Never"

  // Aggregated totals across all days
  const totals = aggregateSummaries(summaries)
  const realClicks = totals.totalClicks - totals.botClicks

  // Build per-country per-day series for the "Clicks over time" chart
  // countryByDay: Map<country, Map<dateKey, count>>
  const countryByDay = new Map<string, Map<string, number>>()
  for (const s of summaries) {
    for (const item of parseMetricCounter(s.topCountries)) {
      if (!countryByDay.has(item.name)) countryByDay.set(item.name, new Map())
      const dayMap = countryByDay.get(item.name)!
      dayMap.set(s.dateKey, (dayMap.get(s.dateKey) ?? 0) + item.count)
    }
  }

  // All date keys sorted ascending
  const allDates = summaries.map((s) => s.dateKey).sort()

  // Country series — sorted by total desc, top 8
  const countrySeries = Array.from(countryByDay.entries())
    .map(([country, dayMap]) => ({
      country,
      total: Array.from(dayMap.values()).reduce((s, v) => s + v, 0),
      dayMap,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map(({ country, dayMap }) => ({
      title: country,
      type: "bar" as const,
      data: allDates.map((d) => ({ x: d, y: dayMap.get(d) ?? 0 })),
    }))

  // Fallback: single "Unknown" series using total daily clicks
  const clicksOverTimeSeries =
    countrySeries.length > 0
      ? countrySeries
      : [
          {
            title: "Unknown",
            type: "bar" as const,
            data: summaries.map((s) => ({ x: s.dateKey, y: s.totalClicks })),
          },
        ]

  // Device breakdown for pie
  const deviceData = [
    { title: "Mobile", value: totals.mobileClicks },
    { title: "Desktop", value: totals.desktopClicks },
    { title: "Tablet", value: totals.tabletClicks },
    { title: "Unknown", value: totals.unknownClicks },
  ].filter((d) => d.value > 0)

  const topOS = mapToSorted(totals.osMap)
  const topBrowsers = mapToSorted(totals.browserMap)
  const topSources = mapToSorted(totals.sourceMap)
  const topCountries = mapToSorted(totals.countryMap)
  const hourDist = Array.from({ length: 24 }, (_, i) => {
    const hour = String(i).padStart(2, "0")
    return { x: `${hour}:00`, y: totals.hourMap.get(hour) ?? 0 }
  })

  return (
    <>
      <ContentLayout
        header={
          <Header
            variant="h1"
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button onClick={() => setEditModalVisible(true)}>Edit</Button>
                <Button variant="primary" loading={downloadingQr} onClick={handleDownloadQr}>
                  Download QR code
                </Button>
              </SpaceBetween>
            }
          >
            {label}
          </Header>
        }
      >
        <SpaceBetween size="l">
          {/* ── Details ─────────────────────────────────────────── */}
          <Container header={<Header variant="h2">Details</Header>}>
            <KeyValuePairs
              columns={3}
              items={[
                {
                  label: "Short link",
                  value: (
                    <CopyToClipboard
                      copyButtonAriaLabel="Copy short link"
                      copyErrorText="Failed to copy"
                      copySuccessText="Copied"
                      textToCopy={`${BASE_URL}/go/${link.code}`}
                      variant="inline"
                    />
                  ),
                },
                {
                  label: "Destination",
                  value: <Link href={link.destinationUrl} external>{link.destinationUrl}</Link>,
                },
                { label: "Created", value: formattedDate },
                { label: "Total clicks", value: String(link.clickCount) },
                { label: "Last click", value: formattedLastClick },
                { label: "Likely scans", value: metricsLoading ? "—" : String(totals.likelyScanClicks) },
              ]}
            />
          </Container>

          {/* ── Summary stats ────────────────────────────────────── */}
          {!metricsLoading && summaries.length > 0 && (
            <Container header={<Header variant="h2">All-time summary</Header>}>
              <ColumnLayout columns={4} variant="text-grid">
                <div>
                  <Box variant="awsui-key-label">Total clicks</Box>
                  <Box variant="h1" fontSize="display-l" fontWeight="bold">{totals.totalClicks.toLocaleString()}</Box>
                </div>
                <div>
                  <Box variant="awsui-key-label">Unique visitors (est.)</Box>
                  <Box variant="h1" fontSize="display-l" fontWeight="bold">{totals.uniqueIps.toLocaleString()}</Box>
                </div>
                <div>
                  <Box variant="awsui-key-label">Physical QR scans</Box>
                  <Box variant="h1" fontSize="display-l" fontWeight="bold">{totals.likelyScanClicks.toLocaleString()}</Box>
                  <Box variant="small" color="text-body-secondary">
                    {pct(totals.likelyScanClicks, realClicks)}% of real traffic
                  </Box>
                </div>
                <div>
                  <Box variant="awsui-key-label">Bot traffic filtered</Box>
                  <Box variant="h1" fontSize="display-l" fontWeight="bold">{totals.botClicks.toLocaleString()}</Box>
                </div>
              </ColumnLayout>
            </Container>
          )}

          {/* ── Clicks over time (stacked by country) ────────────── */}
          <Container header={<Header variant="h2">Clicks over time</Header>}>
            {metricsLoading ? (
              <Box textAlign="center" padding="l"><Spinner size="large" /></Box>
            ) : (
              <BarChart
                series={clicksOverTimeSeries}
                xDomain={allDates}
                yDomain={[0, Math.max(1, ...summaries.map((s) => s.totalClicks))]}
                xTitle="Date"
                yTitle="Clicks"
                stackedBars={countrySeries.length > 1}
                hideFilter
                statusType="finished"
                empty={emptyState}
                noMatch={emptyState}
                i18nStrings={{
                  xTickFormatter: (v) => String(v),
                  yTickFormatter: (v) => String(v),
                  legendAriaLabel: "Legend",
                  chartAriaRoleDescription: "bar chart",
                  xAxisAriaRoleDescription: "x axis",
                  yAxisAriaRoleDescription: "y axis",
                }}
              />
            )}
          </Container>

          {/* ── Hour of day heatmap ───────────────────────────────── */}
          {!metricsLoading && summaries.length > 0 && (
            <Container header={<Header variant="h2">Click distribution by hour (UTC)</Header>}>
              <BarChart
                series={[{ title: "Clicks", type: "bar", data: hourDist }]}
                xDomain={hourDist.map((d) => d.x)}
                yDomain={[0, Math.max(1, ...hourDist.map((d) => d.y))]}
                xTitle="Hour (UTC)"
                yTitle="Clicks"
                hideFilter
                statusType="finished"
                empty={emptyState}
                noMatch={emptyState}
                i18nStrings={{
                  xTickFormatter: (v) => String(v),
                  yTickFormatter: (v) => String(v),
                  legendAriaLabel: "Legend",
                  chartAriaRoleDescription: "bar chart",
                  xAxisAriaRoleDescription: "x axis",
                  yAxisAriaRoleDescription: "y axis",
                }}
              />
            </Container>
          )}

          {/* ── Device + Sources ─────────────────────────────────── */}
          <ColumnLayout columns={2}>
            <Container header={<Header variant="h2">Device type</Header>}>
              {metricsLoading ? (
                <Box textAlign="center" padding="l"><Spinner size="large" /></Box>
              ) : (
                <PieChart
                  data={deviceData}
                  statusType="finished"
                  empty={emptyState}
                  noMatch={emptyState}
                  i18nStrings={{
                    legendAriaLabel: "Legend",
                    chartAriaRoleDescription: "pie chart",
                    segmentAriaRoleDescription: "segment",
                  }}
                />
              )}
            </Container>

            <Container header={<Header variant="h2">Traffic sources</Header>}>
              {metricsLoading ? (
                <Box textAlign="center" padding="l"><Spinner size="large" /></Box>
              ) : topSources.length === 0 ? (
                emptyState
              ) : (
                <SpaceBetween size="s">
                  {topSources.map((item) => (
                    <div key={item.name}>
                      <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                        <Box variant="small">{item.name}</Box>
                        <Box variant="small" color="text-body-secondary">{item.count.toLocaleString()}</Box>
                      </SpaceBetween>
                      <ProgressBar
                        value={pct(item.count, totals.totalClicks)}
                        label=""
                        additionalInfo={`${pct(item.count, totals.totalClicks)}%`}
                      />
                    </div>
                  ))}
                </SpaceBetween>
              )}
            </Container>
          </ColumnLayout>

          {/* ── OS + Browsers ────────────────────────────────────── */}
          <ColumnLayout columns={2}>
            <Container header={<Header variant="h2">Operating systems</Header>}>
              {metricsLoading ? (
                <Box textAlign="center" padding="l"><Spinner size="large" /></Box>
              ) : topOS.length === 0 ? (
                emptyState
              ) : (
                <SpaceBetween size="s">
                  {topOS.map((item) => (
                    <div key={item.name}>
                      <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                        <Box variant="small">{item.name}</Box>
                        <Box variant="small" color="text-body-secondary">{item.count.toLocaleString()}</Box>
                      </SpaceBetween>
                      <ProgressBar
                        value={pct(item.count, realClicks)}
                        label=""
                        additionalInfo={`${pct(item.count, realClicks)}%`}
                      />
                    </div>
                  ))}
                </SpaceBetween>
              )}
            </Container>

            <Container header={<Header variant="h2">Browsers</Header>}>
              {metricsLoading ? (
                <Box textAlign="center" padding="l"><Spinner size="large" /></Box>
              ) : topBrowsers.length === 0 ? (
                emptyState
              ) : (
                <SpaceBetween size="s">
                  {topBrowsers.map((item) => (
                    <div key={item.name}>
                      <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                        <Box variant="small">{item.name}</Box>
                        <Box variant="small" color="text-body-secondary">{item.count.toLocaleString()}</Box>
                      </SpaceBetween>
                      <ProgressBar
                        value={pct(item.count, realClicks)}
                        label=""
                        additionalInfo={`${pct(item.count, realClicks)}%`}
                      />
                    </div>
                  ))}
                </SpaceBetween>
              )}
            </Container>
          </ColumnLayout>

          {/* ── Countries ────────────────────────────────────────── */}
          {!metricsLoading && topCountries.length > 0 && (
            <Container header={<Header variant="h2">Countries</Header>}>
              <ColumnLayout columns={2}>
                <SpaceBetween size="s">
                  {topCountries.map((item) => (
                    <div key={item.name}>
                      <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                        <Box variant="small">{item.name}</Box>
                        <Box variant="small" color="text-body-secondary">{item.count.toLocaleString()}</Box>
                      </SpaceBetween>
                      <ProgressBar
                        value={pct(item.count, totals.totalClicks)}
                        label=""
                        additionalInfo={`${pct(item.count, totals.totalClicks)}%`}
                      />
                    </div>
                  ))}
                </SpaceBetween>
              </ColumnLayout>
            </Container>
          )}
        </SpaceBetween>
      </ContentLayout>

      {editModalVisible && (
        <EditQrLinkModal link={link} onDismiss={() => setEditModalVisible(false)} />
      )}
    </>
  )
}
