"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useForm, get } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CInput } from "react-hook-form-cloudscape"
import { useAppLayout } from "@/app/admin/_components/context/AppLayoutContext"
import Table, { TableProps } from "@cloudscape-design/components/table"
import Box from "@cloudscape-design/components/box"
import Button from "@cloudscape-design/components/button"
import ButtonDropdown from "@cloudscape-design/components/button-dropdown"
import CollectionPreferences, { CollectionPreferencesProps } from "@cloudscape-design/components/collection-preferences"
import CopyToClipboard from "@cloudscape-design/components/copy-to-clipboard"
import Header from "@cloudscape-design/components/header"
import SpaceBetween from "@cloudscape-design/components/space-between"
import Modal from "@cloudscape-design/components/modal"
import Form from "@cloudscape-design/components/form"
import FormField from "@cloudscape-design/components/form-field"
import { useQrLinkStore } from "@/app/admin/_components/context/useQrLinkStore"
import { useNotifications } from "@/app/admin/_components/context/NotificationContext"
import { generateQrSvg, downloadQrSvg } from "@/app/admin/_components/utils/qrCodeUtils"
import { shortLinkSchema } from "@/app/admin/_components/schemas/shortLinkSchema"
import type { QrLinkFormData } from "@/app/admin/_components/schemas/shortLinkSchema"
import { useTablePreferences } from "@/app/admin/_components/hooks/useTablePreferences"
import type { QrLink } from "@/lib/short-links"

const BASE_URL = "https://mokhalab.com"

// ─── Column definitions ───────────────────────────────────────────────────────

const ALL_COLUMN_IDS = ["label", "shortLink", "destinationUrl", "clickCount", "lastClickedAt", "actions"]

const CONTENT_DISPLAY_OPTIONS: CollectionPreferencesProps.ContentDisplayOption[] = [
  { id: "label", label: "Label", alwaysVisible: true },
  { id: "shortLink", label: "Short Link" },
  { id: "destinationUrl", label: "Destination URL" },
  { id: "clickCount", label: "Clicks" },
  { id: "lastClickedAt", label: "Last Clicked" },
  { id: "actions", label: "Actions", alwaysVisible: true },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLastClicked(value?: string): string {
  if (!value) return "Never"
  return new Date(value).toLocaleString()
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
    resolver: zodResolver(shortLinkSchema),
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
      addNotification({ type: "success", content: "Short Link created.", dismissible: true })
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
      header="Create Short Link"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" formAction="none" onClick={handleDismiss}>Cancel</Button>
            <Button variant="primary" formAction="submit" form="create-short-link-form" loading={isSubmitting}>
              Create
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <form id="create-short-link-form" onSubmit={handleSubmit(onSubmit)} noValidate>
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
      addNotification({ type: "success", content: "Short Link updated.", dismissible: true })
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
      header="Edit Short Link"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" formAction="none" onClick={onDismiss}>Cancel</Button>
            <Button variant="primary" formAction="submit" form="edit-short-link-form" loading={isSubmitting}>Save</Button>
          </SpaceBetween>
        </Box>
      }
    >
      <form id="edit-short-link-form" onSubmit={handleSubmit(onSubmit)} noValidate>
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
      addNotification({ type: "success", content: "Short Link deleted.", dismissible: true })
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
      header="Delete Short Link"
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

export default function ShortLinksListPage() {
  const { links, loading } = useQrLinkStore()
  const { setContentType } = useAppLayout()
  const router = useRouter()

  useEffect(() => { setContentType("table") }, [setContentType])

  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [editTarget, setEditTarget] = useState<QrLink | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<QrLink | null>(null)

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
  } = useTablePreferences<QrLink>({
    storageKey: "short-links",
    defaultSortingField: "createdAt",
    defaultSortingDescending: true,
    allColumnIds: ALL_COLUMN_IDS,
  })

  // Client-side sort (store data is unsorted)
  const sorted = useMemo(() => {
    const field = (sortingColumn.sortingField ?? "createdAt") as keyof QrLink
    return [...links].sort((a, b) => {
      const valA = String(a[field] ?? "")
      const valB = String(b[field] ?? "")
      const cmp = valA.localeCompare(valB)
      return sortingDescending ? -cmp : cmp
    })
  }, [links, sortingColumn, sortingDescending])

  const allColumnDefinitions: TableProps.ColumnDefinition<QrLink>[] = [
    {
      id: "label",
      header: "Label",
      cell: (item) => (
        <Button variant="inline-link" onClick={() => router.push(`/admin/short-links/${item.id}`)}>
          {item.label ?? item.code}
        </Button>
      ),
      sortingField: "label",
      isRowHeader: true,
      width: columnWidths["label"],
      minWidth: 120,
    },    {
      id: "shortLink",
      header: "Short Link",
      cell: (item) => (
        <CopyToClipboard
          copyButtonAriaLabel="Copy short link"
          copyErrorText="Failed to copy"
          copySuccessText="Copied"
          textToCopy={`${BASE_URL}/go/${item.code}`}
          variant="inline"
        />
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
          expandToViewport
          items={[
            { id: "view", text: "View details", iconName: "zoom-in" },
            { id: "shortlink", text: "View short link", iconName: "external" },
            { id: "edit", text: "Edit", iconName: "edit" },
            { id: "download", text: "Download QR Code", iconName: "download" },
            { id: "delete", text: "Delete", iconName: "remove" },
          ]}
          onItemClick={async ({ detail }) => {
            if (detail.id === "view") {
              router.push(`/admin/short-links/${item.id}`)
            } else if (detail.id === "shortlink") {
              window.open(`${BASE_URL}/go/${item.code}`, "_blank")
            } else if (detail.id === "edit") {
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

  const columnDefinitions = allColumnDefinitions.filter((col) =>
    contentDisplay.find((c) => c.id === col.id)?.visible ?? true
  )

  return (
    <>
      <Table
        variant="full-page"
        trackBy="id"
        loading={loading}
        loadingText="Loading QR links…"
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
            counter={`(${links.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="primary" onClick={() => setCreateModalVisible(true)}>
                  Create Short Link
                </Button>
              </SpaceBetween>
            }
          >
            Short Links
          </Header>
        }
        empty={
          <Box textAlign="center" color="inherit">
            <Box variant="strong" textAlign="center" color="inherit">No Short Links</Box>
            <Box variant="p" padding={{ bottom: "s" }} color="inherit">No Short Links to display.</Box>
            <Button onClick={() => setCreateModalVisible(true)}>Create Short Link</Button>
          </Box>
        }
        ariaLabels={{
          tableLabel: "Short Links table",
          activateEditLabel: (col) => `Edit ${String(col.header)}`,
          cancelEditLabel: (col) => `Cancel editing ${String(col.header)}`,
          submitEditLabel: (col) => `Submit edit ${String(col.header)}`,
          allItemsSelectionLabel: () => "Select all Short Links",
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
