import "@cloudscape-design/global-styles/index.css"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import AmplifyProvider from "./_components/AmplifyProvider"

export const metadata: Metadata = {
  title: "mokhaLab Admin",
}

/**
 * Root admin layout — configures Amplify and injects Cloudscape global styles.
 * The AdminLayout shell (AppLayout + nav) is applied only to protected routes
 * via the (portal) route group layout.
 */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <AmplifyProvider>{children}</AmplifyProvider>
}
