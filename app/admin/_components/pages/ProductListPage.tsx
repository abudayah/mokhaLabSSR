"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import Table, { TableProps } from "@cloudscape-design/components/table"
import Box from "@cloudscape-design/components/box"
import Button from "@cloudscape-design/components/button"
import ButtonDropdown from "@cloudscape-design/components/button-dropdown"
import CollectionPreferences, { CollectionPreferencesProps } from "@cloudscape-design/components/collection-preferences"
import Header from "@cloudscape-design/components/header"
import SpaceBetween from "@cloudscape-design/components/space-between"
import { useProductStore } from "@/app/admin/_components/context/useProductStore"
import { useNotifications } from "@/app/admin/_components/context/NotificationContext"
import DeleteConfirmModal from "@/app/admin/_components/DeleteConfirmModal"
import { useTablePreferences } from "@/app/admin/_components/hooks/useTablePreferences"
import type { ProductDB } from "@/lib/products-db"
import { useAppLayout } from "@/app/admin/_components/context/AppLayoutContext"

// ─── Column config ────────────────────────────────────────────────────────────

const ALL_COLUMN_IDS = ["name", "slug", "priceUSD", "priceCAD", "actions"]

const COLUMN_DISPLAY: CollectionPreferencesProps.VisibleContentOption[] = [
  { id: "name", label: "Name", editable: false },
  { id: "slug", label: "Slug" },
  { id: "priceUSD", label: "USD Price" },
  { id: "priceCAD", label: "CAD Price" },
  { id: "actions", label: "Actions", editable: false },
]

// ─── Column definitions ───────────────────────────────────────────────────────

const BASE_COLUMN_DEFS: TableProps.ColumnDefinition<ProductDB>[] = [
  {
    id: "name",
    header: "Name",
    cell: () => null, // overridden below — navigates to edit
    sortingField: "name",
    isRowHeader: true,
  },
  {
    id: "slug",
    header: "Slug",
    cell: (item) => item.slug,
  },
  {
    id: "priceUSD",
    header: "USD Price",
    cell: (item) => `$${item.priceUSD.toFixed(2)}`,
    sortingField: "priceUSD",
  },
  {
    id: "priceCAD",
    header: "CAD Price",
    cell: (item) => `$${item.priceCAD.toFixed(2)}`,
    sortingField: "priceCAD",
  },
  {
    id: "actions",
    header: "Actions",
    cell: () => null, // overridden below
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductListPage() {
  const { products, loading, deleteProducts } = useProductStore()
  const { addNotification } = useNotifications()
  const { setContentType } = useAppLayout()
  const router = useRouter()

  useEffect(() => { setContentType("table") }, [setContentType])

  const [deleteTarget, setDeleteTarget] = useState<ProductDB | null>(null)
  const [deleting, setDeleting] = useState(false)

  const {
    sortingColumn,
    sortingDescending,
    onSortingChange,
    visibleColumnIds,
    setVisibleColumnIds,
  } = useTablePreferences<ProductDB>({
    storageKey: "products",
    defaultSortingField: "name",
    defaultSortingDescending: false,
    allColumnIds: ALL_COLUMN_IDS,
  })

  // Client-side sort (store returns unsorted data)
  const sorted = useMemo(() => {
    const field = (sortingColumn.sortingField ?? "name") as keyof ProductDB
    return [...products].sort((a, b) => {
      const valA = String(a[field] ?? "")
      const valB = String(b[field] ?? "")
      const cmp = valA.localeCompare(valB)
      return sortingDescending ? -cmp : cmp
    })
  }, [products, sortingColumn, sortingDescending])

  const columnDefinitions = BASE_COLUMN_DEFS
    .map((col) => {
      if (col.id === "name") {
        return {
          ...col,
          cell: (item: ProductDB) => (
            <Button
              variant="inline-link"
              ariaLabel={`Edit ${item.name}`}
              onClick={() => router.push(`/admin/products/${item.id}/edit`)}
            >
              {item.name}
            </Button>
          ),
        }
      }
      if (col.id === "actions") {
        return {
          ...col,
          cell: (item: ProductDB) => (
            <ButtonDropdown
              variant="inline-icon"
              ariaLabel={`Actions for ${item.name}`}
              expandToViewport
              items={[
                { id: "view", text: "View on site", iconName: "external" },
                { id: "edit", text: "Edit", iconName: "edit" },
                { id: "delete", text: "Delete", iconName: "remove" },
              ]}
              onItemClick={({ detail }) => {
                if (detail.id === "view") {
                  window.open(`/products/${item.slug}`, "_blank")
                } else if (detail.id === "edit") {
                  router.push(`/admin/products/${item.id}/edit`)
                } else if (detail.id === "delete") {
                  setDeleteTarget(item)
                }
              }}
            />
          ),
        }
      }
      return col
    })
    .filter((col) => visibleColumnIds.includes(col.id!))

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteProducts([deleteTarget.id])
      addNotification({
        type: "success",
        content: `"${deleteTarget.name}" was deleted successfully.`,
        dismissible: true,
      })
      setDeleteTarget(null)
    } catch {
      addNotification({
        type: "error",
        content: `Failed to delete "${deleteTarget.name}". Please try again.`,
        dismissible: true,
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Table
        variant="full-page"
        enableKeyboardNavigation
        loading={loading}
        loadingText="Loading products…"
        trackBy="id"
        columnDefinitions={columnDefinitions}
        items={sorted}
        sortingColumn={sortingColumn}
        sortingDescending={sortingDescending}
        onSortingChange={({ detail }) => onSortingChange(detail)}
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
            counter={`(${products.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  variant="primary"
                  onClick={() => router.push("/admin/products/new")}
                >
                  Create product
                </Button>
              </SpaceBetween>
            }
          >
            Products
          </Header>
        }
        empty={
          <Box textAlign="center" color="inherit">
            <Box variant="strong" textAlign="center" color="inherit">
              No products
            </Box>
            <Box variant="p" padding={{ bottom: "s" }} color="inherit">
              No products to display.
            </Box>
            <Button onClick={() => router.push("/admin/products/new")}>Create product</Button>
          </Box>
        }
        ariaLabels={{
          tableLabel: "Products table",
          activateEditLabel: (col) => `Edit ${String(col.header)}`,
          cancelEditLabel: (col) => `Cancel editing ${String(col.header)}`,
          submitEditLabel: (col) => `Submit edit ${String(col.header)}`,
          allItemsSelectionLabel: () => "Select all products",
          itemSelectionLabel: (_, item) => item.name,
        }}
      />

      {deleteTarget && (
        <DeleteConfirmModal
          visible={true}
          itemName={deleteTarget.name}
          resourceType="product"
          onConfirm={handleDeleteConfirm}
          onDismiss={() => !deleting && setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </>
  )
}
