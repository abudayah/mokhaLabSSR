"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import Table, { TableProps } from "@cloudscape-design/components/table"
import Box from "@cloudscape-design/components/box"
import Button from "@cloudscape-design/components/button"
import CollectionPreferences, { CollectionPreferencesProps } from "@cloudscape-design/components/collection-preferences"
import Header from "@cloudscape-design/components/header"
import TextFilter from "@cloudscape-design/components/text-filter"
import Select from "@cloudscape-design/components/select"
import SpaceBetween from "@cloudscape-design/components/space-between"
import StatusIndicator from "@cloudscape-design/components/status-indicator"
import Link from "@cloudscape-design/components/link"
import { useBlogPostStore } from "@/app/admin/_components/context/useBlogPostStore"
import { useNotifications } from "@/app/admin/_components/context/NotificationContext"
import DeleteConfirmModal from "@/app/admin/_components/DeleteConfirmModal"
import { useTablePreferences } from "@/app/admin/_components/hooks/useTablePreferences"
import type { BlogPost } from "@/lib/blog-posts"
import { useAppLayout } from "@/app/admin/_components/context/AppLayoutContext"

// ─── Column config ────────────────────────────────────────────────────────────

const ALL_COLUMN_IDS = ["title", "status", "slug", "date", "actions"]

const COLUMN_DISPLAY: CollectionPreferencesProps.VisibleContentOption[] = [
  { id: "title", label: "Title", editable: false },
  { id: "slug", label: "Slug" },
  { id: "date", label: "Published At" },
  { id: "status", label: "Status" },
  { id: "actions", label: "Actions", editable: false },
]

type SortField = "title" | "date" | "status"

// ─── Status filter options ────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
]

// ─── Static column definitions (actions cell injected at render time) ─────────

const BASE_COLUMN_DEFS: TableProps.ColumnDefinition<BlogPost>[] = [
  {
    id: "title",
    header: "Title",
    cell: (item) => (
      <Link href={`/blog/${item.slug}`} external>
        {item.title}
      </Link>
    ),
    sortingField: "title",
    isRowHeader: true,
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
    id: "actions",
    header: "Actions",
    cell: () => null, // overridden below with router injected
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
    visibleColumnIds,
    setVisibleColumnIds,
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
      addNotification({
        type: "success",
        content: `"${deleteTarget.title}" was deleted successfully.`,
        dismissible: true,
      })
    } catch {
      addNotification({
        type: "error",
        content: "Failed to delete post. Please try again.",
        dismissible: true,
      })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  // Inject router into the actions column, then filter to visible
  const columnDefinitions = BASE_COLUMN_DEFS
    .map((col) => {
      if (col.id === "actions") {
        return {
          ...col,
          cell: (item: BlogPost) => (
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="inline-link"
                ariaLabel={`Edit ${item.title}`}
                onClick={() => router.push(`/admin/blog/${item.id}/edit`)}
              >
                Edit
              </Button>
              <Button
                variant="inline-link"
                ariaLabel={`Delete ${item.title}`}
                onClick={() => setDeleteTarget(item)}
              >
                Delete
              </Button>
            </SpaceBetween>
          ),
        }
      }
      return col
    })
    .filter((col) => visibleColumnIds.includes(col.id!))

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
        items={sorted}
        sortingColumn={sortingColumn}
        sortingDescending={sortingDescending}
        onSortingChange={({ detail }) => onSortingChange(detail)}
        filter={
          <SpaceBetween direction="horizontal" size="xs">
            <TextFilter
              filteringText={filterText}
              filteringPlaceholder="Find posts"
              filteringAriaLabel="Filter posts"
              onChange={({ detail }) => setFilterText(detail.filteringText)}
            />
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
            onConfirm={({ detail }) => {
              if (detail.visibleContent) setVisibleColumnIds([...detail.visibleContent])
            }}
            visibleContentPreference={{
              title: "Visible columns",
              options: [{ label: "Columns", options: COLUMN_DISPLAY }],
            }}
            preferences={{ visibleContent: visibleColumnIds }}
          />
        }
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={`(${posts.length})`}
            description={
              draftCount > 0
                ? `${draftCount} draft${draftCount > 1 ? "s" : ""} not yet published`
                : undefined
            }
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="primary" onClick={() => router.push("/admin/blog/new")}>
                  Create post
                </Button>
              </SpaceBetween>
            }
          >
            Blog Posts
          </Header>
        }
        empty={
          <Box textAlign="center" color="inherit">
            <Box variant="strong" textAlign="center" color="inherit">
              No posts
            </Box>
            <Box variant="p" padding={{ bottom: "s" }} color="inherit">
              No posts to display.
            </Box>
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
