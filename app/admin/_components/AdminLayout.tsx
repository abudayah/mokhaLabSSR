"use client"

import { useRouter, usePathname } from "next/navigation"
import AppLayout from "@cloudscape-design/components/app-layout"
import TopNavigation from "@cloudscape-design/components/top-navigation"
import SideNavigation from "@cloudscape-design/components/side-navigation"
import Flashbar from "@cloudscape-design/components/flashbar"
import { signOut } from "aws-amplify/auth"
import { useNotifications } from "./context/NotificationContext"

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { notifications } = useNotifications()
  const router = useRouter()
  const pathname = usePathname()

  // Match /admin/blog and sub-routes (edit, new) to the Blog Posts nav item
  function getActiveHref(path: string): string {
    if (path.startsWith("/admin/blog")) return "/admin/blog"
    if (path.startsWith("/admin/qr-links")) return "/admin/qr-links"
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
      <div id="admin-top-nav">
        <TopNavigation
          identity={{
            href: "/admin",
            title: "mokhaLab Admin",
          }}
          utilities={[
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
        headerSelector="#admin-top-nav"
        navigation={
          <SideNavigation
            header={{ text: "Admin", href: "/admin" }}
            activeHref={activeHref}
            items={[
              { type: "link", text: "Dashboard", href: "/admin" },
              { type: "link", text: "Blog Posts", href: "/admin/blog" },
              { type: "link", text: "QR Links", href: "/admin/qr-links" },
              {
                type: "link",
                text: "Products",
                href: "#",
                info: (
                  <span style={{ color: "#aab7b8", fontSize: "12px" }}>
                    Coming soon
                  </span>
                ),
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
        notifications={<Flashbar items={notifications} />}
        content={children}
      />
    </>
  )
}
