"use client"

import Modal from "@cloudscape-design/components/modal"
import Box from "@cloudscape-design/components/box"
import SpaceBetween from "@cloudscape-design/components/space-between"
import Button from "@cloudscape-design/components/button"

interface DeleteConfirmModalProps {
  visible: boolean
  /** Name of the single item to delete, or the first item's name when deleting multiple */
  itemName: string
  /** When deleting multiple items, pass the total count here */
  itemCount?: number
  /** Names of all items being deleted — shown as a list when deleting multiple */
  itemNames?: string[]
  onConfirm: () => void
  onDismiss: () => void
  loading?: boolean
}

export default function DeleteConfirmModal({
  visible,
  itemName,
  itemCount,
  itemNames,
  onConfirm,
  onDismiss,
  loading,
}: DeleteConfirmModalProps) {
  const isMulti = itemCount !== undefined && itemCount > 1

  const header = isMulti ? `Delete ${itemCount} items?` : "Delete item?"

  const body = isMulti ? (
    <>
      <p>
        Are you sure you want to delete <strong>{itemCount} items</strong>? This action cannot be
        undone.
      </p>
      {itemNames && itemNames.length > 0 && (
        <ul style={{ margin: "8px 0 0", paddingLeft: "20px" }}>
          {itemNames.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
    </>
  ) : (
    <>
      Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone.
    </>
  )

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      header={header}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onConfirm} loading={loading}>
              Delete
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      {body}
    </Modal>
  )
}
