import AdminProviders from "../_components/AdminProviders"
import AdminLayout from "../_components/AdminLayout"

// All admin portal pages are dynamic — Cloudscape components require the browser DOM
export const dynamic = "force-dynamic"

/**
 * (portal) route group layout — wraps all authenticated admin pages
 * with data providers and the Cloudscape AppLayout shell.
 * The /admin/login route is intentionally outside this group.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProviders>
      <AdminLayout>{children}</AdminLayout>
    </AdminProviders>
  )
}
