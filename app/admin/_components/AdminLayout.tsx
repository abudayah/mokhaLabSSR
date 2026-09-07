"use client"

import { useRouter, usePathname } from "next/navigation"
import AppLayout from "@cloudscape-design/components/app-layout"
import TopNavigation from "@cloudscape-design/components/top-navigation"
import SideNavigation from "@cloudscape-design/components/side-navigation"
import Flashbar from "@cloudscape-design/components/flashbar"
import { signOut } from "aws-amplify/auth"
import { useNotifications } from "./context/NotificationContext"
import { useAppLayout } from "./context/AppLayoutContext"

const TOP_NAV_ID = "admin-top-nav"

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { notifications } = useNotifications()
  const { contentType } = useAppLayout()
  const router = useRouter()
  const pathname = usePathname()

  function getActiveHref(path: string): string {
    if (path.startsWith("/admin/blog")) return "/admin/blog"
    if (path.startsWith("/admin/qr-links")) return "/admin/qr-links"
    if (path.startsWith("/admin/support")) return "/admin/support"
    if (path.startsWith("/admin/products")) return "/admin/products"
    if (path === "/admin" || path === "/admin/") return "/admin"
    return path
  }

  const activeHref = getActiveHref(pathname)

  async function handleSignOut() {
    await signOut()
    router.push("/admin/login")
  }

  return (
    <>
      {/* TopNavigation must sit outside AppLayout in the DOM */}
      <div id={TOP_NAV_ID} style={{ position: "sticky", top: 0, zIndex: 1000 }}>
        <TopNavigation
          identity={{
            href: "/admin",
            title: "mokhaLab Admin",
          }}
          utilities={[
            {
              type: "button",
              text: "View site",
              href: "/",
              external: true,
              externalIconAriaLabel: "Opens in a new tab",
            },
            {
              type: "button",
              text: "Sign out",
              onClick: handleSignOut,
            },
          ]}
        />
      </div>
      <AppLayout
        toolsHide
        stickyNotifications
        contentType={contentType}
        headerSelector={`#${TOP_NAV_ID}`}
        navigation={
          <SideNavigation
            header={{ text: "Admin", href: "/admin" }}
            activeHref={activeHref}
            items={[
              { type: "link", text: "Dashboard", href: "/admin" },
              { type: "divider" },
              {
                type: "section-group",
                title: "Content",
                items: [
                  { type: "link", text: "Blog Posts", href: "/admin/blog" },
                  { type: "link", text: "Products", href: "/admin/products" },
                ],
              },
              {
                type: "section-group",
                title: "Tools",
                items: [
                  { type: "link", text: "QR Links", href: "/admin/qr-links" },
                  { type: "link", text: "Support", href: "/admin/support" },
                ],
              },
            ]}
            onFollow={(e) => {
              e.preventDefault()
              if (e.detail.href !== "#") {
                router.push(e.detail.href)
              }
            }}
          />
        }
        notifications={<Flashbar items={notifications} stackItems />}
        content={children}
      />
    </>
  )
}
