"use client"

import { BlogPostStoreProvider } from "./context/BlogPostStoreContext"
import { NotificationProvider } from "./context/NotificationContext"

/**
 * Wraps all admin pages with the required context providers.
 * AmplifyProvider is handled separately in the layout to ensure
 * Amplify is configured before any data clients are created.
 */
export default function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <BlogPostStoreProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </BlogPostStoreProvider>
  )
}
