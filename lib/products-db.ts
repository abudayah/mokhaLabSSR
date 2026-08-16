/**
 * lib/products-db.ts
 *
 * TypeScript interfaces and mapper functions for the DynamoDB-backed Product model.
 * `features` and `specs` are stored as JSON strings in DynamoDB and deserialized
 * into typed arrays by `toProductDB`. `fromProductDB` serializes them back for writes.
 */

export interface FeatureItem {
  icon: string
  title: string
  description: string
}

export interface SpecItem {
  label: string
  value: string
}

/** Canonical shape of a Product as used throughout the application (post-deserialization). */
export interface ProductDB {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  priceUSD: number
  priceCAD: number
  image: string
  images: string[]
  amazonUrlUS?: string
  amazonUrlCA?: string
  availableUS: boolean
  availableCA: boolean
  /** Deserialized from a JSON string stored in DynamoDB */
  features: FeatureItem[]
  /** Deserialized from a JSON string stored in DynamoDB */
  specs: SpecItem[]
  compatibleMachines: string[]
  relatedIds: string[]
  variantIds?: string[]
  youtubeId?: string
  rating?: number
  ratingCount?: number
}

/**
 * Raw DynamoDB item shape — mirrors the Amplify-generated model exactly.
 * `features` and `specs` are JSON strings at this layer.
 */
export interface ProductDBRaw {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  priceUSD: number
  priceCAD: number
  image: string
  images: string[]
  amazonUrlUS?: string | null
  amazonUrlCA?: string | null
  availableUS: boolean
  availableCA: boolean
  /** JSON-encoded FeatureItem[] */
  features: string
  /** JSON-encoded SpecItem[] */
  specs: string
  compatibleMachines: string[]
  relatedIds: string[]
  variantIds?: string[] | null
  youtubeId?: string | null
  rating?: number | null
  ratingCount?: number | null
  // Amplify adds these automatically; we accept them but do not expose them
  readonly createdAt?: string
  readonly updatedAt?: string
}

/**
 * Converts a raw DynamoDB item (features/specs as JSON strings) into a typed `ProductDB`.
 * Falls back to empty arrays if the JSON is missing or malformed.
 */
export function toProductDB(raw: ProductDBRaw): ProductDB {
  let features: FeatureItem[] = []
  let specs: SpecItem[] = []

  try {
    const parsedFeatures = JSON.parse(raw.features)
    if (Array.isArray(parsedFeatures)) {
      features = parsedFeatures as FeatureItem[]
    }
  } catch {
    // Malformed JSON — leave features as empty array
  }

  try {
    const parsedSpecs = JSON.parse(raw.specs)
    if (Array.isArray(parsedSpecs)) {
      specs = parsedSpecs as SpecItem[]
    }
  } catch {
    // Malformed JSON — leave specs as empty array
  }

  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    tagline: raw.tagline,
    description: raw.description,
    priceUSD: raw.priceUSD,
    priceCAD: raw.priceCAD,
    image: raw.image,
    images: raw.images,
    ...(raw.amazonUrlUS != null && { amazonUrlUS: raw.amazonUrlUS }),
    ...(raw.amazonUrlCA != null && { amazonUrlCA: raw.amazonUrlCA }),
    availableUS: raw.availableUS,
    availableCA: raw.availableCA,
    features,
    specs,
    compatibleMachines: raw.compatibleMachines,
    relatedIds: raw.relatedIds,
    ...(raw.variantIds != null && { variantIds: raw.variantIds }),
    ...(raw.youtubeId != null && { youtubeId: raw.youtubeId }),
    ...(raw.rating != null && { rating: raw.rating }),
    ...(raw.ratingCount != null && { ratingCount: raw.ratingCount }),
  }
}

/**
 * Converts a typed `ProductDB` back into the raw DynamoDB write shape,
 * serializing `features` and `specs` arrays to JSON strings.
 */
export function fromProductDB(product: ProductDB): Omit<ProductDBRaw, "createdAt" | "updatedAt"> {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    priceUSD: product.priceUSD,
    priceCAD: product.priceCAD,
    image: product.image,
    images: product.images,
    amazonUrlUS: product.amazonUrlUS ?? null,
    amazonUrlCA: product.amazonUrlCA ?? null,
    availableUS: product.availableUS,
    availableCA: product.availableCA,
    features: JSON.stringify(product.features),
    specs: JSON.stringify(product.specs),
    compatibleMachines: product.compatibleMachines,
    relatedIds: product.relatedIds,
    variantIds: product.variantIds ?? null,
    youtubeId: product.youtubeId ?? null,
    rating: product.rating ?? null,
    ratingCount: product.ratingCount ?? null,
  }
}
