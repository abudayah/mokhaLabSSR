import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ProductCard } from "@/components/product/product-card"
import { products } from "@/lib/products"

export const metadata: Metadata = {
  title: "Products",
  description:
    "Shop mokhaLab precision espresso tools — tampers, distributors, WDT tools, and more. Crafted in Canada.",
  openGraph: {
    title: "Products | mokhaLab",
    description:
      "Shop mokhaLab precision espresso tools — tampers, distributors, WDT tools, and more.",
    url: "https://www.mokhalab.com/products",
    siteName: "mokhaLab",
    locale: "en_CA",
    type: "website",
  },
  alternates: { canonical: "https://www.mokhalab.com/products" },
}

export default function ProductsListPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 pt-24 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Products</h1>
          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {products.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
