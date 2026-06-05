# Design Document: QR Code Link Tracker

## Overview

The QR Code Link Tracker adds short-link management with QR code generation and click analytics to the mokhaLab admin portal. It follows the same folder/file patterns as the existing BlogPost feature — thin page wrappers, a React context store, Cloudscape UI throughout, and Amplify Data (AppSync + DynamoDB) for persistence.

Two new DynamoDB models (`QrLink`, `ClickEvent`) back a public redirect route at `/go/[code]` (unauthenticated) and two admin pages at `/admin/qr-links` (authenticated). The redirect handler stores raw User-Agent and IP on every click with zero external API calls — device type parsing (via UA regex) and IP geolocation lookups happen lazily in the admin detail page. Charts use the legacy Cloudscape `BarChart` and `PieChart` components (free, no Highcharts license required), keeping the UI fully within the existing Cloudscape design system.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Public visitor                                                  │
│                                                                  │
│  GET /go/[code]   ──►  app/go/[code]/route.ts (API Route)       │
│                         │                                        │
│                         ├── AppSync (API key) → QrLink lookup   │
│                         ├── Read User-Agent + IP from headers   │
│                         ├── AppSync (API key) → ClickEvent.create│
│                         │   (stores raw userAgent + ip)         │
│                         ├── AppSync (API key) → QrLink.update   │
│                         └── NextResponse.redirect(destinationUrl)│
│                              (redirect fires immediately;        │
│                               ClickEvent write is async)        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Admin portal (authenticated)                                    │
│                                                                  │
│  /admin/qr-links        → QrLinksListPage                       │
│  /admin/qr-links/[id]   → QrLinkDetailPage                     │
│                                                                  │
│  QrLinkStoreProvider (React context)                            │
│    generateClient<Schema>({ authMode: "userPool" })             │
│    ├── CRUD on QrLink                                           │
│    └── Read on ClickEvent (for detail page)                     │
│                                                                  │
│  Detail page processing (client-side, deferred):                │
│    ├── UA regex → deviceType (mobile/tablet/desktop)            │
│    └── ip-api.com → country/region (per unique IP, lazy)        │
│                                                                  │
│  QR SVG generation: client-side via `qrcode` npm package        │
│  Charts: Cloudscape legacy BarChart + PieChart (no license)     │
└─────────────────────────────────────────────────────────────────┘
```

### Key Decisions

- The redirect handler lives at `app/go/[code]/route.ts` as a **Next.js API Route** (Route Handler). It reads `User-Agent`, `x-forwarded-for`, and `Referer` headers, fires the 302 redirect immediately via `NextResponse.redirect()`, and records the `ClickEvent` asynchronously using `waitUntil` (or a fire-and-forget promise) — **zero external API calls on the hot path**.
- Device type is derived in the admin detail page client-side by running a simple UA regex against the stored `userAgent` string — no library needed, no server involvement.
- IP geolocation (ip-api.com) is called **client-side in the admin detail page only**, against the stored `ip` values, so it never blocks the redirect. Calls are batched per unique IP to stay within the free-tier rate limit (45 req/min).
- The admin store uses `authMode: "userPool"` for all mutations; the redirect handler uses the default `apiKey` auth mode (matching ClickEvent's public create-only rule).
- QR SVG is generated fully client-side using the [`qrcode`](https://www.npmjs.com/package/qrcode) package (`qrcode.toString(url, { type: 'svg' })`), avoiding any server round-trip.
- Charts use the **legacy Cloudscape `BarChart` and `PieChart`** from `@cloudscape-design/components` — already installed, free to use (no Highcharts commercial license), and visually consistent with the rest of the admin portal. The new Highcharts-backed chart components are explicitly avoided.

---

## Data Models

### Amplify Data Schema additions (`amplify/data/resource.ts`)

```typescript
QrLink: a
  .model({
    code:           a.string().required(),   // 4–6 chars [A-Z0-9], unique
    destinationUrl: a.string().required(),
    label:          a.string(),              // optional display name
    clickCount:     a.integer().default(0),
    lastClickedAt:  a.string(),              // ISO 8601 string | null
  })
  .authorization((allow) => [
    allow.authenticated(),                   // full access for admins
  ]),

ClickEvent: a
  .model({
    qrLinkId:   a.string().required(),       // FK to QrLink.id
    clickedAt:  a.string().required(),       // ISO 8601
    userAgent:  a.string(),                  // raw User-Agent header
    ip:         a.string(),                  // raw visitor IP
    referer:    a.string(),                  // raw Referer header
  })
  .authorization((allow) => [
    allow.authenticated().to(["read", "create", "update", "delete"]),
    allow.publicApiKey().to(["create"]),     // redirect handler writes clicks
  ]),
```

> `id` and `createdAt`/`updatedAt` are auto-generated by Amplify for all models.  
> `code` uniqueness is enforced at the application layer (store checks before create; up to 10 collision retries).

### TypeScript interfaces (`lib/qr-links.ts`)

```typescript
export interface QrLink {
  id: string
  code: string
  destinationUrl: string
  label?: string
  createdAt: string
  clickCount: number
  lastClickedAt?: string
}

export interface ClickEvent {
  id: string
  qrLinkId: string
  clickedAt: string
  userAgent?: string   // raw User-Agent header stored at click time
  ip?: string          // raw visitor IP stored at click time
  referer?: string     // raw Referer header stored at click time
  createdAt: string
}

export type DeviceType = "mobile" | "tablet" | "desktop"

// Derived at analytics time (not stored)
export interface DerivedClickData {
  deviceType: DeviceType
  country?: string
  region?: string
}
```

---

## Components and Interfaces

### Folder Structure

Mirrors the existing `blog` feature exactly:

```
app/
  go/
    [code]/
      page.tsx                          # Server Component: redirect handler

  admin/
    (portal)/
      qr-links/
        page.tsx                        # Thin wrapper → QrLinksListPage
        [id]/
          page.tsx                      # Thin wrapper → QrLinkDetailPage

    _components/
      context/
        QrLinkStoreContext.tsx          # Provider + value interface
        useQrLinkStore.ts               # Consumption hook
      pages/
        QrLinksListPage.tsx             # Full-page Cloudscape Table
        QrLinkDetailPage.tsx            # Analytics charts + metadata
      schemas/
        qrLinkSchema.ts                 # Zod schema for create form
      types/
        admin.ts                        # QrLinkFormData type (extend existing)
      utils/
        shortCodeUtils.ts               # generateShortCode, validateShortCode
        deviceUtils.ts                  # parseDeviceType(ua: string): DeviceType
        qrCodeUtils.ts                  # generateQrSvg, downloadQrSvg

lib/
  qr-links.ts                          # QrLink + ClickEvent interfaces
```

### `app/go/[code]/route.ts` — Redirect Handler

Next.js Route Handler (API route, not a Server Component). Uses `NextResponse.redirect()` for 302 and `NextResponse.json({ error: "Not found" }, { status: 404 })` for unknown codes. The redirect response is returned immediately; click recording is fire-and-forget.

```typescript
// app/go/[code]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { generateClient } from "aws-amplify/data"
import type { Schema } from "@/amplify/data/resource"

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const client = generateClient<Schema>() // uses default apiKey auth

  // 1. Look up QrLink by code
  const { data: links } = await client.models.QrLink.list({
    filter: { code: { eq: params.code } },
  })
  const link = links?.[0]
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // 2. Fire-and-forget click recording — does NOT delay the redirect
  const now = new Date().toISOString()
  const ua = request.headers.get("user-agent") ?? undefined
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
              ?? request.headers.get("cf-connecting-ip")
              ?? undefined
  const referer = request.headers.get("referer") ?? undefined

  void Promise.all([
    client.models.ClickEvent.create({
      qrLinkId: link.id,
      clickedAt: now,
      userAgent: ua,
      ip,
      referer,
    }),
    client.models.QrLink.update({
      id: link.id,
      clickCount: (link.clickCount ?? 0) + 1,
      lastClickedAt: now,
    }),
  ]).catch(() => { /* swallow — redirect already sent */ })

  // 3. Immediate redirect
  return NextResponse.redirect(link.destinationUrl, 302)
}
```

### `utils/deviceUtils.ts`

```typescript
export function parseDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase()
  if (/tablet|ipad|playbook|silk/.test(ua)) return "tablet"
  if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(ua)) return "mobile"
  return "desktop"
}
```

### `utils/shortCodeUtils.ts`

```typescript
const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const MIN_LEN = 4
const MAX_LEN = 6
const MAX_ATTEMPTS = 10

export function generateShortCode(): string {
  const len = MIN_LEN + Math.floor(Math.random() * (MAX_LEN - MIN_LEN + 1))
  return Array.from({ length: len }, () =>
    CHARSET[Math.floor(Math.random() * CHARSET.length)]
  ).join("")
}

export function validateShortCode(code: string): boolean {
  return /^[A-Za-z0-9]{4,6}$/.test(code)
}

export async function generateUniqueCode(
  existingCodes: Set<string>
): Promise<string> {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const code = generateShortCode()
    if (!existingCodes.has(code.toUpperCase())) return code
  }
  throw new Error("Failed to generate a unique short code after 10 attempts.")
}
```

### `utils/qrCodeUtils.ts`

```typescript
import QRCode from "qrcode"

export async function generateQrSvg(code: string): Promise<string> {
  const url = `https://www.mokhalab.com/go/${code}`
  return QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M" })
}

export function downloadQrSvg(svgString: string, code: string): void {
  const blob = new Blob([svgString], { type: "image/svg+xml" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `qr-${code}.svg`
  a.click()
  URL.revokeObjectURL(url)
}
```

### `context/QrLinkStoreContext.tsx`

Follows `BlogPostStoreContext.tsx` exactly:

```typescript
export interface QrLinkStoreValue {
  links: QrLink[]
  loading: boolean
  getLinkById: (id: string) => QrLink | undefined
  getLinkByCode: (code: string) => QrLink | undefined
  createLink: (data: QrLinkFormData) => Promise<QrLink>
  deleteLink: (id: string) => Promise<void>
  fetchClickEvents: (qrLinkId: string) => Promise<ClickEvent[]>
}
```

- `createLink` auto-generates a code if `data.customCode` is empty, validates uniqueness, then calls `client.models.QrLink.create`.
- `deleteLink` deletes all associated `ClickEvent` records first (list by `qrLinkId`, then batch delete), then deletes the `QrLink`.
- `fetchClickEvents` is called on-demand from the detail page (not cached in the store).
- On mount, fetches all `QrLink` records sorted by `createdAt` descending.

### `schemas/qrLinkSchema.ts`

```typescript
import { z } from "zod"

export const qrLinkSchema = z.object({
  destinationUrl: z
    .string()
    .min(1, "Destination URL is required")
    .url("Must be a valid HTTP or HTTPS URL"),
  label: z.string().optional(),
  customCode: z
    .string()
    .regex(/^[A-Za-z0-9]{4,6}$/, "Code must be 4–6 alphanumeric characters")
    .optional()
    .or(z.literal("")),
})

export type QrLinkFormData = z.infer<typeof qrLinkSchema>
```

### `pages/QrLinksListPage.tsx`

Full-page Cloudscape `Table` with:
- `variant="full-page"`, `trackBy="id"`
- `sortingColumn` / `sortingDescending` / `onSortingChange` state
- Columns: Label/Code, Short Code, Destination URL, Click Count, Last Clicked, Actions
- Header actions: "Create QR Link" primary button → opens `CreateQrLinkModal`
- Row actions: "Download QR Code" (inline-link button → `downloadQrSvg`) and "Delete" (inline-link → opens `DeleteQrLinkModal`)
- Label/code cell is a clickable link navigating to `/admin/qr-links/[id]`
- Loading state via `loading={loading}` and `loadingText`
- Empty state with Cloudscape `Box` and "Create QR Link" CTA button

### `CreateQrLinkModal` (inline in QrLinksListPage or separate file)

Cloudscape `Modal` containing a `react-hook-form` form with `zodResolver(qrLinkSchema)`, `mode: "onBlur"`, `reValidateMode: "onChange"`. Uses `react-hook-form-cloudscape` wrappers (`CInput`) for all fields. On submit calls `createLink(data)` from the store; closes on success and fires a success notification.

### `pages/QrLinkDetailPage.tsx`

```typescript
// Layout: Cloudscape ContentLayout with
// - Header: link label/code, "Download QR Code" button
// - Two columns (SpaceBetween or Grid):
//   - Metadata box: destination URL, total clicks, created date, short code
//   - "Clicks Over Time" Cloudscape BarChart (30-day trailing, x=date, y=count)
//   - "Device Type Breakdown" Cloudscape PieChart (mobile/tablet/desktop)
//   - "Location Breakdown" Cloudscape BarChart (top 10 countries, horizontal)
//
// On load: calls fetchClickEvents(id) from the store.
// After raw events load:
//   1. parseDeviceType(event.userAgent) run client-side per event → device breakdown
//   2. ip-api.com called client-side per unique IP → country/region for location chart
//      (batched by unique IP, results cached in component state to avoid duplicate calls)
```

Data aggregation helpers in `utils/analyticsUtils.ts`:

```typescript
export function groupClicksByDay(
  events: ClickEvent[],
  days: number = 30
): Array<{ date: string; count: number }> { /* ... */ }

export function groupByDeviceType(
  events: ClickEvent[]
): Array<{ type: DeviceType; count: number }> {
  // uses parseDeviceType(event.userAgent) per event
}

export function topCountries(
  geoResults: Array<{ country: string | null }>,
  limit: number = 10
): Array<{ country: string; count: number }> { /* ... */ }
```

Loading state: Cloudscape `Spinner` or `Box` with loading text in place of each chart while `fetchClickEvents` is in flight.

Error state: Cloudscape `Alert` type="error" if QrLink not found by id.

Empty state: Inline empty state message in place of each chart section.

### `AdminLayout.tsx` — Navigation update

```typescript
// getActiveHref update:
function getActiveHref(path: string): string {
  if (path.startsWith("/admin/blog")) return "/admin/blog"
  if (path.startsWith("/admin/qr-links")) return "/admin/qr-links"   // ← new
  if (path === "/admin" || path === "/admin/") return "/admin"
  return path
}

// SideNavigation items addition:
{ type: "link", text: "QR Links", href: "/admin/qr-links" },
```

### `AdminProviders.tsx` — Provider update

```typescript
export default function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <BlogPostStoreProvider>
      <QrLinkStoreProvider>         {/* ← new */}
        <NotificationProvider>{children}</NotificationProvider>
      </QrLinkStoreProvider>
    </BlogPostStoreProvider>
  )
}
```

### `middleware.ts` — No changes required

The existing middleware matches `/admin/:path*` and excludes `/admin/login`. The `/go/[code]` route is entirely outside `/admin/` so it is never intercepted — it remains public with no auth check needed.

---

## IP Geolocation Integration (Admin Detail Page Only)

The geolocation lookup runs **client-side in the admin detail page** — never on the redirect path. After `fetchClickEvents` returns, the page extracts unique IPs from the events and calls ip-api.com in batches.

```typescript
// utils/geoUtils.ts
interface GeoResult {
  country: string | null
  region: string | null
}

export async function fetchGeoLocation(ip: string): Promise<GeoResult> {
  if (!ip || ip === "127.0.0.1" || ip === "::1") {
    return { country: null, region: null }
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,regionName`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return { country: null, region: null }
    const data = await res.json()
    return {
      country: typeof data.country === "string" ? data.country : null,
      region: typeof data.regionName === "string" ? data.regionName : null,
    }
  } catch {
    return { country: null, region: null }
  }
}

// In QrLinkDetailPage: deduplicate IPs before calling
export async function resolveGeoForEvents(
  events: ClickEvent[]
): Promise<Map<string, GeoResult>> {
  const uniqueIps = [...new Set(events.map((e) => e.ip).filter(Boolean))] as string[]
  const results = await Promise.all(uniqueIps.map((ip) => fetchGeoLocation(ip)))
  return new Map(uniqueIps.map((ip, i) => [ip, results[i]]))
}
```

ip-api.com free tier: 45 requests/minute. Deduplication by unique IP keeps this well within limits for typical QR campaign volumes. If an admin has > 45 unique IPs in a single detail view load, the excess calls will fail gracefully (returning `null` country/region) without breaking the page.

---

## Error Handling

| Scenario | Handler | Outcome |
|---|---|---|
| Unknown short code at `/go/[code]` | 404 response | Next.js returns JSON `{ error: "Not found" }` with status 404 |
| Click recording write failure | `void` promise swallows error | Redirect still completes; click may be lost silently |
| Short code collision (≤10 attempts) | Retry loop in `generateUniqueCode` | New code found |
| Short code collision (>10 attempts) | Throw error | `addNotification` error in admin UI |
| Duplicate custom code | AppSync error caught in `createLink` | `addNotification` "This short code is already in use." |
| QrLink DynamoDB create failure | `errors?.length` check in store | `addNotification` persistent error |
| QrLink delete failure | `errors?.length` check in store | `addNotification` persistent error |
| `QrLink` not found on detail page | Check in `QrLinkDetailPage` | Cloudscape `Alert` type="error" |
| IP geolocation API failure (admin detail) | `try/catch` → `{ country: null, region: null }` | Location chart shows "Unknown" for affected entries |
| IP geolocation rate limit (> 45 unique IPs) | Graceful null returns | Excess entries show "Unknown" country; page still renders |

---

## New Dependencies

Only two new packages are required (add to root `package.json`):

| Package | Version | Purpose |
|---|---|---|
| `qrcode` | `^1.5.4` | Client-side SVG QR code generation |
| `@types/qrcode` | `^1.5.5` | TypeScript types for `qrcode` |

**No chart library needed** — `BarChart` and `PieChart` are already part of `@cloudscape-design/components` which is already installed. The new Highcharts-backed chart package (`@cloudscape-design/chart-components`) is explicitly not used — it requires a commercial Highcharts license.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Short code generator produces valid codes

*For any* invocation of `generateShortCode()`, the returned string SHALL consist only of characters from `[A-Z0-9]` and have a length between 4 and 6 inclusive.

**Validates: Requirements 2.1, 2.2**

---

### Property 2: Short code validator accepts exactly the right inputs

*For any* string `s`, `validateShortCode(s)` SHALL return `true` if and only if `s` matches `^[A-Za-z0-9]{4,6}$`, and `false` for all other strings (including empty strings, strings with special characters, strings shorter than 4 or longer than 6 characters).

**Validates: Requirements 2.5, 6.4**

---

### Property 3: Unique code generation succeeds when collision space is available

*For any* set of existing codes with fewer than 10 members drawn from the valid charset, `generateUniqueCode(existingCodes)` SHALL return a code that is not in the input set, is a valid short code per Property 1, and completes within 10 attempts.

**Validates: Requirements 2.3**

---

### Property 4: Device type classification always produces a valid category

*For any* User-Agent string (including empty, null-like, or arbitrary strings), `parseDeviceType(ua)` SHALL return exactly one of `"mobile"`, `"tablet"`, or `"desktop"` — never throwing, never returning any other value. This function is called client-side in the admin detail page when deriving device breakdown from stored `userAgent` strings.

**Validates: Requirements 8.4**

---

### Property 5: Redirect handler returns 302 to destination for valid codes

*For any* existing `QrLink` record with a known `code` and `destinationUrl`, a GET request to `/go/[code]` SHALL result in an HTTP 302 response with the `Location` header set to the record's `destinationUrl`.

**Validates: Requirements 3.1, 3.2**

---

### Property 6: Click recording fires for every successful redirect

*For any* GET request to `/go/[code]` that resolves to a valid `QrLink`, the system SHALL create exactly one `ClickEvent` record with a valid ISO 8601 `clickedAt` timestamp, a `qrLinkId` matching the resolved `QrLink.id`, and the raw `userAgent` and `ip` values from the request headers.

**Validates: Requirements 3.3, 3.5**

---

### Property 7: Geo failure does not break analytics display

*For any* set of `ClickEvent` records where some `ip` values return no data from the geolocation API, the detail page SHALL still render all three charts, displaying "Unknown" for affected country entries rather than throwing an error.

**Validates: Requirements 8.5**

---

### Property 8: clickCount increments monotonically by 1 per click

*For any* `QrLink` with `clickCount = n`, after exactly one successful redirect event the `clickCount` field on that record SHALL equal `n + 1`.

**Validates: Requirements 3.8**

---

### Property 9: QR SVG encodes the full canonical redirect URL

*For any* valid short code `c`, the SVG string produced by `generateQrSvg(c)` SHALL encode exactly the string `https://www.mokhalab.com/go/${c}` — the full public URL including the domain and path prefix.

**Validates: Requirements 4.2, 4.5**

---

### Property 10: Clicks-over-time aggregation preserves total count

*For any* array of `ClickEvent` records, the sum of all `count` values in `groupClicksByDay(events)` SHALL equal the length of the input array (i.e. no events are lost or double-counted in the aggregation).

**Validates: Requirements 8.3**

---

### Property 11: Device breakdown proportions sum to total click count

*For any* array of `ClickEvent` records, the sum of all `count` values in `groupByDeviceType(events)` SHALL equal the length of the input array, and each entry's `type` SHALL be one of `"mobile"`, `"tablet"`, `"desktop"`.

**Validates: Requirements 8.4**

---

### Property 12: Top-countries list is sorted and bounded

*For any* array of `ClickEvent` records, `topCountries(events, 10)` SHALL return at most 10 entries, each entry's `count` SHALL be a positive integer, and the entries SHALL be ordered by `count` descending (i.e. `result[i].count >= result[i+1].count` for all valid `i`).

**Validates: Requirements 8.5**
