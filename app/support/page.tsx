import type { Metadata } from "next"
import { SITE_URL } from "@/lib/image-url"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import SupportForm from "./SupportForm"

export const metadata: Metadata = {
  title: "Support",
  description:
    "Contact mokhaLab support for inquiries, warranty claims, or product returns. We respond within 24 hours.",
  openGraph: {
    title: "Support | mokhaLab",
    description:
      "Contact mokhaLab support for inquiries, warranty claims, or product returns. We respond within 24 hours.",
    url: `${SITE_URL}/support`,
    siteName: "mokhaLab",
    locale: "en_US",
    type: "website",
    images: [{ url: `${SITE_URL}/images/hero.webp` }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Support | mokhaLab",
    description:
      "Contact mokhaLab support for inquiries, warranty claims, or product returns. We respond within 24 hours.",
    images: [`${SITE_URL}/images/hero.webp`],
  },
  alternates: {
    canonical: `${SITE_URL}/support`,
    languages: {
      "en-US": `${SITE_URL}/support`,
      "en-CA": `${SITE_URL}/support`,
      "x-default": `${SITE_URL}/support`,
    },
  },
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="pt-14">
        <div className="max-w-2xl mx-auto px-6 py-16">
          {/* Page header */}
          <div className="mb-10">
            <p className="text-muted-foreground text-[14px] mb-2">Customer Support</p>
            <h1 className="text-[36px] md:text-[44px] font-semibold tracking-tight text-foreground leading-tight mb-4">
              How can we help?
            </h1>
            <p className="text-[17px] text-muted-foreground leading-relaxed">
              Fill out the form below and we&apos;ll get back to you within 24 hours.
              For urgent matters, email us directly at{" "}
              <a
                href="mailto:anas@mokhalab.com"
                className="text-foreground underline underline-offset-2 hover:opacity-70"
              >
                anas@mokhalab.com
              </a>
            </p>
          </div>

          <SupportForm />
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
