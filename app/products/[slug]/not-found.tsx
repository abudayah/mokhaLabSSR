import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export default function ProductNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-14 flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-[13px] font-semibold tracking-[0.2em] text-muted-foreground mb-4">
          404
        </p>
        <h1 className="text-[32px] font-semibold text-foreground mb-4">Product not found</h1>
        <p className="text-muted-foreground mb-8">
          This product doesn&apos;t exist or may have been removed.
        </p>
        <Link
          href="/products"
          className="text-sm font-medium text-foreground underline underline-offset-4"
        >
          ← All Products
        </Link>
      </main>
      <SiteFooter />
    </div>
  )
}
