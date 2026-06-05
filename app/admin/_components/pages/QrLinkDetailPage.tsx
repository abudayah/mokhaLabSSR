"use client"

import { useEffect, useState } from "react"
import Alert from "@cloudscape-design/components/alert"
import BarChart from "@cloudscape-design/components/bar-chart"
import Box from "@cloudscape-design/components/box"
import Button from "@cloudscape-design/components/button"
import ColumnLayout from "@cloudscape-design/components/column-layout"
import Container from "@cloudscape-design/components/container"
import ContentLayout from "@cloudscape-design/components/content-layout"
import Header from "@cloudscape-design/components/header"
import PieChart from "@cloudscape-design/components/pie-chart"
import SpaceBetween from "@cloudscape-design/components/space-between"
import Spinner from "@cloudscape-design/components/spinner"
import { useQrLinkStore } from "@/app/admin/_components/context/useQrLinkStore"
import { groupClicksByDay, groupByDeviceType } from "@/app/admin/_components/utils/analyticsUtils"
import { generateQrSvg, downloadQrSvg } from "@/app/admin/_components/utils/qrCodeUtils"
import type { ClickEvent } from "@/lib/qr-links"

const emptyState = (
  <Box textAlign="center" color="inherit">
    <b>No data</b>
  </Box>
)

export default function QrLinkDetailPage({ id }: { id: string }) {
  const { getLinkById, fetchClickEvents } = useQrLinkStore()
  const link = getLinkById(id)

  const [events, setEvents] = useState<ClickEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [downloadingQr, setDownloadingQr] = useState(false)

  // Fetch click events on mount
  useEffect(() => {
    let cancelled = false
    setEventsLoading(true)
    fetchClickEvents(id)
      .then((data) => {
        if (!cancelled) setEvents(data)
      })
      .catch(() => {
        if (!cancelled) setEvents([])
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, fetchClickEvents])

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

  // Link not found
  if (!link) {
    return (
      <ContentLayout header={<Header variant="h1">QR Link Detail</Header>}>
        <Alert type="error">QR Link not found.</Alert>
      </ContentLayout>
    )
  }

  const label = link.label ?? link.code
  const formattedDate = new Date(link.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const clicksByDay = eventsLoading ? [] : groupClicksByDay(events)
  const deviceBreakdown = eventsLoading ? [] : groupByDeviceType(events)

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          actions={
            <Button
              variant="primary"
              loading={downloadingQr}
              onClick={handleDownloadQr}
            >
              Download QR Code
            </Button>
          }
        >
          {label}
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* Metadata */}
        <Container header={<Header variant="h2">Details</Header>}>
          <ColumnLayout columns={2} variant="text-grid">
            <SpaceBetween size="s">
              <div>
                <Box variant="awsui-key-label">Destination URL</Box>
                <a href={link.destinationUrl} target="_blank" rel="noopener noreferrer">
                  {link.destinationUrl}
                </a>
              </div>
              <div>
                <Box variant="awsui-key-label">Short Code</Box>
                <Box variant="p">{link.code}</Box>
              </div>
            </SpaceBetween>
            <SpaceBetween size="s">
              <div>
                <Box variant="awsui-key-label">Total Clicks</Box>
                <Box variant="p">{link.clickCount}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Created</Box>
                <Box variant="p">{formattedDate}</Box>
              </div>
            </SpaceBetween>
          </ColumnLayout>
        </Container>

        {/* Clicks Over Time */}
        <Container header={<Header variant="h2">Clicks Over Time</Header>}>
          {eventsLoading ? (
            <Box textAlign="center" padding="l">
              <Spinner size="large" />
            </Box>
          ) : (
            <BarChart
              series={[
                {
                  title: "Clicks",
                  type: "bar",
                  data: clicksByDay.map((d) => ({ x: d.date, y: d.count })),
                },
              ]}
              xDomain={clicksByDay.map((d) => d.date)}
              yDomain={[0, Math.max(1, ...clicksByDay.map((d) => d.count))]}
              xTitle="Date"
              yTitle="Clicks"
              statusType="finished"
              empty={emptyState}
              noMatch={emptyState}
              i18nStrings={{
                xTickFormatter: (v) => String(v),
                yTickFormatter: (v) => String(v),
                filterLabel: "Filter displayed data",
                filterPlaceholder: "Filter data",
                filterSelectedAriaLabel: "selected",
                legendAriaLabel: "Legend",
                chartAriaRoleDescription: "bar chart",
                xAxisAriaRoleDescription: "x axis",
                yAxisAriaRoleDescription: "y axis",
              }}
            />
          )}
        </Container>

        {/* Device Type Breakdown */}
        <Container header={<Header variant="h2">Device Type Breakdown</Header>}>
          {eventsLoading ? (
            <Box textAlign="center" padding="l">
              <Spinner size="large" />
            </Box>
          ) : (
            <PieChart
              data={deviceBreakdown
                .filter((d) => d.count > 0)
                .map((d) => ({ title: d.type, value: d.count }))}
              statusType="finished"
              empty={emptyState}
              noMatch={emptyState}
              i18nStrings={{
                filterLabel: "Filter displayed data",
                filterPlaceholder: "Filter data",
                filterSelectedAriaLabel: "selected",
                legendAriaLabel: "Legend",
                chartAriaRoleDescription: "pie chart",
                segmentAriaRoleDescription: "segment",
              }}
            />
          )}
        </Container>
      </SpaceBetween>
    </ContentLayout>
  )
}
