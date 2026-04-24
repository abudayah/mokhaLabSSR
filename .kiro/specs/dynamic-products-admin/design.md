# Design Document: Dynamic Products & Admin

## Overview

This design migrates the mokhaLab product catalog from the static `lib/products.ts` file to a DynamoDB-backed system managed via AWS Amplify Gen 2 (AppSync + DynamoDB). It adds admin pages under `/admin/products` — consistent with the existing blog admin — for creating, editing, and deleting products. Public-facing product pages (`/products` and `/products/[slug]`) are updated to fetch from DynamoDB instead of the static file.

---

## Architecture

### Data Flow

```
Public Site                     Admin Portal
──────────────────────────────  ──────────────────────────────────────
/products          (SSR)        /admin/products         (Client)
/products/[slug]   (SSR)        /admin/products/new     (Client)
                                /admin/products/[id]/edit (Client)
        │                                   │
        │ API Key (read-only)               │ userPool (full CRUD)
        ▼                                   ▼
   AppSync (GraphQL)  ◄──────────────────────
        │
        ▼
   DynamoDB — Product table
```

Public pages use the default API key auth mode (read-only). Admin pages use `authMode: "userPool"` via the Amplify Data client, consistent with the blog admin.

---

## Component Architecture

### New Files

```
amplify/data/resource.ts              # Updated — add Product model
scripts/migrate-products.ts           # One-time migration script

app/admin/(portal)/products/
  page.tsx                            # → ProductListPage
  new/page.tsx                        # → ProductFormPage (create mode)
  [id]/edit/page.tsx                  # → ProductFormPage (edit mode)

app/admin/_components/
  context/
    ProductStoreContext.tsx           # Amplify Data CRUD for Product model
    useProductStore.ts                # Hook for ProductStoreContext
  pages/
    ProductListPage.tsx               # Cloudscape Table of all products
    ProductFormPage.tsx               # Create/edit form (shared)
  schemas/
    productSchema.ts                  # Zod schema for product form

lib/
  products-db.ts                      # Product interface (DB shape) + helper types
```

### Modified Files

```
amplify/data/resource.ts              # Add Product model + slug GSI
app/admin/_components/AdminLayout.tsx # Add Products nav item
app/admin/_components/AdminProviders.tsx # Add ProductStoreProvider
app/products/page.tsx                 # Fetch from DynamoDB (SSR)
app/products/[slug]/page.tsx          # Fetch from DynamoDB (SSR)
lib/products.ts                       # Removed after migration verified
```

---

## Amplify Data Schema

### Product Model

Added to `amplify/data/resource.ts` alongside the existing `BlogPost` model:

```ts
Product: a
  .model({
    // Identity
    id: a.id().required(),
    slug: a.string().required(),
    name: a.string().required(),
    tagline: a.string().required(),
    description: a.string().required(),

    // Pricing
    priceUSD: a.float().required(),
    priceCAD: a.float().required(),

    // Images
    image: a.string().required(),
    images: a.string().array().required(),

    // Amazon storefronts
    amazonUrlUS: a.string(),
    amazonUrlCA: a.string(),

    // Marketplace availability
    availableUS: a.boolean().required(),
    availableCA: a.boolean().required(),

    // Rich fields — JSON-encoded arrays
    features: a.string().required(),   // JSON: FeatureItem[]
    specs: a.string().required(),      // JSON: SpecItem[]

    // Lists
    compatibleMachines: a.string().array().required(),
    relatedIds: a.string().array().required(),
    variantIds: a.string().array(),

    // Optional metadata
    youtubeId: a.string(),
    rating: a.float(),
    ratingCount: a.integer(),
  })
  .secondaryIndexes((index) => [index("slug")])
  .authorization((allow) => [
    allow.authenticated(),
    allow.publicApiKey().to(["read"]),
  ]),
```

**Design decisions:**
- `features` and `specs` are stored as JSON strings rather than nested objects. Amplify Gen 2 does not support complex nested object types in DynamoDB models without custom resolvers. JSON strings are the same pattern used by the existing codebase for rich data.
- `slug` gets a secondary index (GSI) so public pages can do an efficient `list({ filter: { slug: { eq: slug } } })` lookup without a full table scan.
- Auth mirrors `BlogPost`: authenticated users get full CRUD, public API key gets read-only.

---

## Data Types

### `lib/products-db.ts`

This file defines the canonical TypeScript interface for a product as stored in DynamoDB, replacing the static `lib/products.ts` interface for all new code:

```ts
export interface FeatureItem {
  icon: string
  title: string
  description: string
}

export interface SpecItem {
  label: string
  value: string
}

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
  features: FeatureItem[]   // deserialized from JSON string
  specs: SpecItem[]         // deserialized from JSON string
  compatibleMachines: string[]
  relatedIds: string[]
  variantIds?: string[]
  youtubeId?: string
  rating?: number
  ratingCount?: number
}
```

A `toProductDB` mapper function converts raw DynamoDB items (where `features`/`specs` are strings) to `ProductDB` (where they are parsed arrays). A `fromProductDB` mapper does the reverse for writes.

---

## ProductStoreContext

`app/admin/_components/context/ProductStoreContext.tsx` — mirrors `BlogPostStoreContext` in structure.

```ts
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
```

**Key behaviors:**
- On mount, fetches all products via `client.models.Product.list()` with `authMode: "userPool"`.
- `createProduct` generates a unique slug from the name using the existing `generateSlug` utility. If a collision exists, appends a 2-char random suffix (same pattern as blog posts).
- `deleteProducts` accepts an array of IDs and deletes them sequentially, collecting errors and throwing after all deletions complete if any failed.
- `features` and `specs` are serialized to JSON strings before writes and deserialized after reads via `toProductDB`/`fromProductDB`.

`useProductStore.ts` — thin hook that reads from `ProductStoreContext`, throws if used outside provider.

---

## Admin Pages

### ProductListPage

**Route:** `/admin/products`  
**File:** `app/admin/_components/pages/ProductListPage.tsx`

Cloudscape full-page Table with:

| Column | Field | Sortable |
|--------|-------|----------|
| Name | `name` (linked to `/products/[slug]`) | ✓ |
| Slug | `slug` | |
| USD Price | `priceUSD` | ✓ |
| CAD Price | `priceCAD` | |

- `variant="full-page"`, `trackBy="id"`
- Header: `variant="awsui-h1-sticky"`, counter `(N)`, "Create product" primary button → `/admin/products/new`
- Row selection: `selectionType="multi"`. When ≥1 row selected, "Edit" (navigates to `/admin/products/[id]/edit` for the first selected item) and "Delete" buttons become enabled in the header actions.
- Delete triggers a `DeleteConfirmModal` (reuses existing component, generalized to accept `itemName` prop instead of `postTitle`).
- Multi-delete: modal shows "Delete N products?" with a list of names.
- Loading state via `loading` / `loadingText` props.
- Error state via `NotificationContext` Flashbar.
- Empty state with "Create product" button.

### ProductFormPage

**Routes:** `/admin/products/new` and `/admin/products/[id]/edit`  
**File:** `app/admin/_components/pages/ProductFormPage.tsx`

Single component handling both create and edit modes, receiving an optional `productId` prop.

**Form sections (Cloudscape `Container` with `header`):**

1. **Basic Info** — Name, Slug, Tagline, Description (Textarea)
2. **Pricing** — USD Price, CAD Price (side by side)
3. **Images** — Main Image path (Input), Additional Images (multi-value token group)
4. **Amazon Links** — Amazon URL (US), Amazon URL (CA), with an "Availability" subsection containing two Cloudscape `Checkbox` components: "Available in US" and "Available in Canada" (both checked by default on create)
5. **Features** — JSON textarea with constraint text showing expected format
6. **Specs** — JSON textarea with constraint text showing expected format
7. **Compatibility & Relations** — Compatible Machines (multi-select checkbox group with two fixed presets: "53/54mm machines" and "58mm machines"), Related Product IDs (token group — free-text model number entry), Variant IDs (token group — free-text model number entry)
8. **Optional** — YouTube ID, Rating, Rating Count

**Slug behavior:**
- On create: auto-generated from Name field on blur using `generateSlug`. A `slugManuallyEdited` ref tracks whether the admin has manually changed the slug field. Once manually edited, auto-generation stops.
- On edit: slug field is pre-populated and editable. No auto-generation from name on edit.
- Slug uniqueness is validated async on blur against `getProductBySlug` from the store (excluding current product in edit mode).

**Token group fields (Additional Images, Related IDs, Variant IDs):**
- Rendered as a text input + "Add" button that appends to a Cloudscape `TokenGroup`.
- Each token has a dismiss button to remove it.
- Implemented via `Controller` from react-hook-form since `react-hook-form-cloudscape` does not cover `TokenGroup`.

**Compatible Machines — fixed preset selection:**
- Rendered as a Cloudscape `CheckboxGroup` (or two individual `Checkbox` components) with two options:
  - "53/54mm machines" — maps to the `machines53and54` array from `lib/machines.ts`
  - "58mm machines" — maps to the `machines58` array from `lib/machines.ts`
- Selecting a preset populates `compatibleMachines` with the full machine name list for that size group.
- Both presets can be selected simultaneously (product compatible with all sizes).
- On edit, the form reverse-maps the stored `compatibleMachines` array back to which preset checkboxes to check.
- The raw machine name arrays are never shown in the UI — only the preset labels.

**Features — dynamic row UI:**
- Each feature is a row with two fields: Title (Input) and Description (Input).
- An "Add feature" button appends a new empty row.
- Each row has a remove (×) button.
- Stored as a JSON string in DynamoDB; serialized/deserialized via `toProductDB`/`fromProductDB`.
- The `icon` field is dropped from the admin UI — it will be hardcoded to `"zap"` on all new features (the public site renders icons by name but the admin does not need to expose this).

**Specs — dynamic key/value row UI:**
- Each spec is a row with two fields: Label (Input) and Value (Input).
- An "Add spec" button appends a new empty row.
- Each row has a remove (×) button.
- Stored as a JSON string in DynamoDB; serialized/deserialized via `toProductDB`/`fromProductDB`.

**Form actions:**
- Cancel → `/admin/products`
- Submit: "Create product" / "Save changes" with `loading={isSubmitting}`

**Edit mode loading:**
- If `productId` is provided but the store is still loading, show a Cloudscape `Spinner`.
- If `productId` is provided and the product is not found after loading, show an `Alert` with a link back to the list.

---

## Zod Schema

`app/admin/_components/schemas/productSchema.ts`

```ts
const featureItemSchema = z.object({
  icon: z.string().default("zap"),   // hardcoded default, not shown in UI
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
})

const specItemSchema = z.object({
  label: z.string().min(1, "Label is required"),
  value: z.string().min(1, "Value is required"),
})

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  tagline: z.string().min(1, "Tagline is required"),
  description: z.string().min(1, "Description is required"),
  priceUSD: z.number({ invalid_type_error: "Must be a number" }).min(0),
  priceCAD: z.number({ invalid_type_error: "Must be a number" }).min(0),
  image: z.string().min(1, "Main image path is required"),
  images: z.array(z.string()).default([]),
  amazonUrlUS: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  amazonUrlCA: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  availableUS: z.boolean().default(true),
  availableCA: z.boolean().default(true),
  // Stored as structured arrays in form state; serialized to JSON on submit
  features: z.array(featureItemSchema).min(1, "At least one feature is required"),
  specs: z.array(specItemSchema).min(1, "At least one spec is required"),
  // compatibleMachines stored as preset keys in form, expanded to machine name arrays on submit
  compatiblePresets: z.array(z.enum(["53-54mm", "58mm"])).default([]),
  relatedIds: z.array(z.string()).default([]),
  variantIds: z.array(z.string()).optional(),
  youtubeId: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  ratingCount: z.number().int().min(0).optional(),
})

export type ProductFormData = z.infer<typeof productSchema>
```

**Note on `compatiblePresets`:** The form stores which preset checkboxes are checked (`"53-54mm"` and/or `"58mm"`). On submit, these are expanded to the full machine name arrays before writing to DynamoDB:
- `"53-54mm"` → `machines53and54` from `lib/machines.ts`
- `"58mm"` → `machines58` from `lib/machines.ts`

On edit, the reverse mapping checks whether the stored `compatibleMachines` array contains any machine from each preset group to determine which checkboxes to pre-check.

---

## Admin Navigation

`AdminLayout.tsx` — update the SideNavigation items:

```ts
items={[
  { type: "link", text: "Dashboard", href: "/admin" },
  { type: "link", text: "Blog Posts", href: "/admin/blog" },
  { type: "link", text: "Products", href: "/admin/products" },
]}
```

Update `getActiveHref` to match `/admin/products` and sub-routes:

```ts
if (path.startsWith("/admin/products")) return "/admin/products"
```

---

## AdminProviders Update

`AdminProviders.tsx` — wrap with `ProductStoreProvider`:

```tsx
export default function AdminProviders({ children }) {
  return (
    <BlogPostStoreProvider>
      <ProductStoreProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </ProductStoreProvider>
    </BlogPostStoreProvider>
  )
}
```

---

## Public Pages — SSR Migration

Both public product pages switch from static imports to server-side DynamoDB fetches. Since these are Server Components (no `"use client"`), they use a server-side Amplify Data client with the API key auth mode.

### Server-side Data Client

A shared utility `lib/amplify-server-utils.ts` (or reuse the existing pattern if one exists) provides a server-side Amplify client:

```ts
import { generateServerClientUsingCookies } from "@aws-amplify/adapter-nextjs/data"
import { cookies } from "next/headers"
import outputs from "@/amplify_outputs.json"
import type { Schema } from "@/amplify/data/resource"

export function getServerClient() {
  return generateServerClientUsingCookies<Schema>({
    config: outputs,
    cookies,
    authMode: "apiKey",
  })
}
```

### `/products/page.tsx`

- Remove `import { products } from "@/lib/products"`
- Add `async` to the page component
- Fetch: `const { data: items } = await getServerClient().models.Product.list()`
- Map items through `toProductDB` before passing to `ProductCard`
- Update the count badge to use `items.length`

### `/products/[slug]/page.tsx`

- Remove static imports from `lib/products`
- `generateStaticParams` → replaced with `export const dynamic = "force-dynamic"` (or fetch all slugs from DynamoDB at build time — see note below)
- `generateMetadata` → async, fetches product by slug from DynamoDB
- Page component → async, fetches product by slug, calls `notFound()` if missing
- Related products and variants are fetched by filtering the full product list or via individual `get` calls by ID

**Static generation vs dynamic rendering:**
The design defaults to `export const dynamic = "force-dynamic"` (SSR) for product pages. This avoids the need to fetch all slugs from DynamoDB at build time and ensures product pages always reflect the latest data. If build-time static generation is preferred in the future, `generateStaticParams` can be restored by fetching slugs from DynamoDB during the build.

**Slug lookup:**
```ts
const { data: items } = await client.models.Product.listProductBySlug({ slug: params.slug })
const product = items?.[0] ? toProductDB(items[0]) : null
if (!product) notFound()
```

The secondary index on `slug` generates a `listProductBySlug` query method in the Amplify client.

---

## BuyOnAmazonButton — Availability Logic

The existing `BuyOnAmazonButton` component is updated to accept availability flags and handle the "Out of Stock" state.

### Updated Props

```ts
interface BuyOnAmazonButtonProps {
  urls: { us?: string; ca?: string }
  availability: { us: boolean; ca: boolean }  // new
  productName?: string
  size?: "md" | "lg"
  align?: "start" | "center"
}
```

### Availability Resolution Logic

```
Given: country (from useCountry), urls, availability

isCA = country === "CA"

// Determine if the visitor's preferred marketplace is available
preferredAvailable = isCA ? availability.ca : availability.us
preferredUrl       = isCA ? urls.ca : urls.us

// If preferred marketplace is unavailable or has no URL, try fallback
if (!preferredAvailable) → show "Out of Stock" disabled button
else if (preferredUrl)   → show Buy button with preferredUrl
else if fallbackUrl      → show Buy button with fallbackUrl (other marketplace)
else                     → show "Out of Stock" disabled button (no URL at all)
```

### Out of Stock State

When unavailable, render a disabled button instead of the anchor:

```tsx
<button
  disabled
  className={`inline-flex items-center justify-center gap-2 bg-muted text-muted-foreground font-semibold cursor-not-allowed ${textSize} ${padding}`}
>
  <ShoppingBag size={iconSize} aria-hidden="true" />
  Out of Stock
</button>
```

The alt marketplace link ("Also available on Amazon.ca") is only shown when both the primary marketplace is available AND both URLs exist — unchanged from current behavior, but now gated on availability flags too.

---

## Migration Script

**File:** `scripts/migrate-products.ts`

Run once with `npx ts-node --project tsconfig.json scripts/migrate-products.ts` (or via `tsx`).

```
Logic:
1. Import all products from lib/products.ts
2. For each product:
   a. Check if a Product with the same id already exists via client.models.Product.get({ id })
   b. If exists → skip, increment skippedCount
   c. If not exists → create via client.models.Product.create(...), increment createdCount
   d. On error → log product id + error message, increment errorCount, continue
3. Print summary: "Created: N | Skipped: N | Errors: N"
```

The script uses `generateClient<Schema>({ authMode: "userPool" })` and requires valid Cognito credentials in the environment (i.e., run after `npx ampx sandbox` is active or against the deployed backend with appropriate credentials).

**Data mapping from static to DynamoDB shape:**
- `prices.USD` → `priceUSD`
- `prices.CAD` → `priceCAD`
- `amazonUrls.us` → `amazonUrlUS`
- `amazonUrls.ca` → `amazonUrlCA`
- `features` (array) → `JSON.stringify(features)`
- `specs` (array) → `JSON.stringify(specs)`
- `amazonUrl` (legacy single field) → mapped to `amazonUrlUS` if `amazonUrls` is absent
- `availableUS` → `true` (default for all migrated products)
- `availableCA` → `true` (default for all migrated products)

---

## DeleteConfirmModal Generalization

The existing `DeleteConfirmModal` accepts `postTitle: string`. It will be updated to accept a more generic prop:

```ts
interface DeleteConfirmModalProps {
  visible: boolean
  itemName: string          // replaces postTitle
  itemCount?: number        // for multi-delete: shows "Delete 3 products?"
  onConfirm: () => void
  onDismiss: () => void
  loading?: boolean
}
```

The blog list page is updated to pass `itemName={deleteTarget.title}`.

---

## Correctness Properties

### P1 — Round-trip fidelity
For any product P written to DynamoDB via `createProduct(data)`, reading it back via `getProductById(P.id)` must return a value where all fields equal the original input. Specifically, `features` and `specs` must deserialize to structurally equal arrays.

### P2 — Slug uniqueness
After any sequence of `createProduct` or `updateProduct` calls, no two products in the store share the same `slug`.

### P3 — Slug format invariant
For any product in the store, `product.slug` matches `/^[a-z0-9-]+$/` and does not start or end with a hyphen.

### P4 — Public read isolation
A request to `/products/[slug]` using the API key auth mode must never return a 500 error for a product that exists in DynamoDB. It must return the product data or a 404 if the slug does not exist.

### P5 — Delete completeness
After `deleteProduct(id)` resolves without error, `getProductById(id)` returns `undefined` and the product does not appear in the `products` array.

### P6 — Migration idempotency
Running the migration script twice against the same DynamoDB table produces the same final state as running it once. No duplicate records are created.

### P7 — Availability/button consistency
For any product P and any country C:
- If `availability[C]` is false → the buy button is always disabled, regardless of URL presence.
- If `availability[C]` is true and a URL exists for C → the buy button links to that URL.
- If `availability[C]` is true but no URL exists for C, and a URL exists for the other marketplace → the buy button links to the fallback URL.
- If `availability[C]` is true but no URL exists for either marketplace → the buy button is disabled.

---

## Property-Based Tests

Tests live in `__tests__/products/` and use `fast-check` (already used in the project or to be added).

### Test 1 — Slug generation (P2, P3)
```
Property: for any non-empty string title,
  generateSlug(title) matches /^[a-z0-9-]*$/ and does not start/end with "-"
```

### Test 2 — JSON round-trip (P1)
```
Property: for any array of FeatureItem or SpecItem objects,
  JSON.parse(JSON.stringify(arr)) deep-equals arr
```

### Test 3 — Slug uniqueness under concurrent creates (P2)
```
Property: given a store with N existing products,
  calling createProduct N times with the same name
  results in N products with distinct slugs
```

### Test 4 — Zod schema accepts valid products (P1)
```
Property: for any ProductDB object generated by fast-check,
  productSchema.parse(toFormData(product)) does not throw
```

### Test 5 — Migration idempotency (P6)
```
Property: running migrateProduct(product) twice on a mock client
  results in exactly one DynamoDB create call (second call is skipped)
```
