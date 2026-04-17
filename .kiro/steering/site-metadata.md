# Site Metadata Maintenance

This document defines when and how to maintain metadata across three areas: **OG tags & social sharing**, `public/llms.txt`, and `public/sitemap.xml`.

---

## OG Tags & Social Sharing

### Architecture overview

OG images are generated dynamically at build/request time using Next.js's **file-based `opengraph-image` route convention** and `ImageResponse` from `next/og`. No static image files in `/public` are used for OG.

| Route | OG image source |
|---|---|
| `/` (homepage) | `app/opengraph-image.tsx` → served at `/opengraph-image` |
| `/blog` | `app/blog/opengraph-image.tsx` → served at `/blog/opengraph-image` |
| `/blog/[slug]` | Post's `featuredImage` from S3, resolved via `resolveImageUrl()` in `lib/image-url.ts`, falling back to `hero.webp` |
| `/products/[slug]` | Add a co-located `opengraph-image.tsx` if product-specific OG is needed |

### OG image requirements

Every `opengraph-image.tsx` file **must** export these four constants exactly:

```ts
export const runtime = "edge"
export const alt = "Descriptive alt text for the image"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
```

The rendered output must always include:
- **Brand label** — "mokhaLab" or "mokhaLab — [Section]" in subdued text
- **Headline** — a bold, large-type statement (the "missing headline" check)
- **CTA line** — a short prompt or directional cue ending with `→` (the "missing CTA" check)

This satisfies the three image-related OG audit requirements: correct 1200×630 size, visible headline, and visible CTA.

### Metadata copy standards

#### Title

- OG titles should be **50–60 characters**
- Use `"[Descriptive Title] — mokhaLab"` or `"mokhaLab | [Descriptive Title]"` format
- The `title` field in `metadata` (used for the browser `<title>`) can be shorter — Next.js applies the `"%s | mokhaLab"` template from `layout.tsx` automatically

#### Description

- OG descriptions should be **110–160 characters**
- Use the same description for both `openGraph.description` and `twitter.description`
- Avoid repeating the page title verbatim — expand on it with context

#### Current approved copy

| Page | `og:title` (50–60 chars) | `og:description` (110–160 chars) |
|---|---|---|
| Homepage | `"mokhaLab \| Precision Espresso Tools"` | `"Precision-engineered espresso tools for the serious barista. Tampers, distributors, WDT tools and more — crafted in Canada."` |
| Blog listing | `"The mokhaLab Blog — Coffee Culture & Craft Espresso Stories"` | `"Explore stories about specialty coffee culture, espresso brewing rituals, and the craft philosophy behind every mokhaLab precision tool."` |
| Blog post | `"[Post Title] \| mokhaLab"` | Use `post.subtitle` if set, otherwise expand the title into a sentence |

### Where metadata lives

- **Root defaults** — `app/layout.tsx` `metadata` export. Sets `openGraph.siteName`, `openGraph.locale`, `twitter.card`. Individual pages override these.
- **Homepage** — `app/page.tsx` `metadata` export. Declares full `openGraph` and `twitter` blocks. OG image is served automatically from `app/opengraph-image.tsx`.
- **Blog listing** — `app/blog/page.tsx` `metadata` export. OG image is served automatically from `app/blog/opengraph-image.tsx`. Do **not** hardcode an `images` array here — the route convention handles it.
- **Blog posts** — `app/blog/[slug]/page.tsx` `generateMetadata()`. Must declare `images: [{ url, width: 1200, height: 630, alt }]` explicitly since the image comes from S3, not a route-convention file.

### Adding OG metadata to a new page

1. Create `app/[route]/opengraph-image.tsx` following the template below.
2. Add a `metadata` export to the page file with `openGraph` and `twitter` blocks. Do **not** include an `images` array — the route convention injects it automatically.
3. Always include `alternates: { canonical: \`${SITE_URL}/[route]/\` }`.

**`opengraph-image.tsx` template:**

```tsx
import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Page-specific alt text"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", position: "relative", backgroundColor: "#0a0a0a" }}>
        <img
          src="https://www.mokhalab.ca/images/hero.jpg"
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }}
        />
        {/* Dark overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)" }} />
        {/* Content */}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "64px 72px" }}>
          {/* Brand label */}
          <div style={{ fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 20 }}>
            mokhaLab
          </div>
          {/* Headline — required */}
          <div style={{ fontSize: 62, fontWeight: 700, color: "#ffffff", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 20 }}>
            Your Page
            <br />
            Headline Here.
          </div>
          {/* CTA — required */}
          <div style={{ fontSize: 22, color: "rgba(255,255,255,0.7)" }}>
            Short supporting line that invites action →
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

### Update checklist

Update OG metadata when:
- A new route/page is added → create a co-located `opengraph-image.tsx` and add `metadata` with full `openGraph`/`twitter` blocks
- The brand description or tagline changes → update `app/layout.tsx` description and both `opengraph-image.tsx` CTA lines
- A blog post's `subtitle` field is left empty → the `generateMetadata` fallback uses the post title as description, which is likely too short; encourage authors to always fill in `subtitle`
- Any OG image background photo changes → update the absolute URL in all `opengraph-image.tsx` files (currently `https://www.mokhalab.ca/images/hero.jpg`)

---

## llms.txt

Location: `public/llms.txt`

`llms.txt` is a standard for helping Large Language Models understand the structure and content of a website. Follows the [llms.txt spec](https://llmstxt.org/llms.txt).

**Update when:**
- The brand description or product range changes
- A new major section is added to the site (e.g. "Recipes" or "About")
- The blog URL pattern changes
- The contact method changes

**Rules:**
- Keep the summary blockquote concise — one sentence describing what mokhaLab is
- Link to listing pages only — do not list individual blog posts or product pages
- If a new major section is added, add it as a new H2 section
- The `## Optional` section is for secondary links that LLMs can skip if context is limited

Current structure to maintain:
```
# mokhaLab
> [one-line brand summary]

[brand philosophy paragraph]

## Products
- [Products](https://www.mokhalab.ca/products): ...

## Blog
- [Blog](https://www.mokhalab.ca/blog): ...

## Contact
- [Contact](https://www.mokhalab.ca/#contact): ...

## Optional
- [Sitemap](https://www.mokhalab.ca/sitemap.xml): ...
```

---

## sitemap.xml

Location: `public/sitemap.xml`

`sitemap.xml` is for search engines (Google, Bing, etc.) to discover and index pages.

**Update when:**
- A new product is added — add a `<url>` entry under the product pages section
- A product is removed or its ID changes — update or remove the entry
- A new static page or route is added
- A page is removed

**Rules:**
- Static pages use `<changefreq>weekly</changefreq>`
- Product pages use `<changefreq>monthly</changefreq>` and `<priority>0.8</priority>`
- Blog posts are dynamic (fetched from DynamoDB at runtime) — do **not** add individual post URLs manually
- Always use the canonical domain `https://www.mokhalab.ca`
- Product URLs follow the pattern `/products/[MODEL-NUMBER]` matching the product `id` in `lib/products.ts`

Example entry for a new product:
```xml
<url>
  <loc>https://www.mokhalab.ca/products/ML-NEW-01</loc>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
```
