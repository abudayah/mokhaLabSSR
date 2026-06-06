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
import { useQrLinkStore } from "@/app/admin/_components/context/useQrLinkStore"
import { useNotifications } from "@/app/admin/_components/context/NotificationContext"
import { groupClicksByDay, groupByDeviceType } from "@/app/admin/_components/utils/analyticsUtils"
import { generateQrSvg, downloadQrSvg } from "@/app/admin/_components/utils/qrCodeUtils"
import type { ClickEvent, QrLink } from "@/lib/qr-links"

const BASE_URL = "https://mokhalab.com"

// ─── Edit schema ──────────────────────────────────────────────────────────────

const editSchema = z.object({
  destinationUrl: z
    .string()
    .min(1, "Destination URL is required")
    .url("Must be a valid HTTP or HTTPS URL"),
  label: z.string().min(1, "Label is required"),
})

type EditFormData = z.infer<typeof editSchema>

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditQrLinkModalProps {
  link: QrLink
  onDismiss: () => void
}

function EditQrLinkModal({ link, onDismiss }: EditQrLinkModalProps) {
  const { updateLink } = useQrLinkStore()
  const { addNotification } = useNotifications()

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      destinationUrl: link.destinationUrl,
      label: link.label ?? "",
    },
  })

  async function onSubmit(data: EditFormData) {
    try {
      await updateLink(link.id, data)
      addNotification({
        type: "success",
        content: "QR Link updated.",
        dismissible: true,
      })
      onDismiss()
    } catch (err) {
      addNotification({
        type: "error",
        content: err instanceof Error ? err.message : "Failed to update QR link.",
        dismissible: true,
      })
    }
  }

  return (
    <Modal
      visible
      onDismiss={onDismiss}
      header="Edit QR Link"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" formAction="none" onClick={onDismiss}>
              Cancel
            </Button>
            <Button
              variant="primary"
              formAction="submit"
              form="edit-qr-link-form"
              loading={isSubmitting}
            >
              Save
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <form id="edit-qr-link-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Form>
          <SpaceBetween size="l">
            <FormField
              label="Destination URL"
              errorText={get(errors, "destinationUrl.message")}
            >
              <CInput
                control={control}
                name="destinationUrl"
                placeholder="https://example.com"
              />
            </FormField>

            <FormField
              label="Label"
              errorText={get(errors, "label.message")}
            >
              <CInput
                control={control}
                name="label"
                placeholder="e.g. Summer Campaign"
              />
            </FormField>
          </SpaceBetween>
        </Form>
      </form>
    </Modal>
  )
}

// ─── Charts empty state ───────────────────────────────────────────────────────

const emptyState = (
  <Box textAlign="center" color="inherit">
    <b>No data</b>
  </Box>
)

// ─── Detail Page ──────────────────────────────────────────────────────────────

export default function QrLinkDetailPage({ id }: { id: string }) {
  const { getLinkById, fetchClickEvents } = useQrLinkStore()
  const link = getLinkById(id)

  const [events, setEvents] = useState<ClickEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [downloadingQr, setDownloadingQr] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)

  useEffect(() => {
    let cancelled = false
    setEventsLoading(true)
    fetchClickEvents(id)
      .then((data) => { if (!cancelled) setEvents(data) })
      .catch(() => { if (!cancelled) setEvents([]) })
      .finally(() => { if (!cancelled) setEventsLoading(false) })
    return () => { cancelled = true }
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
    <>
      <ContentLayout
        header={
          <Header
            variant="h1"
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  variant="normal"
                  onClick={() => setEditModalVisible(true)}
                >
                  Edit
                </Button>
                <Button
                  variant="primary"
                  loading={downloadingQr}
                  onClick={handleDownloadQr}
                >
                  Download QR Code
                </Button>
              </SpaceBetween>
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
                  <Box variant="awsui-key-label">Short Link</Box>
                  <CopyToClipboard
                    copyButtonAriaLabel="Copy short link"
                    copyErrorText="Failed to copy"
                    copySuccessText="Copied"
                    textToCopy={`${BASE_URL}/go/${link.code}`}
                    variant="inline"
                  />
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

      {editModalVisible && (
        <EditQrLinkModal
          link={link}
          onDismiss={() => setEditModalVisible(false)}
        />
      )}
    </>
  )
}
