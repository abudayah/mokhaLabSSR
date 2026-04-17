"use client"

import Modal from "@cloudscape-design/components/modal"
import Box from "@cloudscape-design/components/box"
import SpaceBetween from "@cloudscape-design/components/space-between"
import Button from "@cloudscape-design/components/button"

interface DeleteConfirmModalProps {
  visible: boolean
  postTitle: string
  onConfirm: () => void
  onDismiss: () => void
}

export default function DeleteConfirmModal({
  visible,
  postTitle,
  onConfirm,
  onDismiss,
}: DeleteConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      header="Delete post"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onConfirm}>
              Delete
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      Are you sure you want to delete <strong>{postTitle}</strong>? This action cannot be undone.
    </Modal>
  )
}
