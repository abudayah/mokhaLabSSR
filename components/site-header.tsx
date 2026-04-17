"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { useState } from "react"
import { SocialLinks } from "@/components/social-links"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { href: "/products", label: "Products" },
    { href: "/blog", label: "Blog" },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="hover:opacity-70 transition-opacity"
          aria-label="mokhaLab home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mokhaLab-logo.svg"
            alt="mokhaLab"
            width={88}
            height={20}
            className="h-5 w-auto dark:invert"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-6">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </Link>
          ))}
          <a
            href="/#contact"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Contact
          </a>
          <SocialLinks size={18} />
        </nav>

        {/* Mobile menu button */}
        <button
          aria-label="Open menu"
          className="flex sm:hidden text-muted-foreground hover:text-foreground transition-colors p-1"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-border bg-background px-6 py-4 flex flex-col gap-4">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </Link>
          ))}
          <a
            href="/#contact"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            Contact
          </a>
          <SocialLinks
            size={18}
            className="flex items-center gap-4"
            iconClassName="text-muted-foreground hover:text-foreground transition-colors"
          />
        </div>
      )}
    </header>
  )
}
