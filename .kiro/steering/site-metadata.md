# Site Metadata Maintenance

This document defines when and how to update `public/llms.txt` and `public/sitemap.xml`.

---

## llms.txt

Location: `public/llms.txt`

`llms.txt` is a standard for helping Large Language Models (LLMs) — AI systems like ChatGPT, Claude, and others — understand the structure and content of a website. When an AI assistant is asked about mokhaLab, it can use this file to give accurate, relevant answers.

Follows the [llms.txt spec](https://llmstxt.org/llms.txt).

**Update when:**
- The brand description or product range changes
- A new major section is added to the site (e.g. a "Recipes" or "About" page)
- The blog URL pattern changes
- The contact method changes

**Rules:**
- Keep the summary blockquote concise and accurate — one sentence describing what mokhaLab is
- Link to listing pages only — do not list individual blog posts or product pages
- If a new major section is added, add it as a new H2 section
- The `## Optional` section is for secondary links that LLMs can skip if context is limited

Current structure to maintain:
```
# mokhaLab
> [one-line brand summary]

[brand philosophy paragraph]

## Products
- [Products](https://www.mokhalab.com/products): ...

## Blog
- [Blog](https://www.mokhalab.com/blog): ...

## Contact
- [Contact](https://www.mokhalab.com/#contact): ...

## Optional
- [Sitemap](https://www.mokhalab.com/sitemap.xml): ...
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
- Always use the canonical domain `https://www.mokhalab.com`
- Product URLs follow the pattern `/products/[MODEL-NUMBER]` matching the product `id` in `src/lib/products.ts`

Example entry for a new product:
```xml
<url>
  <loc>https://www.mokhalab.com/products/ML-NEW-01</loc>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
```

---

## Base URL (`NEXT_PUBLIC_SITE_URL`)

The canonical site URL is controlled by the `NEXT_PUBLIC_SITE_URL` environment variable. It is used in OG tags, canonical links, JSON-LD, and the OG image generation script.

**Where to set it:**
- **Amplify Console** → App settings → Environment variables → add `NEXT_PUBLIC_SITE_URL` = `https://www.mokhalab.com`
  This is injected at build time and applies to all `next build` runs on that Amplify app.
- **Local development** → copy `.env.example` to `.env.local` and set the value there.

**Default fallback:** `https://www.mokhalab.com` (hardcoded in `lib/image-url.ts` as a safety net only — always prefer the env var).

**Do not** hardcode the domain anywhere else in the codebase. Always import `SITE_URL` from `@/lib/image-url`.
