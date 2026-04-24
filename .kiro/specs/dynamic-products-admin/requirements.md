# Requirements Document

## Introduction

This feature migrates the mokhaLab product catalog from a static TypeScript file (`lib/products.ts`) to a dynamic system backed by DynamoDB via AWS Amplify Gen 2 (AppSync + DynamoDB). It also introduces admin pages — consistent with the existing admin portal — that allow authenticated administrators to create, edit, and delete products. Public-facing product pages continue to work without interruption, now reading from DynamoDB instead of the static file.

## Glossary

- **Product**: A mokhaLab item for sale, described by the fields defined in `lib/products.ts` (id, slug, name, tagline, description, prices, images, amazonUrls, features, specs, compatibleMachines, youtubeId, relatedIds, variantIds, rating, ratingCount).
- **Product_Model**: The DynamoDB-backed Amplify Data model that stores Product records.
- **Admin**: An authenticated Cognito user with access to the `/admin` portal.
- **Admin_Portal**: The existing Next.js admin section under `app/admin/`, built with Cloudscape Design System.
- **Product_Form**: The Cloudscape-based form used to create or edit a Product.
- **Product_List_Page**: The admin page at `/admin/products` that displays all Products in a Cloudscape Table.
- **Product_Detail_Page**: The public-facing Next.js page at `/products/[slug]` that renders a single Product.
- **Static_File**: The legacy `lib/products.ts` file that previously defined all Products.
- **Slug**: A URL-safe, lowercase, hyphen-separated string derived from the product name, used as the URL path segment.
- **Feature_Item**: A sub-object within a Product containing `icon`, `title`, and `description` fields.
- **Spec_Item**: A sub-object within a Product containing `label` and `value` fields.
- **AmazonUrls**: An object containing optional `us` and `ca` Amazon storefront URLs for a Product.
- **Migration_Script**: A one-time script that seeds DynamoDB with all Products currently defined in the Static_File.

---

## Requirements

### Requirement 1: Product Data Model

**User Story:** As a developer, I want a DynamoDB-backed Product model defined in the Amplify schema, so that product data can be stored, queried, and mutated via AppSync.

#### Acceptance Criteria

1. THE Product_Model SHALL define the following fields: `id` (string, required), `slug` (string, required), `name` (string, required), `tagline` (string, required), `description` (string, required), `priceUSD` (float, required), `priceCAD` (float, required), `image` (string, required), `images` (string list, required), `amazonUrlUS` (string, optional), `amazonUrlCA` (string, optional), `availableUS` (boolean, required, default true), `availableCA` (boolean, required, default true), `features` (string, required — JSON-encoded array of Feature_Items), `specs` (string, required — JSON-encoded array of Spec_Items), `compatibleMachines` (string list, required), `youtubeId` (string, optional), `relatedIds` (string list, required), `variantIds` (string list, optional), `rating` (float, optional), `ratingCount` (integer, optional).
2. THE Product_Model SHALL allow authenticated users to perform create, update, and delete operations.
3. THE Product_Model SHALL allow public API key access to perform read operations only.
4. THE Product_Model SHALL use `slug` as a secondary index to enable efficient lookup by slug.

---

### Requirement 2: Data Migration

**User Story:** As a developer, I want all existing products from the static file seeded into DynamoDB, so that no product data is lost during the migration.

#### Acceptance Criteria

1. THE Migration_Script SHALL read all Product entries from the Static_File and write each one to DynamoDB via the Amplify Data client.
2. WHEN a Product with the same `id` already exists in DynamoDB, THE Migration_Script SHALL skip that Product without overwriting it.
3. WHEN the Migration_Script completes, THE Migration_Script SHALL output a summary listing the count of products created and the count skipped.
4. IF the Migration_Script encounters a write error for a Product, THEN THE Migration_Script SHALL log the product `id` and error message and continue processing remaining products.

---

### Requirement 3: Public Product Data Access

**User Story:** As a site visitor, I want product pages to load data from DynamoDB, so that the catalog reflects the latest admin-managed content.

#### Acceptance Criteria

1. WHEN a visitor navigates to `/products/[slug]`, THE Product_Detail_Page SHALL fetch the matching Product from DynamoDB using the slug.
2. IF no Product with the requested slug exists in DynamoDB, THEN THE Product_Detail_Page SHALL render a 404 not-found response.
3. THE Product_Detail_Page SHALL use the public API key authorization mode when fetching Product data.
4. THE Product_Detail_Page SHALL render all Product fields (name, tagline, description, prices, images, features, specs, compatibleMachines, amazonUrls, relatedIds, variantIds) identically to the current static implementation.
5. WHEN the `/products` listing page is rendered, THE Products_Listing_Page SHALL fetch all Products from DynamoDB and display them.

---

### Requirement 4: Admin Product List

**User Story:** As an Admin, I want to view all products in a table on the admin portal, so that I can see the current catalog and navigate to edit or delete any product.

#### Acceptance Criteria

1. THE Product_List_Page SHALL display all Products in a Cloudscape Table with columns for Name, Slug, USD Price, and CAD Price.
2. THE Product_List_Page SHALL use `variant="full-page"` on the Table and `variant="awsui-h1-sticky"` on the page header.
3. THE Product_List_Page SHALL include a "Create product" button in the page header that navigates to `/admin/products/new`.
4. WHEN an Admin selects one or more rows in the table, THE Product_List_Page SHALL enable an "Edit" action button that navigates to `/admin/products/[id]/edit`.
5. WHEN an Admin selects one or more rows in the table, THE Product_List_Page SHALL enable a "Delete" action button.
6. THE Product_List_Page SHALL support column-based sorting for the Name and USD Price columns.
7. THE Product_List_Page SHALL use `trackBy="id"` on the Table component.
8. WHEN the Product_List_Page is loading data, THE Product_List_Page SHALL display the Cloudscape Table loading state.
9. IF fetching products from DynamoDB fails, THEN THE Product_List_Page SHALL display an error notification via the NotificationContext Flashbar.

---

### Requirement 5: Admin Product Creation

**User Story:** As an Admin, I want to create a new product via a form, so that I can add products to the catalog without editing code.

#### Acceptance Criteria

1. THE Product_Form SHALL include fields for: Name, Slug, Tagline, Description, USD Price, CAD Price, Main Image path, Additional Images (multi-value), Amazon URL (US), Amazon URL (CA), Available in US (checkbox), Available in Canada (checkbox), Features (JSON), Specs (JSON), Compatible Machines (multi-value), YouTube ID, Related Product IDs (multi-value), Variant IDs (multi-value), Rating, and Rating Count.
2. THE Product_Form SHALL mark Name, Tagline, Description, Main Image, Features, and Specs as required fields.
3. WHEN an Admin enters a value in the Name field, THE Product_Form SHALL auto-generate the Slug field value using the same slug generation rules as the blog post form (lowercase, spaces to hyphens, strip non-alphanumeric).
4. WHEN an Admin manually edits the Slug field, THE Product_Form SHALL preserve the manually entered value and stop auto-generating from the Name.
5. WHEN an Admin submits the Product_Form with valid data, THE Product_Form SHALL create a new Product record in DynamoDB and navigate to the Product_List_Page.
6. WHEN an Admin submits the Product_Form with invalid data, THE Product_Form SHALL display inline validation errors on the relevant fields without submitting.
7. IF a Product with the same `slug` already exists in DynamoDB, THEN THE Product_Form SHALL display a validation error on the Slug field indicating the slug is already in use.
8. IF creating the Product in DynamoDB fails, THEN THE Product_Form SHALL display an error notification via the NotificationContext Flashbar and remain on the form.
9. WHEN the Product is successfully created, THE Product_Form SHALL display a success notification via the NotificationContext Flashbar.
10. THE Product_Form SHALL use `react-hook-form` with `zodResolver`, `mode: "onBlur"`, and `reValidateMode: "onChange"`.
11. THE Product_Form SHALL use Cloudscape form components consistent with the existing blog post form conventions.

---

### Requirement 6: Admin Product Editing

**User Story:** As an Admin, I want to edit an existing product, so that I can update its details without touching code.

#### Acceptance Criteria

1. WHEN an Admin navigates to `/admin/products/[id]/edit`, THE Product_Form SHALL pre-populate all fields with the existing Product data fetched from DynamoDB.
2. IF the Product with the given `id` does not exist in DynamoDB, THEN THE Product_Form SHALL display an error notification and redirect to the Product_List_Page.
3. WHEN an Admin submits the edit Product_Form with valid data, THE Product_Form SHALL update the existing Product record in DynamoDB and navigate to the Product_List_Page.
4. WHEN an Admin submits the edit Product_Form with invalid data, THE Product_Form SHALL display inline validation errors without submitting.
5. WHEN the Product is successfully updated, THE Product_Form SHALL display a success notification via the NotificationContext Flashbar.
6. IF updating the Product in DynamoDB fails, THEN THE Product_Form SHALL display an error notification via the NotificationContext Flashbar and remain on the form.
7. WHILE the Product data is loading on the edit page, THE Product_Form SHALL display a loading indicator.

---

### Requirement 7: Admin Product Deletion

**User Story:** As an Admin, I want to delete a product, so that I can remove discontinued items from the catalog.

#### Acceptance Criteria

1. WHEN an Admin clicks the "Delete" action on the Product_List_Page, THE Admin_Portal SHALL display a Cloudscape Modal asking the Admin to confirm deletion, showing the product name.
2. WHEN an Admin confirms deletion in the modal, THE Admin_Portal SHALL delete the Product record from DynamoDB.
3. WHEN a Product is successfully deleted, THE Admin_Portal SHALL remove the product from the table and display a success notification via the NotificationContext Flashbar.
4. IF deleting the Product from DynamoDB fails, THEN THE Admin_Portal SHALL display an error notification via the NotificationContext Flashbar and keep the product in the table.
5. WHEN an Admin cancels the deletion modal, THE Admin_Portal SHALL close the modal and take no action.
6. THE Admin_Portal SHALL support deleting multiple selected Products in a single confirmation flow.

---

### Requirement 8: Admin Navigation

**User Story:** As an Admin, I want the Products section to be accessible from the admin sidebar, so that I can navigate to it from anywhere in the portal.

#### Acceptance Criteria

1. THE Admin_Portal SHALL include a "Products" navigation item in the SideNavigation component linking to `/admin/products`.
2. WHEN an Admin is on any page under `/admin/products`, THE Admin_Portal SHALL highlight the "Products" navigation item as active.

---

### Requirement 10: Marketplace Availability

**User Story:** As an Admin, I want to mark a product as available or unavailable per marketplace (US / Canada), so that the buy button on the product page reflects actual stock and storefront availability.

#### Acceptance Criteria

1. THE Product_Model SHALL store two boolean availability flags: `availableUS` (default true) and `availableCA` (default true).
2. THE Product_Form SHALL include an "Availability" section with two checkboxes: "Available in US" and "Available in Canada", both checked by default on create.
3. WHEN a visitor views a product page and their detected country is Canada, THE Product_Detail_Page SHALL use `availableCA` to determine availability.
4. WHEN a visitor views a product page and their detected country is US (or unknown), THE Product_Detail_Page SHALL use `availableUS` to determine availability.
5. WHEN the product is available in the visitor's marketplace AND an Amazon URL exists for that marketplace, THE Product_Detail_Page SHALL display the Buy on Amazon button linking to that marketplace URL.
6. WHEN the product is available in the visitor's marketplace but no Amazon URL exists for that marketplace, THE Product_Detail_Page SHALL fall back to the other marketplace's URL if one exists.
7. WHEN the product is unavailable in the visitor's marketplace, THE Product_Detail_Page SHALL display a disabled "Out of Stock" button regardless of whether an Amazon URL exists for that marketplace.
8. WHEN both `availableUS` and `availableCA` are false, THE Product_Detail_Page SHALL display a disabled "Out of Stock" button.
9. THE Migration_Script SHALL set `availableUS` and `availableCA` to true for all migrated products.

---

### Requirement 9: Static File Removal

**User Story:** As a developer, I want the static products file to be removed after migration, so that the codebase has a single source of truth for product data.

#### Acceptance Criteria

1. WHEN the DynamoDB migration is complete and verified, THE System SHALL remove all imports of the Static_File from public-facing pages and replace them with DynamoDB data fetching calls.
2. THE System SHALL remove the Static_File (`lib/products.ts`) from the codebase after all references have been replaced.
3. WHEN the Static_File is removed, THE System SHALL ensure the `generateStaticParams` function on the Product_Detail_Page fetches slugs from DynamoDB instead of the Static_File.
4. THE System SHALL update `public/sitemap.xml` to reflect that product URLs are now dynamically managed and should be maintained manually or via a generation script.
