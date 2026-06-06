"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, get } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CInput } from "react-hook-form-cloudscape"
import Table, { TableProps } from "@cloudscape-design/components/table"
import Box from "@cloudscape-design/components/box"
import Button from "@cloudscape-design/components/button"
import ButtonDropdown from "@cloudscape-design/components/button-dropdown"
import Header from "@cloudscape-design/components/header"
import SpaceBetween from "@cloudscape-design/components/space-between"
import Modal from "@cloudscape-design/components/modal"
import Form from "@cloudscape-design/components/form"
import FormField from "@cloudscape-design/components/form-field"
import { useQrLinkStore } from "@/app/admin/_components/context/useQrLinkStore"
import { useNotifications } from "@/app/admin/_components/context/NotificationContext"
import { generateQrSvg, downloadQrSvg } from "@/app/admin/_components/utils/qrCodeUtils"
import { qrLinkSchema } from "@/app/admin/_components/schemas/qrLinkSchema"
import type { QrLinkFormData } from "@/app/admin/_components/schemas/qrLinkSchema"
import type { QrLink } from "@/lib/qr-links"

const BASE_URL = "https://www.mokhalab.com"
const COL_WIDTHS_KEY = "qr-links-table-col-widths"

// ─── Column width persistence ─────────────────────────────────────────────────

function loadColWidths(): Record<string, number> {
  try {
    const raw = localStorage.getItem(COL_WIDTHS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveColWidths(widths: Record<string, number>) {
  try {
    localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(widths))
  } catch {
    // ignore storage errors
  }
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

interface CreateQrLinkModalProps {
  visible: boolean
  onDismiss: () => void
}

function CreateQrLinkModal({ visible, onDismiss }: CreateQrLinkModalProps) {
  const { createLink } = useQrLinkStore()
  const { addNotification } = useNotifications()
  const [fetchingTitle, setFetchingTitle] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<QrLinkFormData>({
    resolver: zodResolver(qrLinkSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { destinationUrl: "", label: "", customCode: "" },
  })

  function handleDismiss() {
    reset()
    onDismiss()
  }

  async function handleUrlBlur() {
    const url = getValues("destinationUrl")
    if (!url) return
    const currentLabel = getValues("label")
    if (currentLabel && currentLabel.trim() !== "") return
    try { new URL(url) } catch { return }

    setFetchingTitle(true)
    try {
      const res = await fetch(`/api/fetch-title?url=${encodeURIComponent(url)}`)
      const { title } = await res.json()
      if (title && !getValues("label")) {
        setValue("label", title, { shouldValidate: true, shouldDirty: true })
      }
    } catch {
      // ignore
    } finally {
      setFetchingTitle(false)
    }
  }

  async function onSubmit(data: QrLinkFormData) {
    try {
      await createLink(data)
      addNotification({ type: "success", content: "QR Link created.", dismissible: true })
      reset()
      onDismiss()
    } catch (err) {
      addNotification({
        type: "error",
        content: err instanceof Error ? err.message : "Failed to create QR link.",
        dismissible: true,
      })
    }
  }

  return (
    <Modal
      visible={visible}
      onDismiss={handleDismiss}
      header="Create QR Link"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" formAction="none" onClick={handleDismiss}>Cancel</Button>
            <Button variant="primary" formAction="submit" form="create-qr-link-form" loading={isSubmitting}>
              Create
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <form id="create-qr-link-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Form>
          <SpaceBetween size="l">
            <FormField label="Destination URL" errorText={get(errors, "destinationUrl.message")}>
              <CInput control={control} name="destinationUrl" placeholder="https://example.com" onBlur={handleUrlBlur} />
            </FormField>
            <FormField label="Label" errorText={get(errors, "label.message")}>
              <CInput
                control={control}
                name="label"
                placeholder={fetchingTitle ? "Fetching page title…" : "e.g. Summer Campaign"}
                disabled={fetchingTitle}
              />
            </FormField>
            <FormField
              label={<>Custom Short Code <i>- optional</i></>}
              constraintText="Leave blank to auto-generate a 3-character code (scales up if needed)"
              errorText={get(errors, "customCode.message")}
            >
              <CInput control={control} name="customCode" placeholder="e.g. PROMO1" />
            </FormField>
          </SpaceBetween>
        </Form>
      </form>
    </Modal>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

const editSchema = z.object({
  destinationUrl: z.string().min(1, "Destination URL is required").url("Must be a valid HTTP or HTTPS URL"),
  label: z.string().min(1, "Label is required"),
})
type EditFormData = z.infer<typeof editSchema>

interface EditQrLinkModalProps {
  link: QrLink
  onDismiss: () => void
}

function EditQrLinkModal({ link, onDismiss }: EditQrLinkModalProps) {
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
      addNotification({ type: "success", content: "QR Link updated.", dismissible: true })
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

// ─── Delete Modal ─────────────────────────────────────────────────────────────

interface DeleteQrLinkModalProps {
  link: QrLink
  onDismiss: () => void
}

function DeleteQrLinkModal({ link, onDismiss }: DeleteQrLinkModalProps) {
  const { deleteLink } = useQrLinkStore()
  const { addNotification } = useNotifications()
  const [deleting, setDeleting] = useState(false)

  async function handleConfirm() {
    setDeleting(true)
    try {
      await deleteLink(link.id)
      addNotification({ type: "success", content: "QR Link deleted.", dismissible: true })
      onDismiss()
    } catch (err) {
      addNotification({
        type: "error",
        content: err instanceof Error ? err.message : "Failed to delete QR link.",
        dismissible: true,
      })
      setDeleting(false)
    }
  }

  return (
    <Modal
      visible
      onDismiss={() => !deleting && onDismiss()}
      header="Delete QR Link"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" formAction="none" onClick={() => !deleting && onDismiss()}>Cancel</Button>
            <Button variant="primary" loading={deleting} onClick={handleConfirm}>Delete</Button>
          </SpaceBetween>
        </Box>
      }
    >
      <Box>
        Delete short link <strong>{link.code}</strong>? This will permanently remove the link and all click history.
      </Box>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function formatLastClicked(value?: string): string {
  if (!value) return "Never"
  return new Date(value).toLocaleString()
}

export default function QrLinksListPage() {
  const { links, loading } = useQrLinkStore()
  const router = useRouter()

  const [sortingColumn, setSortingColumn] = useState<TableProps.SortingColumn<QrLink>>({ sortingField: "createdAt" })
  const [sortingDescending, setSortingDescending] = useState(true)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [editTarget, setEditTarget] = useState<QrLink | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<QrLink | null>(null)

  // Load column widths from localStorage on mount
  useEffect(() => {
    setColumnWidths(loadColWidths())
  }, [])

  const columnDefinitions: TableProps.ColumnDefinition<QrLink>[] = [
    {
      id: "label",
      header: "Label",
      cell: (item) => (
        <Button variant="inline-link" onClick={() => router.push(`/admin/qr-links/${item.id}`)}>
          {item.label ?? item.code}
        </Button>
      ),
      sortingField: "label",
      isRowHeader: true,
      width: columnWidths["label"],
      minWidth: 120,
    },
    {
      id: "shortLink",
      header: "Short Link",
      cell: (item) => (
        <a
          href={`${BASE_URL}/go/${item.code}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: "monospace", fontSize: "13px" }}
        >
          {BASE_URL}/go/{item.code}
        </a>
      ),
      width: columnWidths["shortLink"],
      minWidth: 200,
    },
    {
      id: "destinationUrl",
      header: "Destination URL",
      cell: (item) => (
        <span
          style={{ maxWidth: 260, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }}
          title={item.destinationUrl}
        >
          {item.destinationUrl}
        </span>
      ),
      width: columnWidths["destinationUrl"],
      minWidth: 160,
    },
    {
      id: "clickCount",
      header: "Clicks",
      cell: (item) => item.clickCount,
      sortingField: "clickCount",
      width: columnWidths["clickCount"],
      minWidth: 80,
    },
    {
      id: "lastClickedAt",
      header: "Last Clicked",
      cell: (item) => formatLastClicked(item.lastClickedAt),
      sortingField: "lastClickedAt",
      width: columnWidths["lastClickedAt"],
      minWidth: 140,
    },
    {
      id: "actions",
      header: "Actions",
      cell: (item) => (
        <ButtonDropdown
          variant="inline-icon"
          ariaLabel={`Actions for ${item.label ?? item.code}`}
          items={[
            { id: "edit", text: "Edit", iconName: "edit" },
            { id: "download", text: "Download QR Code", iconName: "download" },
            { id: "delete", text: "Delete", iconName: "remove" },
          ]}
          onItemClick={async ({ detail }) => {
            if (detail.id === "edit") {
              setEditTarget(item)
            } else if (detail.id === "download") {
              const svg = await generateQrSvg(item.code)
              downloadQrSvg(svg, item.code)
            } else if (detail.id === "delete") {
              setDeleteTarget(item)
            }
          }}
        />
      ),
      width: columnWidths["actions"],
      minWidth: 80,
    },
  ]

  return (
    <>
      <Table
        variant="full-page"
        trackBy="id"
        loading={loading}
        loadingText="Loading QR links…"
        columnDefinitions={columnDefinitions}
        items={links}
        resizableColumns
        onColumnWidthsChange={({ detail }) => {
          const newWidths: Record<string, number> = {}
          detail.widths.forEach((w, i) => {
            const id = columnDefinitions[i]?.id
            if (id) newWidths[id] = w
          })
          setColumnWidths(newWidths)
          saveColWidths(newWidths)
        }}
        sortingColumn={sortingColumn}
        sortingDescending={sortingDescending}
        onSortingChange={({ detail }) => {
          setSortingColumn(detail.sortingColumn)
          setSortingDescending(detail.isDescending ?? false)
        }}
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={`(${links.length})`}
            actions={
              <Button variant="primary" onClick={() => setCreateModalVisible(true)}>
                Create QR Link
              </Button>
            }
          >
            QR Links
          </Header>
        }
        empty={
          <Box textAlign="center" color="inherit">
            <Box variant="strong" textAlign="center" color="inherit">No QR links</Box>
            <Box variant="p" padding={{ bottom: "s" }} color="inherit">No QR links to display.</Box>
            <Button onClick={() => setCreateModalVisible(true)}>Create QR Link</Button>
          </Box>
        }
        ariaLabels={{
          tableLabel: "QR links table",
          activateEditLabel: (col) => `Edit ${String(col.header)}`,
          cancelEditLabel: (col) => `Cancel editing ${String(col.header)}`,
          submitEditLabel: (col) => `Submit edit ${String(col.header)}`,
          allItemsSelectionLabel: () => "Select all QR links",
          itemSelectionLabel: (_, item) => item.label ?? item.code,
        }}
      />

      {createModalVisible && (
        <CreateQrLinkModal visible={createModalVisible} onDismiss={() => setCreateModalVisible(false)} />
      )}
      {editTarget && (
        <EditQrLinkModal link={editTarget} onDismiss={() => setEditTarget(null)} />
      )}
      {deleteTarget && (
        <DeleteQrLinkModal link={deleteTarget} onDismiss={() => setDeleteTarget(null)} />
      )}
    </>
  )
}
