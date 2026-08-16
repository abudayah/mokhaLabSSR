import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ProductCard } from "@/components/product/product-card"
import { getServerClient } from "@/lib/amplify-server-utils"
import { toProductDB, type ProductDBRaw } from "@/lib/products-db"

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
    locale: "en_US",
    type: "website",
  },
  alternates: {
    canonical: "https://www.mokhalab.com/products",
    languages: {
      "en-US": "https://www.mokhalab.com/products",
      "en-CA": "https://www.mokhalab.com/products",
      "x-default": "https://www.mokhalab.com/products",
    },
  },
}

export default async function ProductsListPage() {
  const { data: items } = await getServerClient().models.Product.list()
  const products = (items ?? []).map(item => toProductDB(item as unknown as ProductDBRaw))
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
