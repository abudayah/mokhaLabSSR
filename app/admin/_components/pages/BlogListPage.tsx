"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Table, { TableProps } from "@cloudscape-design/components/table"
import Box from "@cloudscape-design/components/box"
import Button from "@cloudscape-design/components/button"
import Header from "@cloudscape-design/components/header"
import TextFilter from "@cloudscape-design/components/text-filter"
import SpaceBetween from "@cloudscape-design/components/space-between"
import ContentLayout from "@cloudscape-design/components/content-layout"
import { useBlogPostStore } from "@/app/admin/_components/context/useBlogPostStore"
import { useNotifications } from "@/app/admin/_components/context/NotificationContext"
import DeleteConfirmModal from "@/app/admin/_components/DeleteConfirmModal"
import type { BlogPost } from "@/lib/blog-posts"

type SortField = "title" | "date"

const columnDefinitions: TableProps.ColumnDefinition<BlogPost>[] = [
  {
    id: "title",
    header: "Title",
    cell: (item) => (
      <a
        href={`/blog/${item.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#0972d3", textDecoration: "none" }}
      >
        {item.title}
      </a>
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
    header: "Date",
    cell: (item) => item.date,
    sortingField: "date",
  },
  {
    id: "actions",
    header: "Actions",
    // placeholder — overridden below with navigate injected
    cell: () => null,
  },
]

export default function BlogListPage() {
  const { posts, loading, deletePost } = useBlogPostStore()
  const { addNotification } = useNotifications()
  const router = useRouter()

  const [filterText, setFilterText] = useState("")
  const [sortingColumn, setSortingColumn] = useState<TableProps.SortingColumn<BlogPost>>({
    sortingField: "date",
  })
  const [sortingDescending, setSortingDescending] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => {
    const lower = filterText.toLowerCase()
    return posts.filter((p) => p.title.toLowerCase().includes(lower))
  }, [posts, filterText])

  const sorted = useMemo(() => {
    const field = (sortingColumn.sortingField ?? "date") as SortField
    return [...filtered].sort((a, b) => {
      const valA = field === "title" ? a.title : a.date
      const valB = field === "title" ? b.title : b.date
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

  // Inject router into the actions column
  const columns = columnDefinitions.map((col) => {
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

  return (
    <ContentLayout header={<Header variant="h1">Blog Posts</Header>}>
      <Table
        variant="full-page"
        loading={loading}
        loadingText="Loading posts…"
        trackBy="id"
        columnDefinitions={columns}
        items={sorted}
        sortingColumn={sortingColumn}
        sortingDescending={sortingDescending}
        onSortingChange={({ detail }) => {
          setSortingColumn(detail.sortingColumn)
          setSortingDescending(detail.isDescending ?? false)
        }}
        filter={
          <TextFilter
            filteringText={filterText}
            filteringPlaceholder="Find posts"
            filteringAriaLabel="Filter posts"
            onChange={({ detail }) => setFilterText(detail.filteringText)}
          />
        }
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={`(${posts.length})`}
            actions={
              <Button variant="primary" onClick={() => router.push("/admin/blog/new")}>
                Create post
              </Button>
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
          onConfirm={handleDeleteConfirm}
          onDismiss={() => !deleting && setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </ContentLayout>
  )
}
