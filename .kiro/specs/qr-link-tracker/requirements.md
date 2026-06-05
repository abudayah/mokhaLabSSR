# Requirements Document

## Introduction

The QR Code Link Tracker is a feature for the mokhaLab admin portal that allows administrators to create short links paired with downloadable QR codes, and track click analytics (device type and geographic location) per link. Short codes are auto-generated (4–6 random alphanumeric characters) with optional admin override. A public Next.js route (`/go/[code]`) handles redirects and records click events for unauthenticated visitors. Authenticated admins manage links and view analytics via two new pages added to the admin portal under `/admin/qr-links`.

---

## Glossary

- **QR Link**: A record containing a short code, a destination URL, an optional label, and aggregate click metadata stored in DynamoDB via Amplify Data.
- **Short Code**: A 4–6 character random alphanumeric string (e.g. `FO89`, `X7K2`) that uniquely identifies a QR Link and forms the redirect path `/go/[code]`.
- **Click Event**: A single recorded visit to a redirect URL (whether from a QR scan or a direct link click), capturing timestamp, raw User-Agent string, raw IP address, and optional referer. Device type and location are derived later in the admin UI.
- **QR Code Image**: An SVG-format image encoding the full redirect URL (`https://www.mokhalab.com/go/[code]`), downloadable from the admin portal.
- **Redirect Handler**: The Next.js API route at `app/go/[code]/route.ts` that resolves the short code, records a Click Event with raw request metadata, and issues an HTTP 302 redirect to the destination URL — with zero external API calls on the hot path.
- **Deferred Analytics Processing**: Device type classification (via UA parser) and IP geolocation lookups happen client-side in the admin detail page when an admin views analytics, keeping the redirect path fast.
- **QR Links List Page**: The admin page at `/admin/qr-links` listing all QR Links with click summaries.
- **QR Links Detail Page**: The admin page at `/admin/qr-links/[id]` showing per-link analytics charts, processing raw Click Event data on load.
- **QR Link Store**: The React context (`QrLinkStoreContext`) providing CRUD operations and local state for QR Links in the admin portal.
- **IP Geolocation API**: A third-party free-tier HTTP API (e.g. `ip-api.com`) called client-side in the admin detail page to resolve stored IP addresses to country and region — never called on the redirect hot path.
- **UA Parser**: A client-side library (e.g. `ua-parser-js`) used in the admin detail page to classify stored raw User-Agent strings into `mobile`, `tablet`, or `desktop`.
- **Device Type**: A classification of a raw User-Agent string into one of three categories: `mobile`, `tablet`, or `desktop`, derived in the admin UI.
- **AdminLayout**: The existing `AdminLayout.tsx` Cloudscape `AppLayout` shell shared across all admin portal pages.
- **NotificationContext**: The existing Flashbar-based notification system used throughout the admin portal.

---

## Requirements

### Requirement 1: QR Link Data Model

**User Story:** As an admin, I want QR Link records and their Scan Events persisted in DynamoDB so that data survives across sessions and is queryable for analytics.

#### Acceptance Criteria

1. THE Amplify Data Schema SHALL define a `QrLink` model with fields: `id` (auto UUID), `code` (required string, unique), `destinationUrl` (required string), `label` (optional string), `createdAt` (auto timestamp), `clickCount` (integer, default 0), `lastClickedAt` (optional string).
2. THE Amplify Data Schema SHALL define a `ClickEvent` model with fields: `id` (auto UUID), `qrLinkId` (required string), `clickedAt` (required ISO 8601 string), `userAgent` (optional string), `ip` (optional string), `referer` (optional string).
3. THE `QrLink` model SHALL use authorization rules that allow `authenticated` users full access and deny all public (unauthenticated) access.
4. THE `ClickEvent` model SHALL use authorization rules that allow `authenticated` users read access and allow unauthenticated public API key access to create-only operations so the Redirect Handler can record clicks without a Cognito session.
5. WHEN the Amplify backend is deployed, THE Amplify Data Schema SHALL expose both `QrLink` and `ClickEvent` models via the AppSync GraphQL API.

---

### Requirement 2: Short Code Generation

**User Story:** As an admin, I want short codes generated automatically so that I don't need to invent unique codes manually, while still being able to provide a custom code when needed.

#### Acceptance Criteria

1. WHEN an admin submits the create-link form without entering a custom code, THE QR Link Store SHALL generate a random alphanumeric short code between 4 and 6 characters in length.
2. WHEN generating a short code, THE QR Link Store SHALL use only characters from the set `[A-Z0-9]` (uppercase letters and digits).
3. WHEN a generated short code already exists in the current QrLink dataset, THE QR Link Store SHALL regenerate the code until a unique value is found, up to 10 attempts.
4. IF a unique code cannot be found within 10 attempts, THEN THE QR Link Store SHALL return an error indicating code generation failed.
5. WHEN an admin enters a custom short code, THE QR Link Store SHALL validate that the code matches the pattern `^[A-Za-z0-9]{4,6}$` before submission.
6. IF an admin-entered custom code already exists in DynamoDB, THEN THE QR Link Store SHALL return an error with the message "This short code is already in use."

---

### Requirement 3: Public Redirect Handler

**User Story:** As a QR code scanner (unauthenticated public visitor), I want scanning a QR code to redirect me to the intended destination so that I arrive at the correct page immediately.

#### Acceptance Criteria

1. WHEN an HTTP GET request is received at `/go/[code]`, THE Redirect Handler SHALL look up the corresponding `QrLink` record by the `code` value.
2. WHEN a matching `QrLink` is found, THE Redirect Handler SHALL respond with HTTP status 302 and a `Location` header set to the `destinationUrl` of the matching record.
3. WHEN a matching `QrLink` is found, THE Redirect Handler SHALL create a `ClickEvent` record capturing: the current ISO 8601 timestamp as `clickedAt`, the raw `User-Agent` header as `userAgent`, the visitor IP from `x-forwarded-for` or `cf-connecting-ip` headers as `ip`, and the `Referer` header as `referer`.
4. IF no `QrLink` matches the requested code, THEN THE Redirect Handler SHALL respond with HTTP status 404.
5. THE Redirect Handler SHALL NOT call any external API (geolocation or otherwise) on the redirect hot path.
6. WHEN recording a Click Event, THE Redirect Handler SHALL increment the `clickCount` field on the parent `QrLink` record by 1.
7. WHEN recording a Click Event, THE Redirect Handler SHALL update the `lastClickedAt` field on the parent `QrLink` record to the current ISO 8601 timestamp.
8. THE Redirect Handler SHALL issue the 302 redirect response immediately and record the Click Event asynchronously using `waitUntil` (or equivalent) so that DynamoDB writes do not block the redirect latency.
9. THE Redirect Handler SHALL use the public API key auth mode for the `ClickEvent` create mutation so that no Cognito session is required.

---

### Requirement 4: QR Code Image Generation

**User Story:** As an admin, I want to download a QR code as an SVG file so that I can print or embed it in marketing materials.

#### Acceptance Criteria

1. WHEN an admin views a QR Link record (either in the list or detail page), THE Admin UI SHALL display a button labeled "Download QR Code".
2. WHEN an admin clicks "Download QR Code", THE Admin UI SHALL generate an SVG-format QR code encoding the URL `https://www.mokhalab.com/go/[code]`.
3. WHEN generating the QR code SVG, THE Admin UI SHALL use a client-side QR code library compatible with Next.js 14 App Router and TypeScript strict mode.
4. WHEN the SVG is generated, THE Admin UI SHALL trigger a browser file download with the filename `qr-[code].svg`.
5. THE generated QR code SVG SHALL encode the full public redirect URL including the domain, not just the short code path.

---

### Requirement 5: Admin QR Links List Page

**User Story:** As an admin, I want a paginated table of all QR Links so that I can see an overview of all short links and their usage.

#### Acceptance Criteria

1. THE Admin UI SHALL provide a page at `/admin/qr-links` rendering a Cloudscape `Table` component with `variant="full-page"`.
2. THE QR Links List Page SHALL display the following columns for each QR Link: Label (or short code if label is absent), Short Code, Destination URL, Click Count, Last Clicked (formatted date or "Never"), and an Actions column.
3. WHEN the QR Links List Page loads, THE QR Link Store SHALL fetch all `QrLink` records from DynamoDB and display them sorted by `createdAt` descending.
4. THE QR Links List Page SHALL include a primary action button labeled "Create QR Link" in the table header.
5. WHEN an admin clicks a short code or label in the table, THE Admin UI SHALL navigate to the QR Links Detail Page for that record.
6. THE QR Links List Page SHALL display a "Download QR Code" action for each row.
7. THE QR Links List Page SHALL display a "Delete" action for each row.
8. WHILE the QR Links List Page is loading data, THE Admin UI SHALL display the Cloudscape `Table` loading state.
9. IF no QR Links exist, THEN THE Admin UI SHALL display the Cloudscape `Table` empty state with a prompt to create the first link.

---

### Requirement 6: Create QR Link Form

**User Story:** As an admin, I want a form to create a new QR Link so that I can generate short links with QR codes for campaigns.

#### Acceptance Criteria

1. THE Admin UI SHALL render the Create QR Link form as a Cloudscape `Modal` or dedicated page accessible from the QR Links List Page.
2. THE Create QR Link form SHALL include a "Destination URL" field (required), a "Label" field (optional), and a "Custom Short Code" field (optional, 4–6 alphanumeric characters).
3. WHEN the "Destination URL" field value does not match a valid HTTP/HTTPS URL pattern, THE Admin UI SHALL display a validation error on blur.
4. WHEN the "Custom Short Code" field value does not match `^[A-Za-z0-9]{4,6}$`, THE Admin UI SHALL display a validation error on change.
5. WHEN the admin submits the form with valid data, THE QR Link Store SHALL create the `QrLink` record in DynamoDB and close the form.
6. WHEN a QR Link is successfully created, THE Admin UI SHALL display a success notification via NotificationContext with the message "QR Link created."
7. IF the QR Link creation fails, THEN THE Admin UI SHALL display a persistent error notification via NotificationContext with the error message.
8. THE Create QR Link form SHALL use `react-hook-form` with `zodResolver` and a Zod schema for validation.
9. THE Create QR Link form SHALL use Cloudscape form components consistent with the admin portal form conventions.

---

### Requirement 7: Delete QR Link

**User Story:** As an admin, I want to delete a QR Link with a confirmation step so that I don't accidentally remove active links.

#### Acceptance Criteria

1. WHEN an admin clicks the "Delete" action for a QR Link, THE Admin UI SHALL display a Cloudscape `Modal` confirmation dialog.
2. THE confirmation modal SHALL display the message "Delete short link [code]? This will permanently remove the link and all click history." and offer "Cancel" and "Delete" buttons.
3. WHEN an admin confirms deletion, THE QR Link Store SHALL delete the `QrLink` record and all associated `ClickEvent` records from DynamoDB.
4. WHEN deletion succeeds, THE Admin UI SHALL remove the row from the table and display a success notification via NotificationContext with the message "QR Link deleted."
5. IF deletion fails, THEN THE Admin UI SHALL display a persistent error notification via NotificationContext with the error message.
6. WHEN an admin clicks "Cancel" in the confirmation modal, THE Admin UI SHALL close the modal and take no further action.

---

### Requirement 8: Admin QR Links Detail Page

**User Story:** As an admin, I want a detail page for each QR Link showing analytics charts so that I can understand traffic patterns and campaign performance.

#### Acceptance Criteria

1. THE Admin UI SHALL provide a page at `/admin/qr-links/[id]` rendering the QR Link detail view.
2. WHEN the QR Links Detail Page loads, THE Admin UI SHALL fetch all `ClickEvent` records associated with the `QrLink` identified by `id`.
3. THE QR Links Detail Page SHALL display a "Clicks Over Time" chart showing click counts grouped by day for the trailing 30 days, derived from the `clickedAt` timestamps of stored `ClickEvent` records.
4. THE QR Links Detail Page SHALL display a "Device Type Breakdown" chart showing the proportion of clicks by device category (`mobile`, `tablet`, `desktop`), derived by parsing the stored `userAgent` strings client-side using a UA parser library.
5. THE QR Links Detail Page SHALL display a "Location Breakdown" chart showing the top 10 countries by click count, derived by calling the IP Geolocation API client-side with the stored `ip` values from `ClickEvent` records.
6. THE QR Links Detail Page SHALL display the QR Link metadata: label, short code, destination URL, total click count, and creation date.
7. THE QR Links Detail Page SHALL include a "Download QR Code" button that triggers SVG download as defined in Requirement 4.
8. WHILE the QR Links Detail Page is loading click data, THE Admin UI SHALL display Cloudscape loading indicators in place of the charts.
9. IF a `QrLink` with the requested `id` does not exist, THEN THE Admin UI SHALL display a Cloudscape `Alert` with type "error" and the message "QR Link not found."
10. IF no Click Events exist for the QR Link, THEN THE Admin UI SHALL display empty state messages in place of the charts.

---

### Requirement 9: Admin Navigation

**User Story:** As an admin, I want a "QR Links" entry in the side navigation so that I can access the feature from anywhere in the admin portal.

#### Acceptance Criteria

1. THE AdminLayout SHALL include a `SideNavigation` item with `text: "QR Links"` and `href: "/admin/qr-links"`.
2. WHEN the current pathname starts with `/admin/qr-links`, THE AdminLayout SHALL set the `activeHref` of the `SideNavigation` to `"/admin/qr-links"`.
3. THE `getActiveHref` function in `AdminLayout.tsx` SHALL be updated to handle the `/admin/qr-links` prefix.

---

### Requirement 10: Admin Providers Integration

**User Story:** As an admin, I want QR Link data accessible throughout the admin portal so that any page can read or mutate link records without redundant fetching.

#### Acceptance Criteria

1. THE `AdminProviders` component SHALL wrap the portal layout with a `QrLinkStoreProvider` that makes QR Link state available via React context.
2. THE `QrLinkStoreProvider` SHALL use `generateClient<Schema>({ authMode: "userPool" })` for all mutations and authenticated reads.
3. WHEN the `QrLinkStoreProvider` mounts, THE QR Link Store SHALL fetch and cache all `QrLink` records from DynamoDB.
4. THE `useQrLinkStore` hook SHALL be the sole mechanism for consuming the `QrLinkStoreContext` within admin components.
