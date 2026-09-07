"use client"

import { BlogPostStoreProvider } from "./context/BlogPostStoreContext"
import { QrLinkStoreProvider } from "./context/QrLinkStoreContext"
import { SupportTicketStoreProvider } from "./context/SupportTicketStoreContext"
import { ProductStoreProvider } from "./context/ProductStoreContext"
import { NotificationProvider } from "./context/NotificationContext"
import { AppLayoutProvider } from "./context/AppLayoutContext"

/**
 * Wraps all admin pages with the required context providers.
 * AmplifyProvider is handled separately in the layout to ensure
 * Amplify is configured before any data clients are created.
 */
export default function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <BlogPostStoreProvider>
      <ProductStoreProvider>
        <QrLinkStoreProvider>
          <SupportTicketStoreProvider>
            <NotificationProvider>
              <AppLayoutProvider>{children}</AppLayoutProvider>
            </NotificationProvider>
          </SupportTicketStoreProvider>
        </QrLinkStoreProvider>
      </ProductStoreProvider>
    </BlogPostStoreProvider>
  )
}
