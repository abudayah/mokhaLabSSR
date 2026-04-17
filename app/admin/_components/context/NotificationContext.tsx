"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import type { FlashbarProps } from "@cloudscape-design/components/flashbar"

type NotificationItem = FlashbarProps.MessageDefinition

interface NotificationContextValue {
  notifications: NotificationItem[]
  addNotification: (item: NotificationItem) => void
  removeNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const addNotification = useCallback(
    (item: NotificationItem) => {
      const id = item.id ?? `notification-${Date.now()}`
      const notification: NotificationItem = {
        ...item,
        id,
        onDismiss: () => removeNotification(id),
      }
      setNotifications((prev) => [...prev, notification])

      // Auto-dismiss success notifications after 5 seconds
      if (item.type === "success") {
        setTimeout(() => removeNotification(id), 5000)
      }
    },
    [removeNotification]
  )

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider")
  return ctx
}
