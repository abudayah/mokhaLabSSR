# Implementation Plan: QR Code Link Tracker

## Overview

Adds short-link management with QR code generation and click analytics to the mokhaLab admin portal. Follows the exact file/folder pattern of the `blog` feature. Two DynamoDB models (`QrLink`, `ClickEvent`) back a public redirect route at `/go/[code]` and two authenticated admin pages at `/admin/qr-links`. Charts use the legacy Cloudscape `BarChart` and `PieChart` — no new chart library. Only `qrcode` + `@types/qrcode` are added as new dependencies.

---

## Tasks

- [x] 1. Install new dependencies and extend the Amplify Data schema
  - [x] 1.1 Install `qrcode` and `@types/qrcode` packages
    - Run `npm install qrcode@^1.5.4` and `npm install --save-dev @types/qrcode@^1.5.5` in the project root
    - Verify the packages appear in root `package.json` (never `amplify/package.json`)
    - _Requirements: 4.3_

  - [x] 1.2 Add `QrLink` and `ClickEvent` models to `amplify/data/resource.ts`
    - Add `QrLink` model with fields: `code` (required string), `destinationUrl` (required string), `label` (optional string), `clickCount` (integer, default 0), `lastClickedAt` (optional string)
    - Add `ClickEvent` model with fields: `qrLinkId` (required string), `clickedAt` (required string), `userAgent` (optional string), `ip` (optional string), `referer` (optional string)
    - `QrLink` authorization: `allow.authenticated()` only
    - `ClickEvent` authorization: `allow.authenticated().to(["read","create","update","delete"])` + `allow.publicApiKey().to(["create"])`
    - Keep existing `BlogPost` model and `authorizationModes` config unchanged
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Add TypeScript types and shared interfaces
  - [x] 2.1 Create `lib/qr-links.ts` with core interfaces
    - Export `QrLink` interface: `id`, `code`, `destinationUrl`, `label?`, `createdAt`, `clickCount`, `lastClickedAt?`
    - Export `ClickEvent` interface: `id`, `qrLinkId`, `clickedAt`, `userAgent?`, `ip?`, `referer?`, `createdAt`
    - Export `DeviceType` type: `"mobile" | "tablet" | "desktop"`
    - Export `DerivedClickData` interface: `deviceType: DeviceType`, `country?: string`, `region?: string`
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Update `app/admin/_components/types/admin.ts` to export `QrLinkFormData`
    - Import and re-export `type QrLinkFormData` inferred from `qrLinkSchema` (mirrors the `BlogPostFormData` pattern)
    - _Requirements: 6.2_

- [x] 3. Implement utility functions
  - [x] 3.1 Create `app/admin/_components/utils/shortCodeUtils.ts`
    - Implement `generateShortCode(): string` — random 4–6 char string from `[A-Z0-9]`
    - Implement `validateShortCode(code: string): boolean` — tests `^[A-Za-z0-9]{4,6}$`
    - Implement `generateUniqueCode(existingCodes: Set<string>): Promise<string>` — retries up to 10 times, throws on exhaustion
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 3.2 Write property test for `generateShortCode` (Property 1)
    - **Property 1: Short code generator produces valid codes**
    - Every call returns a string matching `^[A-Z0-9]{4,6}$`
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 3.3 Write property test for `validateShortCode` (Property 2)
    - **Property 2: Short code validator accepts exactly the right inputs**
    - Returns `true` iff input matches `^[A-Za-z0-9]{4,6}$`; `false` for empty, too-short, too-long, special chars
    - **Validates: Requirements 2.5, 6.4**

  - [ ]* 3.4 Write property test for `generateUniqueCode` (Property 3)
    - **Property 3: Unique code generation succeeds when collision space is available**
    - Result not in the input set; result is valid per Property 1; completes within 10 attempts for sets < 10 members
    - **Validates: Requirements 2.3**

  - [x] 3.5 Create `app/admin/_components/utils/deviceUtils.ts`
    - Implement `parseDeviceType(userAgent: string): DeviceType`
    - Priority order: tablet check → mobile check → desktop fallback
    - Never throws; always returns one of the three valid values
    - _Requirements: 8.4_

  - [ ]* 3.6 Write property test for `parseDeviceType` (Property 4)
    - **Property 4: Device type classification always produces a valid category**
    - For any string input, returns exactly one of `"mobile"`, `"tablet"`, `"desktop"` — never throws
    - **Validates: Requirements 8.4**

  - [x] 3.7 Create `app/admin/_components/utils/qrCodeUtils.ts`
    - Implement `generateQrSvg(code: string): Promise<string>` using `qrcode.toString(url, { type: "svg", errorCorrectionLevel: "M" })`
    - URL encodes `https://www.mokhalab.com/go/${code}` — full canonical redirect URL
    - Implement `downloadQrSvg(svgString: string, code: string): void` — creates blob, triggers `<a>` click with filename `qr-${code}.svg`, revokes object URL
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [ ]* 3.8 Write property test for `generateQrSvg` (Property 9)
    - **Property 9: QR SVG encodes the full canonical redirect URL**
    - SVG output contains the string `https://www.mokhalab.com/go/${code}` for any valid code
    - **Validates: Requirements 4.2, 4.5**

  - [x] 3.9 Create `app/admin/_components/utils/geoUtils.ts`
    - Implement `fetchGeoLocation(ip: string): Promise<{ country: string | null; region: string | null }>`
    - Short-circuit for loopback IPs (`127.0.0.1`, `::1`) → return `{ country: null, region: null }`
    - Use `fetch` with `AbortSignal.timeout(3000)` against `http://ip-api.com/json/${ip}?fields=country,regionName`
    - Catch all errors and return `{ country: null, region: null }` — never throws
    - Implement `resolveGeoForEvents(events: ClickEvent[]): Promise<Map<string, { country: string | null; region: string | null }>>`
    - Deduplicate IPs before calling; use `Promise.all` for concurrent resolution
    - _Requirements: 8.5_

  - [x] 3.10 Create `app/admin/_components/utils/analyticsUtils.ts`
    - Implement `groupClicksByDay(events: ClickEvent[], days?: number): Array<{ date: string; count: number }>`
    - Trailing `days` (default 30) window; dates in `YYYY-MM-DD` format; zero-fills missing days
    - Implement `groupByDeviceType(events: ClickEvent[]): Array<{ type: DeviceType; count: number }>`
    - Uses `parseDeviceType` from `deviceUtils.ts`; always returns entries for all three device types
    - Implement `topCountries(geoResults: Array<{ country: string | null }>, limit?: number): Array<{ country: string; count: number }>`
    - Defaults to top 10; sorts descending by count; filters out null countries
    - _Requirements: 8.3, 8.4, 8.5_

  - [ ]* 3.11 Write property test for `groupClicksByDay` (Property 10)
    - **Property 10: Clicks-over-time aggregation preserves total count**
    - Sum of all `count` values equals `events.length` for any input array
    - **Validates: Requirements 8.3**

  - [ ]* 3.12 Write property test for `groupByDeviceType` (Property 11)
    - **Property 11: Device breakdown proportions sum to total click count**
    - Sum of all `count` values equals `events.length`; each `type` is one of the three valid values
    - **Validates: Requirements 8.4**

  - [ ]* 3.13 Write property test for `topCountries` (Property 12)
    - **Property 12: Top-countries list is sorted and bounded**
    - At most 10 entries; each `count` is a positive integer; entries are in descending order by `count`
    - **Validates: Requirements 8.5**

- [x] 4. Checkpoint — Verify all utility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add Zod schema and store context
  - [x] 5.1 Create `app/admin/_components/schemas/qrLinkSchema.ts`
    - Implement Zod schema with: `destinationUrl` (required, `.url()`), `label` (optional string), `customCode` (optional string with `^[A-Za-z0-9]{4,6}$` regex or `z.literal("")`)
    - Export `QrLinkFormData` type inferred from the schema
    - _Requirements: 6.2, 6.3, 6.4, 6.8_

  - [x] 5.2 Create `app/admin/_components/context/QrLinkStoreContext.tsx`
    - Mirror `BlogPostStoreContext.tsx` structure exactly (`"use client"`, `createContext`, `useState`, `useEffect`, `useMemo`)
    - Use `generateClient<Schema>({ authMode: "userPool" })` for all operations
    - Export `QrLinkStoreValue` interface with: `links`, `loading`, `getLinkById`, `getLinkByCode`, `createLink`, `deleteLink`, `fetchClickEvents`
    - `createLink`: auto-generate code if `customCode` empty (using `generateUniqueCode`), validate uniqueness, call `client.models.QrLink.create`, prepend to `links` state
    - `deleteLink`: list all `ClickEvent` records by `qrLinkId`, batch delete them, then delete the `QrLink`
    - `fetchClickEvents(qrLinkId)`: on-demand fetch, not cached in store state
    - On mount: fetch all `QrLink` records sorted by `createdAt` descending
    - Export `QrLinkStoreContext`
    - _Requirements: 2.1, 2.3, 2.4, 2.6, 7.3, 10.1, 10.2, 10.3_

  - [x] 5.3 Create `app/admin/_components/context/useQrLinkStore.ts`
    - Export `useQrLinkStore` hook that reads `QrLinkStoreContext` — mirrors `useBlogPostStore.ts`
    - Throw if used outside `QrLinkStoreProvider`
    - _Requirements: 10.4_

- [x] 6. Wire providers and navigation into existing admin shell
  - [x] 6.1 Update `app/admin/_components/AdminProviders.tsx`
    - Import `QrLinkStoreProvider` from `QrLinkStoreContext`
    - Wrap `NotificationProvider` (and its children) with `<QrLinkStoreProvider>` inside the existing `BlogPostStoreProvider`
    - _Requirements: 10.1_

  - [x] 6.2 Update `app/admin/_components/AdminLayout.tsx`
    - Add `if (path.startsWith("/admin/qr-links")) return "/admin/qr-links"` to `getActiveHref` before the `/admin` base case
    - Add `{ type: "link", text: "QR Links", href: "/admin/qr-links" }` to the `SideNavigation` items array, after "Blog Posts"
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 7. Implement the public redirect handler
  - [x] 7.1 Create `app/go/[code]/route.ts`
    - Use `generateClient<Schema>()` (default API key auth mode — no `authMode` override)
    - Look up `QrLink` by `code` using `client.models.QrLink.list({ filter: { code: { eq: params.code } } })`
    - Return `NextResponse.json({ error: "Not found" }, { status: 404 })` if no match
    - Return `NextResponse.redirect(link.destinationUrl, 302)` immediately
    - Fire-and-forget `void Promise.all([ClickEvent.create(...), QrLink.update(...)])` with `.catch(() => {})`
    - Read headers: `user-agent`, `x-forwarded-for` (first IP), `cf-connecting-ip` fallback, `referer`
    - ClickEvent fields: `qrLinkId`, `clickedAt` (ISO 8601), `userAgent`, `ip`, `referer`
    - QrLink update fields: `clickCount: (link.clickCount ?? 0) + 1`, `lastClickedAt`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 8. Build the QR Links List Page and Create/Delete modals
  - [x] 8.1 Create `app/admin/_components/pages/QrLinksListPage.tsx`
    - Cloudscape `Table` with `variant="full-page"`, `trackBy="id"`, `sortingColumn`/`sortingDescending`/`onSortingChange` state
    - Columns: Label/Code (link to `/admin/qr-links/[id]`), Short Code, Destination URL, Click Count, Last Clicked (formatted or "Never"), Actions
    - Actions column: "Download QR Code" link-button (calls `downloadQrSvg`) and "Delete" link-button (opens `DeleteQrLinkModal`)
    - Table header: "Create QR Link" primary button (opens `CreateQrLinkModal`)
    - `loading` and `loadingText` props wired to store `loading`
    - Empty state with Cloudscape `Box` and "Create QR Link" CTA
    - `CreateQrLinkModal`: Cloudscape `Modal` with `react-hook-form` + `zodResolver(qrLinkSchema)`, `mode: "onBlur"`, `reValidateMode: "onChange"`, Cloudscape form controls; on submit calls `createLink(data)`; success notification "QR Link created."
    - `DeleteQrLinkModal`: Cloudscape `Modal` with confirmation text "Delete short link [code]? This will permanently remove the link and all click history." + "Cancel" / "Delete" buttons; on confirm calls `deleteLink(id)`; success notification "QR Link deleted."
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 7.1, 7.2, 7.4, 7.5, 7.6_

  - [x] 8.2 Create `app/admin/(portal)/qr-links/page.tsx`
    - Thin wrapper: `"use client"` + `import QrLinksListPage` + `export default function Page() { return <QrLinksListPage /> }`
    - _Requirements: 5.1_

- [x] 9. Build the QR Links Detail Page
  - [x] 9.1 Create `app/admin/_components/pages/QrLinkDetailPage.tsx`
    - Receive `id` prop from page file
    - On mount: call `getLinkById(id)`; if not found show Cloudscape `Alert` type="error" with "QR Link not found."
    - Fetch click events via `fetchClickEvents(id)` on load; show Cloudscape `Spinner` / loading indicator in place of each chart while loading
    - Header: link label/code + "Download QR Code" button (calls `generateQrSvg` then `downloadQrSvg`)
    - Metadata box: destination URL, total clicks, created date, short code
    - After events load: run `groupClicksByDay(events)` → "Clicks Over Time" Cloudscape `BarChart` (x=date, y=count, 30-day trailing)
    - Run `groupByDeviceType(events)` → "Device Type Breakdown" Cloudscape `PieChart`
    - Run `resolveGeoForEvents(events)` client-side → `topCountries(geoResults)` → "Location Breakdown" Cloudscape `BarChart` (horizontal, top 10)
    - Empty state messages when events array is empty
    - Geo failures handled gracefully: affected entries show "Unknown"; charts still render
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

  - [x] 9.2 Create `app/admin/(portal)/qr-links/[id]/page.tsx`
    - Thin wrapper: `"use client"` + `useParams` to extract `id` + `import QrLinkDetailPage` + render with `id` prop
    - _Requirements: 8.1_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All admin components require `"use client"` at the top — Cloudscape and Amplify hooks are browser-only
- Redirect handler (`app/go/[code]/route.ts`) uses default API key auth — do NOT pass `authMode: "userPool"`
- Admin store uses `authMode: "userPool"` — do NOT use the default API key client in admin components
- Charts use `BarChart` and `PieChart` from `@cloudscape-design/components` (already installed) — do NOT import from `@cloudscape-design/chart-components`
- `QrLinkFormData` is exported from both `schemas/qrLinkSchema.ts` (primary) and re-exported from `types/admin.ts` (for consistency with blog pattern)
- ip-api.com geolocation is called client-side in the detail page only — never on the redirect hot path
- Folder structure mirrors the blog feature exactly — thin `page.tsx` wrappers, logic in `_components/pages/`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1"] },
    { "id": 1, "tasks": ["2.2", "3.1", "3.5", "3.7", "3.9", "3.10"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.4", "3.6", "3.8", "3.11", "3.12", "3.13"] },
    { "id": 3, "tasks": ["5.1", "7.1"] },
    { "id": 4, "tasks": ["5.2", "5.3"] },
    { "id": 5, "tasks": ["6.1", "6.2", "8.1", "9.1"] },
    { "id": 6, "tasks": ["8.2", "9.2"] }
  ]
}
```
