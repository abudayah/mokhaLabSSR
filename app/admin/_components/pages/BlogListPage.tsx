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
import { useBlogPostStore } from "@/app/admin/_components/context/useBlogPostStore"
import { useNotifications } from "@/app/admin/_components/context/NotificationContext"
import DeleteConfirmModal from "@/app/admin/_components/DeleteConfirmModal"
import { useTablePreferences } from "@/app/admin/_components/hooks/useTablePreferences"
import type { BlogPost } from "@/lib/blog-posts"
import { useAppLayout } from "@/app/admin/_components/context/AppLayoutContext"

// ─── Column config ────────────────────────────────────────────────────────────

const ALL_COLUMN_IDS = ["title", "status", "slug", "date", "actions"]

const CONTENT_DISPLAY_OPTIONS: CollectionPreferencesProps.ContentDisplayOption[] = [
  { id: "title", label: "Title", alwaysVisible: true },
  { id: "status", label: "Status" },
  { id: "slug", label: "Slug" },
  { id: "date", label: "Published At" },
  { id: "actions", label: "Actions", alwaysVisible: true },
]

type SortField = "title" | "date" | "status"

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
]

// ─── Column definitions (title + actions injected at render time) ─────────────

const BASE_COLUMN_DEFS: TableProps.ColumnDefinition<BlogPost>[] = [
  {
    id: "title",
    header: "Title",
    cell: () => null,
    sortingField: "title",
    isRowHeader: true,
  },
  {
    id: "status",
    header: "Status",
    cell: (item) =>
      item.status === "published" ? (
        <StatusIndicator type="success">Published</StatusIndicator>
      ) : (
        <StatusIndicator type="stopped">Draft</StatusIndicator>
      ),
    sortingField: "status",
  },
  {
    id: "slug",
    header: "Slug",
    cell: (item) => item.slug,
  },
  {
    id: "date",
    header: "Published At",
    cell: (item) => item.date,
    sortingField: "date",
  },
  {
    id: "actions",
    header: "Actions",
    cell: () => null,
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function BlogListPage() {
  const { posts, loading, deletePost } = useBlogPostStore()
  const { addNotification } = useNotifications()
  const { setContentType } = useAppLayout()
  const router = useRouter()

  useEffect(() => { setContentType("table") }, [setContentType])

  const [filterText, setFilterText] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null)
  const [deleting, setDeleting] = useState(false)

  const {
    sortingColumn,
    sortingDescending,
    onSortingChange,
    contentDisplay,
    wrapLines,
    stripedRows,
    contentDensity,
    stickyLastColumns,
    onPreferencesConfirm,
  } = useTablePreferences<BlogPost>({
    storageKey: "blog-posts",
    defaultSortingField: "date",
    defaultSortingDescending: true,
    allColumnIds: ALL_COLUMN_IDS,
  })

  const filtered = useMemo(() => {
    const lower = filterText.toLowerCase()
    return posts.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false
      if (lower && !p.title.toLowerCase().includes(lower)) return false
      return true
    })
  }, [posts, filterText, statusFilter])

  const sorted = useMemo(() => {
    const field = (sortingColumn.sortingField ?? "date") as SortField
    return [...filtered].sort((a, b) => {
      const valA = field === "title" ? a.title : field === "status" ? a.status : a.date
      const valB = field === "title" ? b.title : field === "status" ? b.status : b.date
      const cmp = valA.localeCompare(valB)
      return sortingDescending ? -cmp : cmp
    })
  }, [filtered, sortingColumn, sortingDescending])

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deletePost(deleteTarget.id)
      addNotification({ type: "success", content: `"${deleteTarget.title}" was deleted successfully.`, dismissible: true })
    } catch {
      addNotification({ type: "error", content: "Failed to delete post. Please try again.", dismissible: true })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  // Inject cells, order by contentDisplay
  const columnDefinitions = contentDisplay
    .filter((c) => c.visible)
    .map(({ id }) => {
      const base = BASE_COLUMN_DEFS.find((c) => c.id === id)!
      if (id === "title") {
        return {
          ...base,
          cell: (item: BlogPost) => (
            <Button variant="inline-link" ariaLabel={`Edit ${item.title}`} onClick={() => router.push(`/admin/blog/${item.id}/edit`)}>
              {item.title}
            </Button>
          ),
        }
      }
      if (id === "actions") {
        return {
          ...base,
          cell: (item: BlogPost) => (
            <ButtonDropdown
              variant="inline-icon"
              ariaLabel={`Actions for ${item.title}`}
              expandToViewport
              items={[
                { id: "view", text: "View on blog", iconName: "external" },
                { id: "edit", text: "Edit", iconName: "edit" },
                { id: "delete", text: "Delete", iconName: "remove" },
              ]}
              onItemClick={({ detail }) => {
                if (detail.id === "view") window.open(`/blog/${item.slug}`, "_blank")
                else if (detail.id === "edit") router.push(`/admin/blog/${item.id}/edit`)
                else if (detail.id === "delete") setDeleteTarget(item)
              }}
            />
          ),
        }
      }
      return base
    })

  const draftCount = posts.filter((p) => p.status === "draft").length

  return (
    <>
      <Table
        variant="full-page"
        enableKeyboardNavigation
        loading={loading}
        loadingText="Loading posts…"
        trackBy="id"
        columnDefinitions={columnDefinitions}
        columnDisplay={contentDisplay}
        items={sorted}
        wrapLines={wrapLines}
        stripedRows={stripedRows}
        contentDensity={contentDensity}
        stickyColumns={{ last: stickyLastColumns }}
        sortingColumn={sortingColumn}
        sortingDescending={sortingDescending}
        onSortingChange={({ detail }) => onSortingChange(detail)}
        filter={
          <SpaceBetween direction="horizontal" size="xs">
            <TextFilter filteringText={filterText} filteringPlaceholder="Find posts" filteringAriaLabel="Filter posts" onChange={({ detail }) => setFilterText(detail.filteringText)} />
            <Select
              selectedOption={STATUS_OPTIONS.find((o) => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
              options={STATUS_OPTIONS}
              onChange={({ detail }) => setStatusFilter(detail.selectedOption.value ?? "all")}
              ariaLabel="Filter by status"
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
            counter={`(${posts.length})`}
            description={draftCount > 0 ? `${draftCount} draft${draftCount > 1 ? "s" : ""} not yet published` : undefined}
            actions={
              <Button variant="primary" onClick={() => router.push("/admin/blog/new")}>Create post</Button>
            }
          >
            Blog Posts
          </Header>
        }
        empty={
          <Box textAlign="center" color="inherit">
            <Box variant="strong" textAlign="center" color="inherit">No posts</Box>
            <Box variant="p" padding={{ bottom: "s" }} color="inherit">No posts to display.</Box>
            <Button onClick={() => router.push("/admin/blog/new")}>Create post</Button>
          </Box>
        }
        ariaLabels={{
          tableLabel: "Blog posts table",
          activateEditLabel: (col) => `Edit ${String(col.header)}`,
          cancelEditLabel: (col) => `Cancel editing ${String(col.header)}`,
          submitEditLabel: (col) => `Submit edit ${String(col.header)}`,
          allItemsSelectionLabel: () => "Select all posts",
          itemSelectionLabel: (_, item) => item.title,
        }}
      />

      {deleteTarget && (
        <DeleteConfirmModal
          visible={true}
          itemName={deleteTarget.title}
          resourceType="post"
          onConfirm={handleDeleteConfirm}
          onDismiss={() => !deleting && setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </>
  )
}
