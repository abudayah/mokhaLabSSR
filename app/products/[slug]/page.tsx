import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
  products,
  getProductBySlug,
  getRelatedProducts,
  getVariants,
} from "@/lib/products"
import { SITE_URL } from "@/lib/image-url"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ProductGallery } from "@/components/product/product-gallery"
import { BuyOnAmazonButton } from "@/components/product/buy-on-amazon-button"
import { ShareButton } from "@/components/product/share-button"

// Pre-render every product page at build time
export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }))
}

export function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Metadata {
  const product = getProductBySlug(params.slug)
  if (!product) return { title: "Product not found" }

  const description = `${product.tagline} — ${product.description.slice(0, 120)}…`
  const url = `${SITE_URL}/products/${product.slug}`

  // Derive the static OG image path: same folder as the main image, og.png
  const ogImageUrl = `${SITE_URL}${product.image.replace(/\/[^/]+$/, "/og.png")}`

  return {
    title: product.name,
    description,
    openGraph: {
      title: `${product.name} | mokhaLab`,
      description,
      url,
      siteName: "mokhaLab",
      locale: "en_CA",
      type: "website",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | mokhaLab`,
      description,
      images: [ogImageUrl],
    },
    alternates: { canonical: url },
  }
}

// JSON-LD structured data for the product
function ProductJsonLd({ product }: { product: ReturnType<typeof getProductBySlug> }) {
  if (!product) return null
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.tagline,
    image: `${SITE_URL}${product.image}`,
    brand: { "@type": "Brand", name: "mokhaLab" },
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      url: product.amazonUrls?.us ?? "",
    },
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = getProductBySlug(params.slug)
  if (!product) notFound()

  const amazonUrls = product.amazonUrls ?? {
    us: product.amazonUrl ?? "",
    ca: product.amazonUrl ?? "",
  }

  const relatedProducts = getRelatedProducts(product.relatedIds)
  const variants = product.variantIds ? getVariants(product.variantIds) : []

  return (
    <>
      <ProductJsonLd product={product} />
      <div className="min-h-screen bg-background">
        <SiteHeader />

        <main className="pt-14">
          {/* ── Breadcrumb ───────────────────────────────────── */}
          <div className="max-w-7xl mx-auto px-6 pt-8 pb-4">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              All Products
            </Link>
          </div>

          {/* ── Top Fold: Gallery + Product Info ─────────────── */}
          <section className="max-w-7xl mx-auto px-6 pb-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
              <ProductGallery images={product.images} name={product.name} />

              <div className="flex flex-col gap-6 lg:pt-4">
                <div>
                  <h1 className="text-[40px] md:text-[52px] font-semibold tracking-tight text-foreground leading-none mb-3 text-balance">
                    {product.name}
                  </h1>
                  <p className="text-[19px] text-muted-foreground italic">{product.tagline}</p>
                </div>

                <p className="text-[16px] text-muted-foreground leading-relaxed">
                  {product.description}
                </p>

                {/* ── Variant Switcher ───────────────────────── */}
                {variants.length > 1 && (
                  <div className="flex flex-col gap-3">
                    <p className="text-[12px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                      Size
                    </p>
                    <div className="flex gap-2">
                      {variants.map((v) => {
                        const sizeSpec = v.specs.find((s) => s.label === "Size")
                        const label = sizeSpec?.value ?? v.id
                        const isActive = v.id === product.id
                        return (
                          <Link
                            key={v.id}
                            href={`/products/${v.slug}`}
                            className={`px-5 py-2 rounded-full text-[14px] font-medium border transition-colors ${
                              isActive
                                ? "bg-foreground text-background border-foreground"
                                : "bg-transparent text-foreground border-border hover:border-foreground"
                            }`}
                          >
                            {label}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-2">
                  <BuyOnAmazonButton urls={amazonUrls} productName={product.name} />
                  <ShareButton title={product.name} text={product.tagline} />
                </div>

                {/* ── Related Products ───────────────────────── */}
                {relatedProducts.length > 0 && (
                  <div className="flex flex-col gap-4 pt-8 mt-6 border-t border-border">
                    <h3 className="text-muted-foreground">Complete your setup</h3>
                    {relatedProducts.map((related) => (
                      <Link
                        key={related.id}
                        href={`/products/${related.slug}`}
                        className="group flex gap-4 items-center bg-secondary p-4 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                      >
                        <div className="w-16 h-16 shrink-0 overflow-hidden bg-background flex items-center justify-center p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={related.image}
                            alt={related.name}
                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <h3 className="text-[15px] font-semibold text-foreground tracking-tight truncate">
                            {related.name}
                          </h3>
                          <p className="text-[12px] text-muted-foreground truncate">
                            {related.tagline}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── Features Grid ─────────────────────────────────── */}
          <section className="bg-secondary py-20 md:py-28 px-6">
            <div className="max-w-7xl mx-auto">
              <h3 className="text-muted-foreground mb-4">Engineered Details</h3>
              <h2 className="text-[32px] md:text-[40px] font-semibold tracking-tight text-foreground mb-14 text-balance">
                Built different, by design.
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {product.features.map((feature, i) => (
                  <div key={i} className="flex flex-col gap-4">
                    <h3 className="text-[17px] font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-[14px] text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Tech Specs ───────────────────────────────────── */}
          <section className="py-20 md:py-28 px-6">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                <div>
                  <h3 className="text-muted-foreground mb-4">Specifications</h3>
                  <h2 className="text-[32px] md:text-[38px] font-semibold tracking-tight text-foreground mb-10 text-balance">
                    The numbers
                    <br />
                    that matter.
                  </h2>
                  <div className="flex flex-col">
                    {product.specs.map((spec, i) => (
                      <div
                        key={i}
                        className={`flex justify-between items-center py-4 ${
                          i < product.specs.length - 1 ? "border-b border-border" : ""
                        }`}
                      >
                        <span className="text-[14px] text-muted-foreground">{spec.label}</span>
                        <span className="text-[14px] font-medium text-foreground">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-muted-foreground mb-4">Compatibility</h3>
                  <h2 className="text-[32px] md:text-[38px] font-semibold tracking-tight text-foreground mb-10 text-balance">
                    Works with
                    <br />
                    your machine.
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {product.compatibleMachines.map((machine, i) => (
                      <span
                        key={i}
                        className="text-[13px] font-medium text-foreground bg-secondary rounded-full px-4 py-2 border border-border"
                      >
                        {machine}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Bottom CTA ───────────────────────────────────── */}
          <section className="py-28 px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-[36px] md:text-[48px] font-semibold tracking-tight text-foreground mb-4 text-balance">
                {product.name}
              </h2>
              <p className="text-[17px] text-muted-foreground leading-relaxed mb-10 text-balance">
                {product.tagline}
              </p>
              <BuyOnAmazonButton urls={amazonUrls} productName={product.name} size="lg" align="center" />
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  )
}
