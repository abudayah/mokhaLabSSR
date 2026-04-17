import type { Metadata } from "next"
import { SITE_URL } from "@/lib/image-url"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ProductCard } from "@/components/product/product-card"
import { products } from "@/lib/products"

export const metadata: Metadata = {
  title: "mokhaLab | Precision Espresso Tools",
  description:
    "Precision-engineered espresso tools for the serious barista. Tampers, distributors, WDT tools and more — crafted in Canada.",
  openGraph: {
    title: "mokhaLab | Precision Espresso Tools",
    description:
      "Precision-engineered espresso tools for the serious barista. Tampers, distributors, WDT tools and more — crafted in Canada.",
    url: `${SITE_URL}/`,
    siteName: "mokhaLab",
    locale: "en_CA",
    type: "website",
    images: [{ url: `${SITE_URL}/images/hero.webp` }],
  },
  twitter: {
    card: "summary_large_image",
    title: "mokhaLab | Precision Espresso Tools",
    description:
      "Precision-engineered espresso tools for the serious barista. Tampers, distributors, WDT tools and more — crafted in Canada.",
    images: [`${SITE_URL}/images/hero.webp`],
  },
  alternates: { canonical: `${SITE_URL}/` },
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="pt-14 relative overflow-hidden">
          <div className="relative w-full aspect-[16/9] md:aspect-[21/9] max-h-[680px]">
            <video
              src="/images/hero.mp4"
              autoPlay
              loop
              muted
              playsInline
              poster="/images/hero.webp"
              className="w-full h-full object-cover object-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/hero.webp"
                alt="A barista tamping espresso grounds with a mokhaLab Precision Tamper"
                className="w-full h-full object-cover object-center"
              />
            </video>
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/30" />

            {/* Hero Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <h1 className="text-[42px] md:text-[64px] lg:text-[80px] font-semibold tracking-tight text-white leading-none text-balance mb-5">
                Crafting the
                <br />
                Perfect Shot.
              </h1>
              <p className="text-[17px] md:text-[19px] text-white/80 leading-relaxed max-w-xl text-balance">
                Precision-engineered espresso tools for baristas who refuse to compromise.
              </p>
            </div>
          </div>
        </section>

        {/* ── Brand Story ──────────────────────────────────── */}
        <section className="py-28 md:py-36 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-muted-foreground mb-6">The mokhaLab Philosophy</p>
            <h2 className="text-[32px] md:text-[42px] font-semibold tracking-tight text-foreground leading-tight text-balance mb-8">
              Crafted for the Ritual.
            </h2>
            <p className="text-[17px] text-muted-foreground leading-relaxed text-balance mb-5">
              Inspired by the historic port of Mokha — where the story of coffee began — mokhaLab
              brings that legacy into the present.
            </p>
            <p className="text-[17px] text-muted-foreground leading-relaxed text-balance mb-5">
              Born in British Columbia, Canada, we create high-quality, eco-friendly tools for
              baristas who care about the details. Designed for both professionals and home
              enthusiasts, every product is built to perform, last, and elevate the ritual of
              coffee.
            </p>
            <p className="text-[17px] text-muted-foreground leading-relaxed text-balance">
              Because great coffee isn&apos;t just brewed...
            </p>
            <p className="text-[17px] text-muted-foreground leading-relaxed text-balance">
              It&apos;s crafted, cared for, and perfected over time.
            </p>
          </div>
        </section>

        {/* ── Brand Story Image ────────────────────────────── */}
        <section className="px-6 pb-28">
          <div className="max-w-5xl mx-auto rounded-[24px] overflow-hidden">
            <div className="relative aspect-[16/7]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/brand-story.webp"
                alt="Barista at work with mokhaLab tools"
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>
        </section>

        {/* ── Product Grid ─────────────────────────────────── */}
        <section className="px-6 pb-32">
          <div className="max-w-7xl mx-auto">
            <div className="mb-12">
              <p className="text-muted-foreground">The Collection</p>
              <h2 className="text-[34px] md:text-[44px] font-semibold tracking-tight text-foreground text-balance">
                Tools built for precision.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {products.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-foreground text-background text-[16px] font-semibold rounded-[12px] px-8 py-4 hover:opacity-80 transition-opacity"
              >
                Shop All Products
              </Link>
            </div>
          </div>
        </section>

        {/* ── Quality Banner ───────────────────────────────── */}
        <section className="bg-foreground py-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-[34px] md:text-[48px] font-semibold tracking-tight text-background leading-tight text-balance mb-6">
              Machined to ±0.1mm.
              <br />
              No compromises.
            </h2>
            <p className="text-[17px] text-background/60 leading-relaxed text-balance">
              Every mokhaLab tool is manufactured to tolerances that matter at the micron level —
              because at 9 bars of pressure, every imprecision becomes a variable.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
