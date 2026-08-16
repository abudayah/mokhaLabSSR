# Implementation Plan: Dynamic Products Admin

## Overview

Migrate the product catalog from the static `lib/products.ts` file to a DynamoDB-backed system via Amplify Gen 2, and build admin CRUD pages under `/admin/products` using Cloudscape Design System — following the existing blog admin patterns.

## Tasks

- [x] 1. Define the Product model in the Amplify data schema
  - [x] 1.1 Add Product model to `amplify/data/resource.ts`
    - Add the `Product` model definition with all required fields: `id`, `slug`, `name`, `tagline`, `description`, `priceUSD`, `priceCAD`, `image`, `images`, `amazonUrlUS`, `amazonUrlCA`, `availableUS`, `availableCA`, `features`, `specs`, `compatibleMachines`, `relatedIds`, `variantIds`, `youtubeId`, `rating`, `ratingCount`
    - Add a secondary index on `slug` using `.secondaryIndexes((index) => [index("slug")])`
    - Set authorization: `allow.authenticated()` for full CRUD, `allow.publicApiKey().to(["read"])` for public read
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 1.2 Write property test for slug format invariant (P3)
    - Use `fast-check` to assert that for any non-empty string, `generateSlug(title)` matches `/^[a-z0-9-]*$/` and does not start or end with `-`
    - Create test file at `__tests__/products/slug.test.ts`
    - **Property 3: Slug format invariant**
    - **Validates: Requirements 5.3, 5.4**

- [x] 2. Define shared TypeScript types and the Zod schema
  - [x] 2.1 Create `lib/products-db.ts` with `ProductDB`, `FeatureItem`, and `SpecItem` interfaces
    - Define `FeatureItem { icon, title, description }`, `SpecItem { label, value }`, and `ProductDB` with all fields matching the DynamoDB model shape
    - Add `toProductDB(raw)` mapper that parses `features` and `specs` JSON strings into typed arrays
    - Add `fromProductDB(product)` mapper that serializes `features` and `specs` arrays to JSON strings for writes
    - _Requirements: 1.1_

  - [x] 2.2 Create `app/admin/_components/schemas/productSchema.ts` with the Zod validation schema
    - Define `featureItemSchema`, `specItemSchema`, and `productSchema` matching the design spec exactly
    - Include `compatiblePresets` as `z.array(z.enum(["53-54mm", "58mm"]))` — not `compatibleMachines` directly
    - Export `ProductFormData` type inferred from the schema
    - _Requirements: 5.2, 5.10_

  - [ ]* 2.3 Write property test for Zod schema accepting valid products (P1, Test 4)
    - Use `fast-check` arbitraries to generate valid `ProductFormData` objects and assert `productSchema.parse()` never throws
    - Create test in `__tests__/products/schema.test.ts`
    - **Property 1: Round-trip fidelity (schema layer)**
    - **Validates: Requirements 5.2, 5.6**

  - [ ]* 2.4 Write property test for JSON round-trip fidelity (P1, Test 2)
    - Use `fast-check` to assert that for any array of `FeatureItem` or `SpecItem`, `JSON.parse(JSON.stringify(arr))` deep-equals the original
    - Test `toProductDB` and `fromProductDB` roundtrip: `toProductDB(fromProductDB(product))` deep-equals original
    - **Property 1: Round-trip fidelity**
    - **Validates: Requirements 1.1, 3.4**

- [x] 3. Implement `ProductStoreContext` and `useProductStore` hook
  - [x] 3.1 Create `app/admin/_components/context/ProductStoreContext.tsx`
    - Mirror `BlogPostStoreContext` structure with `ProductStoreValue` interface: `products`, `loading`, `getProductById`, `getProductBySlug`, `createProduct`, `updateProduct`, `deleteProduct`, `deleteProducts`
    - On mount, fetch all products via `client.models.Product.list()` with `authMode: "userPool"` and map through `toProductDB`
    - In `createProduct`: generate slug from name using `generateSlug`, check for collision via `getProductBySlug`, append 2-char random suffix on collision; serialize `features`/`specs` via `fromProductDB` before writing
    - In `deleteProducts`: delete IDs sequentially, collect errors, throw aggregated error after all deletions complete
    - _Requirements: 5.5, 5.7, 7.2, 7.6_

  - [x] 3.2 Create `app/admin/_components/context/useProductStore.ts`
    - Thin hook that reads from `ProductStoreContext`, throws if used outside provider
    - Export `useProductStore` as the default hook
    - _Requirements: 5.5, 6.1_

  - [ ]* 3.3 Write property test for slug uniqueness under concurrent creates (P2, Test 3)
    - Use `fast-check` to assert that calling `createProduct` N times with the same name on a mock store results in N products with all-distinct slugs
    - Create test in `__tests__/products/store.test.ts`
    - **Property 2: Slug uniqueness**
    - **Validates: Requirements 5.3, 5.7**

  - [ ]* 3.4 Write property test for delete completeness (P5)
    - Assert that after `deleteProduct(id)` resolves without error, `getProductById(id)` returns `undefined` and the id is absent from `products`
    - **Property 5: Delete completeness**
    - **Validates: Requirements 7.2, 7.3**

- [x] 4. Checkpoint — Core data layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Generalize `DeleteConfirmModal` and update `AdminLayout` + `AdminProviders`
  - [x] 5.1 Update `DeleteConfirmModal` to accept generic `itemName` and `itemCount` props
    - Replace `postTitle: string` with `itemName: string` and add optional `itemCount?: number`
    - When `itemCount` is provided and > 1, show "Delete N products?" with a list of names
    - Update the blog list page call site to pass `itemName={deleteTarget.title}`
    - _Requirements: 7.1, 7.6_

  - [x] 5.2 Add Products nav item to `AdminLayout.tsx`
    - Add `{ type: "link", text: "Products", href: "/admin/products" }` to the SideNavigation items
    - Update `getActiveHref` to return `"/admin/products"` when `path.startsWith("/admin/products")`
    - _Requirements: 8.1, 8.2_

  - [x] 5.3 Wrap `AdminProviders.tsx` with `ProductStoreProvider`
    - Import `ProductStoreProvider` from `ProductStoreContext`
    - Nest it between `BlogPostStoreProvider` and `NotificationProvider`
    - _Requirements: 4.1_

- [x] 6. Implement `ProductListPage`
  - [x] 6.1 Create `app/admin/_components/pages/ProductListPage.tsx`
    - Cloudscape `Table` with `variant="full-page"`, `trackBy="id"`, columns: Name (linked to `/products/[slug]`), Slug, USD Price, CAD Price; sort on Name and USD Price
    - Header: `variant="awsui-h1-sticky"`, counter `(N)`, "Create product" primary button → `/admin/products/new`
    - `selectionType="multi"`: enable "Edit" (navigate to `/admin/products/[id]/edit` for first selected) and "Delete" buttons when ≥1 row selected
    - Delete triggers `DeleteConfirmModal`; multi-delete shows count and names
    - Loading state via `loading`/`loadingText` props; error state via `NotificationContext`; empty state with "Create product" button
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [x] 6.2 Create route `app/admin/(portal)/products/page.tsx`
    - Thin page component that renders `<ProductListPage />`
    - _Requirements: 4.1_

- [x] 7. Implement `ProductFormPage` — Basic Info, Pricing, and Images sections
  - [x] 7.1 Create `app/admin/_components/pages/ProductFormPage.tsx` with first three form sections
    - Scaffold the component accepting optional `productId` prop; wire `react-hook-form` with `zodResolver(productSchema)`, `mode: "onBlur"`, `reValidateMode: "onChange"`
    - **Basic Info section**: Name, Slug, Tagline, Description (Textarea) using Cloudscape `FormField` + `Input`/`Textarea`
    - Slug auto-generation: on Name blur, call `generateSlug(name)` and set slug field unless `slugManuallyEdited` ref is true; on manual slug edit, set ref to true
    - Async slug uniqueness validation on Slug blur: call `getProductBySlug`, show error if collision (skip current product in edit mode)
    - **Pricing section**: USD Price and CAD Price side by side
    - **Images section**: Main Image path (Input); Additional Images via text Input + "Add" button + Cloudscape `TokenGroup` managed by `Controller`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7, 5.10, 5.11_

- [x] 8. Implement `ProductFormPage` — Amazon Links, Features, and Specs sections
  - [x] 8.1 Add Amazon Links and Availability sections to `ProductFormPage`
  - [x] 8.2 Add Features dynamic row UI to `ProductFormPage`
  - [x] 8.3 Add Specs dynamic row UI to `ProductFormPage`

- [x] 9. Implement `ProductFormPage` — Compatibility, Relations, Optional fields, and submit logic
  - [x] 9.1 Add Compatible Machines preset checkboxes to `ProductFormPage`
  - [x] 9.2 Add Related IDs, Variant IDs, and Optional fields to `ProductFormPage`
  - [x] 9.3 Wire form submit, cancel, and edit-mode loading/not-found states
  - [x] 9.4 Create route pages for create and edit

- [x] 10. Checkpoint — Admin CRUD complete

- [x] 11. Update `BuyOnAmazonButton` with availability logic
  - [x] 11.1 Update `BuyOnAmazonButton` props and rendering logic

- [x] 12. Migrate public product pages to DynamoDB
  - [x] 12.1 Create or extend server-side Amplify client utility
  - [x] 12.2 Update `app/products/page.tsx` to fetch from DynamoDB
  - [x] 12.3 Update `app/products/[slug]/page.tsx` to fetch from DynamoDB

- [x] 13. Write the one-time migration script
  - [x] 13.1 Create `scripts/migrate-products.ts`

- [x] 14. Remove the static products file and finalize
  - [x] 14.1 Replace all remaining `lib/products.ts` imports and remove the file
  - [x] 14.2 Update `public/sitemap.xml` with a comment noting product URLs are now dynamically managed

- [x] 15. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- `features` and `specs` are stored as JSON strings in DynamoDB and must always be serialized/deserialized via `fromProductDB`/`toProductDB`
- `compatiblePresets` in the form maps to full machine name arrays on submit — never store preset keys in DynamoDB
- The `icon` field on `FeatureItem` is always hardcoded to `"zap"` in new admin-created products; the UI does not expose it
- Slug auto-generation stops once the admin manually edits the slug field (tracked via `slugManuallyEdited` ref)
- Property tests use `fast-check` which is already in the project

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "2.4"] },
    { "id": 2, "tasks": ["2.3", "3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 5, "tasks": ["6.2", "7.1"] },
    { "id": 6, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 7, "tasks": ["9.1", "9.2"] },
    { "id": 8, "tasks": ["9.3", "9.4", "11.1", "12.1", "13.1"] },
    { "id": 9, "tasks": ["11.2", "12.2", "13.2"] },
    { "id": 10, "tasks": ["12.3"] },
    { "id": 11, "tasks": ["14.1"] },
    { "id": 12, "tasks": ["14.2"] }
  ]
}
```
