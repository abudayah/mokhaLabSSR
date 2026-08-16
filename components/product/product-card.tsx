import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { ProductDB } from "@/lib/products-db"

interface ProductCardProps {
  product: ProductDB
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block bg-secondary overflow-hidden hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
    >
      {/* Product Image */}
      <div className="relative aspect-square flex items-center justify-center p-4 bg-secondary overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.name}
          className="object-contain w-full h-full transition-transform duration-700 group-hover:scale-105"
        />
      </div>

      {/* Card Body */}
      <div className="px-7 pb-8 pt-5 border-t border-border/50">
        <h3 className="text-[19px] font-semibold text-foreground tracking-tight mb-1">
          {product.name}
        </h3>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-5 line-clamp-2">
          {product.tagline}
        </p>
        <div className="flex items-center justify-end">
          <span className="flex items-center gap-1 text-[13px] font-medium text-foreground group-hover:gap-2 transition-all">
            Learn More
            <ArrowRight size={14} aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  )
}
