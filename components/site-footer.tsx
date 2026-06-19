"use client"

import Link from "next/link"
import { SocialLinks } from "@/components/social-links"

export function SiteFooter() {
  return (
    <footer
      className="border-t border-border pt-16 pb-12"
      style={{ backgroundColor: "#f5f5f7" }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col gap-6 max-w-xs">
          <Link
            href="/"
            className="hover:opacity-70 transition-opacity"
            aria-label="mokhaLab home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mokhaLab-logo.svg"
              alt="mokhaLab"
              width={106}
              height={24}
              className="h-6 w-auto dark:invert"
            />
          </Link>
          <p className="text-[15px] text-muted-foreground leading-relaxed">
            Precision-engineered tools for the serious barista. Every gram matters.
          </p>
          <SocialLinks size={20} />
          <p className="text-[13px] text-muted-foreground/60 mt-4">
            &copy; {new Date().getFullYear()} mokhaLab Inc. &mdash; Coquitlam, BC, Canada. All
            rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
