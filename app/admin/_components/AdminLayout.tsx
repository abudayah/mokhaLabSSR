"use client"

import { useRouter, usePathname } from "next/navigation"
import AppLayoutToolbar from "@cloudscape-design/components/app-layout-toolbar"
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group"
import TopNavigation from "@cloudscape-design/components/top-navigation"
import SideNavigation from "@cloudscape-design/components/side-navigation"
import Flashbar from "@cloudscape-design/components/flashbar"
import { signOut } from "aws-amplify/auth"
import { useNotifications } from "./context/NotificationContext"
import { useAppLayout } from "./context/AppLayoutContext"
import type { BreadcrumbItem } from "./context/AppLayoutContext"

interface AdminLayoutProps {
  children: React.ReactNode
}

// ─── Breadcrumb derivation ────────────────────────────────────────────────────

function buildBreadcrumbs(pathname: string, dynamicLabel: string | undefined): BreadcrumbItem[] {
  const home: BreadcrumbItem = { text: "Admin", href: "/admin" }

  if (pathname === "/admin" || pathname === "/admin/") {
    return [{ text: "Dashboard", href: "/admin" }]
  }
  if (pathname === "/admin/blog") {
    return [home, { text: "Blog Posts", href: "/admin/blog" }]
  }
  if (pathname === "/admin/blog/new") {
    return [home, { text: "Blog Posts", href: "/admin/blog" }, { text: "Create post", href: "/admin/blog/new" }]
  }
  if (pathname.match(/^\/admin\/blog\/([^/]+)\/edit$/)) {
    return [home, { text: "Blog Posts", href: "/admin/blog" }, { text: dynamicLabel ?? "Edit post", href: pathname }]
  }
  if (pathname === "/admin/products") {
    return [home, { text: "Products", href: "/admin/products" }]
  }
  if (pathname === "/admin/products/new") {
    return [home, { text: "Products", href: "/admin/products" }, { text: "Create product", href: "/admin/products/new" }]
  }
  if (pathname.match(/^\/admin\/products\/([^/]+)\/edit$/)) {
    return [home, { text: "Products", href: "/admin/products" }, { text: dynamicLabel ?? "Edit product", href: pathname }]
  }
  if (pathname === "/admin/short-links") {
    return [home, { text: "Short Links", href: "/admin/short-links" }]
  }
  if (pathname.match(/^\/admin\/short-links\/([^/]+)$/)) {
    return [home, { text: "Short Links", href: "/admin/short-links" }, { text: dynamicLabel ?? "Link detail", href: pathname }]
  }
  if (pathname === "/admin/support") {
    return [home, { text: "Support", href: "/admin/support" }]
  }
  if (pathname.match(/^\/admin\/support\/([^/]+)$/)) {
    return [home, { text: "Support", href: "/admin/support" }, { text: dynamicLabel ?? "Ticket detail", href: pathname }]
  }
  return [home]
}

// ─── Active sidenav href ──────────────────────────────────────────────────────

function getActiveHref(path: string): string {
  if (path.startsWith("/admin/blog")) return "/admin/blog"
  if (path.startsWith("/admin/short-links")) return "/admin/short-links"
  if (path.startsWith("/admin/support")) return "/admin/support"
  if (path.startsWith("/admin/products")) return "/admin/products"
  if (path === "/admin" || path === "/admin/") return "/admin"
  return path
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { notifications } = useNotifications()
  const { contentType, dynamicLabel } = useAppLayout()
  const router = useRouter()
  const pathname = usePathname()

  const activeHref = getActiveHref(pathname)
  const breadcrumbs = buildBreadcrumbs(pathname, dynamicLabel)

  async function handleSignOut() {
    await signOut()
    router.push("/admin/login")
  }

  return (
    // Outer wrapper required by AppLayoutToolbar — default headerSelector="#b #h"
    <div id="b" style={{ display: "contents" }}>
      {/* TopNavigation must be in #h so AppLayoutToolbar can measure and offset correctly */}
      <div id="h" style={{ position: "sticky", top: 0, zIndex: 1002 }}>
        <TopNavigation
          identity={{ href: "/admin", title: "mokhaLab Admin" }}
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

      <AppLayoutToolbar
        toolsHide
        stickyNotifications
        headerVariant="high-contrast"
        contentType={contentType}
        breadcrumbs={
          <BreadcrumbGroup
            items={breadcrumbs}
            ariaLabel="Breadcrumbs"
            onFollow={(e) => {
              e.preventDefault()
              router.push(e.detail.href)
            }}
          />
        }
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
                  { type: "link", text: "Short Links", href: "/admin/short-links" },
                  { type: "link", text: "Support", href: "/admin/support" },
                ],
              },
            ]}
            onFollow={(e) => {
              e.preventDefault()
              if (e.detail.href !== "#") router.push(e.detail.href)
            }}
          />
        }
        notifications={<Flashbar items={notifications} stackItems />}
        content={children}
      />
    </div>
  )
}
