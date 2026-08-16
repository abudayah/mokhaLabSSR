"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Table, { TableProps } from "@cloudscape-design/components/table"
import Box from "@cloudscape-design/components/box"
import Button from "@cloudscape-design/components/button"
import Header from "@cloudscape-design/components/header"
import SpaceBetween from "@cloudscape-design/components/space-between"
import Link from "@cloudscape-design/components/link"
import { useProductStore } from "@/app/admin/_components/context/useProductStore"
import { useNotifications } from "@/app/admin/_components/context/NotificationContext"
import DeleteConfirmModal from "@/app/admin/_components/DeleteConfirmModal"
import type { ProductDB } from "@/lib/products-db"

const columnDefinitions: TableProps.ColumnDefinition<ProductDB>[] = [
  {
    id: "name",
    header: "Name",
    cell: (item) => (
      <Link href={`/products/${item.slug}`} external>
        {item.name}
      </Link>
    ),
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
  },
]

export default function ProductListPage() {
  const { products, loading, deleteProducts } = useProductStore()
  const { addNotification } = useNotifications()
  const router = useRouter()

  const [selectedItems, setSelectedItems] = useState<ProductDB[]>([])
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [sortingColumn, setSortingColumn] = useState<TableProps.SortingColumn<ProductDB>>({
    sortingField: "name",
  })
  const [sortingDescending, setSortingDescending] = useState(false)

  const hasSelection = selectedItems.length > 0

  async function handleDeleteConfirm() {
    if (selectedItems.length === 0) return
    setDeleting(true)
    const ids = selectedItems.map((p) => p.id)
    const names = selectedItems.map((p) => p.name).join(", ")
    try {
      await deleteProducts(ids)
      addNotification({
        type: "success",
        content:
          selectedItems.length === 1
            ? `"${selectedItems[0].name}" was deleted successfully.`
            : `${selectedItems.length} products were deleted successfully.`,
        dismissible: true,
      })
      setSelectedItems([])
    } catch {
      addNotification({
        type: "error",
        content: `Failed to delete ${selectedItems.length === 1 ? `"${names}"` : `${selectedItems.length} products`}. Please try again.`,
        dismissible: true,
      })
    } finally {
      setDeleting(false)
      setDeleteModalVisible(false)
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
        items={products}
        selectionType="multi"
        selectedItems={selectedItems}
        onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
        sortingColumn={sortingColumn}
        sortingDescending={sortingDescending}
        onSortingChange={({ detail }) => {
          setSortingColumn(detail.sortingColumn)
          setSortingDescending(detail.isDescending ?? false)
        }}
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={
              selectedItems.length > 0
                ? `(${selectedItems.length}/${products.length})`
                : `(${products.length})`
            }
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  disabled={!hasSelection}
                  onClick={() => {
                    if (selectedItems.length > 0) {
                      router.push(`/admin/products/${selectedItems[0].id}/edit`)
                    }
                  }}
                >
                  Edit
                </Button>
                <Button
                  disabled={!hasSelection}
                  onClick={() => setDeleteModalVisible(true)}
                >
                  Delete
                </Button>
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

      {deleteModalVisible && selectedItems.length > 0 && (
        <DeleteConfirmModal
          visible={deleteModalVisible}
          itemName={selectedItems[0].name}
          itemCount={selectedItems.length > 1 ? selectedItems.length : undefined}
          itemNames={selectedItems.length > 1 ? selectedItems.map((p) => p.name) : undefined}
          resourceType="product"
          onConfirm={handleDeleteConfirm}
          onDismiss={() => !deleting && setDeleteModalVisible(false)}
          loading={deleting}
        />
      )}
    </>
  )
}
