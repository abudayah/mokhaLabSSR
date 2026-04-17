---
inclusion: manual
---

# Migration Guide: mokhalab → mokhaLabSSR

This document captures the patterns, decisions, and conventions established during the migration of the mokhaLab site from a Vite/React SPA (`mokhalab`) to a Next.js 14 App Router SSR application (`mokhaLabSSR`).

Use this as the reference whenever migrating additional features from `mokhalab`.

---

## What Was Migrated

| Feature | Status |
|---|---|
| Amplify backend (BlogPost model + S3 storage) | ✅ Done |
| Admin portal (Cloudscape UI, CRUD, auth) | ✅ Done |
| Site header | ✅ Done |
| Site footer + contact form | ✅ Done |
| Blog list page | ✅ Done |
| Blog post page | ✅ Done |
| Homepage | ⬜ Pending |
| Products list page | ⬜ Pending |
| Product detail page | ⬜ Pending |

---

## Core Migration Rules

### 1. Default to Server Components

Next.js App Router renders everything as a Server Component by default. Only add `"use client"` when the component genuinely needs browser APIs or React state/effects.

| Needs `"use client"` | Server Component is fine |
|---|---|
| `useState`, `useEffect`, `useRef` | Pure layout and markup |
| `useRouter`, `usePathname`, `useParams` | Data fetching with `async/await` |
| Event handlers (onClick, onSubmit) | `next/link`, `next/image` |
| Browser APIs (`window`, `navigator`, `document`) | `generateMetadata()` |
| Amplify client-side hooks | Amplify `generateClient` called in `async` functions |

### 2. Replace react-router-dom APIs

| mokhalab (Vite) | mokhaLabSSR (Next.js) |
|---|---|
| `import { Link } from "react-router-dom"` | `import Link from "next/link"` |
| `import { useNavigate } from "react-router-dom"` | `import { useRouter } from "next/navigation"` |
| `useNavigate(); navigate("/path")` | `useRouter(); router.push("/path")` |
| `import { useParams } from "react-router-dom"` | `import { useParams } from "next/navigation"` or receive as `params` prop from `page.tsx` |
| `import { useLocation } from "react-router-dom"` | `import { usePathname } from "next/navigation"` |
| `<Navigate to="/path" replace />` | `redirect("/path")` (server) or `router.replace("/path")` (client) |
| `<Outlet />` in layouts | `{children}` in `layout.tsx` |
| `<Routes>` / `<Route>` | File-system routing under `app/` |

### 3. Routing: File-System Structure

Routes map directly to the `app/` folder structure. No `<Routes>` or `<Route>` definitions needed.

```
app/
  page.tsx               → /
  blog/
    page.tsx             → /blog
    [slug]/
      page.tsx           → /blog/:slug
  products/
    page.tsx             → /products
    [slug]/
      page.tsx           → /products/:slug
  admin/
    layout.tsx           → wraps all /admin/* routes
    login/page.tsx       → /admin/login
    (portal)/
      layout.tsx         → wraps authenticated admin routes
      page.tsx           → /admin
      blog/page.tsx      → /admin/blog
```

Route groups `(name)` are folders that don't appear in the URL — used to apply different layouts to subsets of routes.

### 4. Data Fetching: async Server Components

Replace `useEffect` + `useState` data fetching with `async` Server Components. Data is fetched at request time (or build time for static pages) — no loading spinners needed for the initial render.

**Before (mokhalab SPA):**
```tsx
export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    generateClient<Schema>().models.BlogPost.list()
      .then(({ data }) => { setPosts(data); setLoading(false) })
  }, [])

  if (loading) return <Spinner />
  return <PostList posts={posts} />
}
```

**After (mokhaLabSSR SSR):**
```tsx
export default async function BlogListPage() {
  const client = generateClient<Schema>()
  const { data } = await client.models.BlogPost.list()
  const posts = (data ?? []).map(toPost)
  return <PostList posts={posts} />
}
```

### 5. Metadata: generateMetadata instead of PageMeta/BlogMeta

The `PageMeta` and `BlogMeta` components from `mokhalab` manipulate `document.title` and inject `<meta>` tags via `useEffect`. In Next.js, replace these entirely with `generateMetadata()` — metadata is rendered server-side into the `<head>` automatically.

**Before (mokhalab):**
```tsx
// Client-side useEffect that mutates document.head — not SEO-friendly
export function BlogMeta({ post }: { post: BlogPost }) {
  useEffect(() => { document.title = post.title; /* inject og: tags */ }, [post])
  return null
}
```

**After (mokhaLabSSR):**
```tsx
// Runs on the server — metadata is in the initial HTML response
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost(params.slug)
  return {
    title: post.title,
    description: post.subtitle,
    openGraph: { title: post.title, images: [ogImage], type: "article" },
    twitter: { card: "summary_large_image" },
  }
}
```

### 6. Static Generation + ISR

For content pages that don't change on every request, use static generation with `generateStaticParams` and `revalidate` for Incremental Static Regeneration (ISR).

```tsx
// Pre-render all known slugs at build time
export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((p) => ({ slug: p.slug }))
}

// Re-render in the background every 60 seconds when a request comes in
export const revalidate = 60
```

Use `revalidate = 0` to always render on demand (like the admin portal).
Use `export const dynamic = "force-dynamic"` to completely disable static generation (also used for the admin portal).

### 7. Layouts

Layouts in Next.js App Router wrap their children and persist across navigations. Any UI shared across a group of routes belongs in a `layout.tsx`.

```
app/layout.tsx              ← root: fonts, GTM, global CSS — wraps everything
app/blog/layout.tsx         ← optional: shared blog UI (if needed)
app/admin/layout.tsx        ← Amplify config + Cloudscape global styles
app/admin/(portal)/layout.tsx  ← AdminProviders + AdminLayout shell
```

**Key rule**: `export const dynamic = "force-dynamic"` or `export const revalidate = 0` set on a layout applies to all pages within that layout segment.

### 8. Not Found Pages

Replace `useNavigate` + conditional rendering for 404s with Next.js built-ins:

- Server Components: call `notFound()` from `"next/navigation"` — renders the nearest `not-found.tsx`
- Create `app/blog/[slug]/not-found.tsx` for segment-level 404 UI

```tsx
// In a Server Component
import { notFound } from "next/navigation"

const post = await getPost(params.slug)
if (!post) notFound()  // renders not-found.tsx
```

### 9. Auth Protection: Middleware (not AuthGuard)

The `AuthGuard` component from `mokhalab` is a client-side redirect — it renders `null` while checking auth, then redirects. In Next.js, route protection runs in `middleware.ts` at the edge before the page renders.

```ts
// middleware.ts — runs before any /admin/* request reaches the page
export async function middleware(request: NextRequest) {
  const authenticated = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: (ctx) => fetchAuthSession(ctx).then(s => !!s.tokens),
  })
  if (!authenticated) return NextResponse.redirect(new URL("/admin/login", request.url))
}
```

Requires `@aws-amplify/adapter-nextjs` and `utils/amplifyServerUtils.ts`.
Amplify must be configured with `{ ssr: true }` so tokens are stored in cookies (not localStorage).

### 10. `"use client"` Placement

Push `"use client"` as deep as possible. A single interactive element in a large layout should not force the whole layout to be a client component.

**Pattern**: Create a thin client wrapper for just the interactive part, keep the parent as a Server Component.

```tsx
// Bad — whole layout becomes client because of one button
"use client"
export default function BlogPostPage({ post }) {
  return (
    <article>
      <h1>{post.title}</h1>            {/* could be server */}
      <div>{post.body}</div>           {/* could be server */}
      <ShareButton title={post.title} /> {/* needs client */}
    </article>
  )
}

// Good — only the button is client
// BlogPostPage is a Server Component
export default function BlogPostPage({ post }) {
  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.body}</div>
      <AuthorRow author={post.author} title={post.title} /> {/* "use client" inside */}
    </article>
  )
}
```

---

## Amplify Configuration

### Client-side (browser)
Configure once in a `"use client"` component high in the tree:

```tsx
// app/admin/_components/AmplifyProvider.tsx
"use client"
Amplify.configure(outputs, { ssr: true })  // ssr: true stores tokens in cookies
```

### Server-side
Use `createServerRunner` from `@aws-amplify/adapter-nextjs`:

```ts
// utils/amplifyServerUtils.ts
import { createServerRunner } from "@aws-amplify/adapter-nextjs"
export const { runWithAmplifyServerContext } = createServerRunner({ config: outputs })
```

For simple async server components fetching public data (blog posts), `generateClient<Schema>()` can be called directly after `Amplify.configure(outputs, { ssr: true })` at module scope.

### Auth modes
- Admin mutations: `generateClient<Schema>({ authMode: "userPool" })`
- Public reads (blog, products): `generateClient<Schema>()` (uses default API key)

---

## CSS and Styling

The full design token system (`globals.css`) and blog prose styles (`app.css`) are already in `mokhaLabSSR`. Both are imported in `app/layout.tsx`.

- Tailwind CSS v4 with `@tailwindcss/postcss` — configured in `postcss.config.mjs`
- `cn()` utility in `lib/utils.ts` for conditional class merging
- Custom CSS variables: `--blog-serif`, `--blog-accent`, `--background`, `--foreground`, etc.
- Dark mode via `.dark` class on `<html>` — handled by `next-themes` if enabled

**Do not** add separate `tailwind.config.ts` — Tailwind v4 is configured via CSS (`@theme inline` in `globals.css`).

---

## Component Location Conventions

```
app/
  admin/
    _components/      ← admin-only components (Cloudscape, auth-gated)
components/           ← shared public-site components
  blog/               ← blog-specific components
lib/                  ← shared utilities, types, data functions
utils/                ← server utilities (e.g. amplifyServerUtils.ts)
```

**Rule**: Cloudscape components stay inside `app/admin/`. Tailwind/shadcn components stay in `components/`. Never mix.

---

## What NOT to Migrate

These patterns from `mokhalab` have no equivalent in `mokhaLabSSR` because Next.js handles them natively:

| mokhalab pattern | Why to drop it |
|---|---|
| `PageMeta` / `BlogMeta` components | Use `generateMetadata()` instead |
| `ScrollToTop` (react-router location listener) | Next.js handles scroll restoration automatically |
| `ThemeProvider` wrapping BrowserRouter | Use `next-themes` `ThemeProvider` in root `layout.tsx` if needed |
| `Suspense` around lazy-loaded route chunks | Next.js code-splits automatically per route |
| `<BrowserRouter>` / `<Routes>` / `<Route>` | File-system routing replaces all of this |
