"use client"

import { useRouter, usePathname } from "next/navigation"
import AppLayout from "@cloudscape-design/components/app-layout"
import TopNavigation from "@cloudscape-design/components/top-navigation"
import SideNavigation from "@cloudscape-design/components/side-navigation"
import Flashbar from "@cloudscape-design/components/flashbar"
import Icon from "@cloudscape-design/components/icon"
import { signOut } from "aws-amplify/auth"
import { useNotifications } from "./context/NotificationContext"

const TOP_NAV_ID = "admin-top-nav"

interface AdminLayoutProps {
  children: React.ReactNode
}

/** Icon rendered in the `info` slot to appear before nav item text via CSS flex order trick.
 *  Cloudscape SideNavigation links don't have a native iconName prop, so we use `info`
 *  with a leading icon styled to sit before the text. */
function NavIcon({ name }: { name: Parameters<typeof Icon>[0]["name"] }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", marginRight: 6 }}>
      <Icon name={name} />
    </span>
  )
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { notifications } = useNotifications()
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
        contentType="default"
        headerSelector={`#${TOP_NAV_ID}`}
        navigation={
          <SideNavigation
            header={{ text: "Admin", href: "/admin" }}
            activeHref={activeHref}
            items={[
              {
                type: "link",
                text: "Dashboard",
                href: "/admin",
                info: <NavIcon name="view-full" />,
              },
              { type: "divider" },
              {
                type: "section-group",
                title: "Content",
                items: [
                  {
                    type: "link",
                    text: "Blog Posts",
                    href: "/admin/blog",
                    info: <NavIcon name="edit" />,
                  },
                  {
                    type: "link",
                    text: "Products",
                    href: "/admin/products",
                    info: <NavIcon name="ticket" />,
                  },
                ],
              },
              {
                type: "section-group",
                title: "Tools",
                items: [
                  {
                    type: "link",
                    text: "QR Links",
                    href: "/admin/qr-links",
                    info: <NavIcon name="gen-ai" />,
                  },
                  {
                    type: "link",
                    text: "Support",
                    href: "/admin/support",
                    info: <NavIcon name="support" />,
                  },
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
