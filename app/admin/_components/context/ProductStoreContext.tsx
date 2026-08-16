"use client"

import { createContext, useState, useEffect, useMemo, ReactNode } from "react"
import { generateClient } from "aws-amplify/data"
import type { Schema } from "@/amplify/data/resource"
import type { ProductDB, ProductDBRaw } from "@/lib/products-db"
import { toProductDB } from "@/lib/products-db"
import type { ProductFormData } from "@/app/admin/_components/schemas/productSchema"
import { generateSlug } from "@/app/admin/_components/utils/slugUtils"
import { machines53and54, machines58 } from "@/lib/machines"

export interface ProductStoreValue {
  products: ProductDB[]
  loading: boolean
  getProductById: (id: string) => ProductDB | undefined
  getProductBySlug: (slug: string) => ProductDB | undefined
  createProduct: (data: ProductFormData) => Promise<ProductDB>
  updateProduct: (id: string, data: ProductFormData) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  deleteProducts: (ids: string[]) => Promise<void>
}

const ProductStoreContext = createContext<ProductStoreValue | null>(null)

/** Generates a unique slug, appending a 2-char random suffix on collision. */
function uniqueProductSlug(name: string, products: ProductDB[], excludeId?: string): string {
  const base = generateSlug(name) || "product"
  const others = products.filter((p) => p.id !== excludeId)
  if (!others.some((p) => p.slug === base)) return base
  const suffix = Math.random().toString(36).slice(2, 4)
  return `${base}-${suffix}`
}

/** Expands compatiblePresets to the full machine name arrays. */
function expandCompatibleMachines(presets: Array<"53-54mm" | "58mm">): string[] {
  const result: string[] = []
  if (presets.includes("53-54mm")) result.push(...machines53and54)
  if (presets.includes("58mm")) result.push(...machines58)
  return result
}

/** Builds the DynamoDB write payload from ProductFormData. */
function buildProductPayload(data: ProductFormData, slug: string) {
  return {
    slug,
    name: data.name,
    tagline: data.tagline,
    description: data.description,
    priceUSD: data.priceUSD,
    priceCAD: data.priceCAD,
    image: data.image,
    images: data.images,
    amazonUrlUS: data.amazonUrlUS || undefined,
    amazonUrlCA: data.amazonUrlCA || undefined,
    availableUS: data.availableUS,
    availableCA: data.availableCA,
    features: JSON.stringify(data.features),
    specs: JSON.stringify(data.specs),
    compatibleMachines: expandCompatibleMachines(data.compatiblePresets ?? []),
    relatedIds: data.relatedIds,
    variantIds: data.variantIds && data.variantIds.length > 0 ? data.variantIds : undefined,
    youtubeId: data.youtubeId || undefined,
    rating: data.rating,
    ratingCount: data.ratingCount,
  }
}

export function ProductStoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<ProductDB[]>([])
  const [loading, setLoading] = useState(true)
  const client = useMemo(() => generateClient<Schema>({ authMode: "userPool" }), [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { data: items } = await client.models.Product.list({ authMode: "userPool" })
        if (cancelled) return

        const mapped = (items ?? []).map((item) => toProductDB(item as unknown as ProductDBRaw))
        if (!cancelled) setProducts(mapped)
      } catch (err) {
        console.error("Failed to load products:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [client])

  function getProductById(id: string): ProductDB | undefined {
    return products.find((p) => p.id === id)
  }

  function getProductBySlug(slug: string): ProductDB | undefined {
    return products.find((p) => p.slug === slug)
  }

  async function createProduct(data: ProductFormData): Promise<ProductDB> {
    const slug = uniqueProductSlug(data.name, products)
    const payload = buildProductPayload(data, slug)

    const { data: created, errors } = await client.models.Product.create(payload)
    if (errors?.length || !created) throw new Error(errors?.[0]?.message ?? "Create failed")

    const product = toProductDB(created as unknown as ProductDBRaw)
    setProducts((prev) => [product, ...prev])
    return product
  }

  async function updateProduct(id: string, data: ProductFormData): Promise<void> {
    // Use the slug from form data (already set/validated by the form)
    const slug = data.slug || uniqueProductSlug(data.name, products, id)
    const payload = buildProductPayload(data, slug)

    const { data: updated, errors } = await client.models.Product.update({ id, ...payload })
    if (errors?.length || !updated) throw new Error(errors?.[0]?.message ?? "Update failed")

    const product = toProductDB(updated as unknown as ProductDBRaw)
    setProducts((prev) => prev.map((p) => (p.id === id ? product : p)))
  }

  async function deleteProduct(id: string): Promise<void> {
    const { errors } = await client.models.Product.delete({ id })
    if (errors?.length) throw new Error(errors[0]?.message ?? "Delete failed")
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  async function deleteProducts(ids: string[]): Promise<void> {
    const errors: string[] = []

    for (const id of ids) {
      try {
        const { errors: deleteErrors } = await client.models.Product.delete({ id })
        if (deleteErrors?.length) {
          errors.push(`${id}: ${deleteErrors[0]?.message ?? "Delete failed"}`)
        } else {
          setProducts((prev) => prev.filter((p) => p.id !== id))
        }
      } catch (err) {
        errors.push(`${id}: ${err instanceof Error ? err.message : "Unknown error"}`)
      }
    }

    if (errors.length > 0) {
      throw new Error(`Failed to delete ${errors.length} product(s):\n${errors.join("\n")}`)
    }
  }

  return (
    <ProductStoreContext.Provider
      value={{
        products,
        loading,
        getProductById,
        getProductBySlug,
        createProduct,
        updateProduct,
        deleteProduct,
        deleteProducts,
      }}
    >
      {children}
    </ProductStoreContext.Provider>
  )
}

export { ProductStoreContext }
