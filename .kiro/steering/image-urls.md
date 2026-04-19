# Image URL Resolution

## The Rule

**Always use `resolveImageUrl()` from `src/lib/image-url.ts` when you need a fully-qualified image URL.**

Never construct S3 URLs manually. Never concatenate `SITE_URL` with an image path by hand.

---

## Where Images Live

mokhaLab uses two image sources:

| Source | Format | Example |
|--------|--------|---------|
| **S3 bucket** | Key with no leading slash | `blog-images/photo.webp` |
| **Public folder** | Relative path with leading `/` | `/images/hero.webp` |
| **External** | Absolute URL | `https://example.com/img.jpg` |

Blog post `featuredImage` values stored in DynamoDB are S3 keys (e.g. `blog-images/my-post.webp`).  
Product images in `src/lib/products.ts` are relative paths (e.g. `/images/ML-PIT-BLK-53-01/main.webp`).

---

## The Utility

**Location:** `src/lib/image-url.ts`

```ts
import { resolveImageUrl, SITE_URL } from "@/lib/image-url"
```

### `resolveImageUrl(src, fallback?)`

Resolves any image reference to a fully-qualified public URL:

| Input | Output |
|-------|--------|
| `"blog-images/photo.webp"` | `https://<bucket>.s3.us-west-2.amazonaws.com/blog-images/photo.webp` |
| `"/images/hero.webp"` | `https://www.mokhalab.com/images/hero.webp` |
| `"https://example.com/img.jpg"` | `https://example.com/img.jpg` (unchanged) |
| `""` or `undefined` | `fallback` (defaults to `""`) |

### `SITE_URL`

The canonical site domain: `"https://www.mokhalab.com"`. Use this instead of hardcoding the domain.

---

## Usage Examples

### In a React component (rendering)
Use `<S3Image>` — it calls `resolveImageUrl` internally:
```tsx
import { S3Image } from "@/components/S3Image"

<S3Image src={post.featuredImage} alt={post.title} className="w-full" />
```

### In meta tags / non-rendering contexts
Call `resolveImageUrl` directly:
```ts
import { resolveImageUrl, SITE_URL } from "@/lib/image-url"

const DEFAULT_OG_IMAGE = `${SITE_URL}/images/hero.webp`

const ogImage = resolveImageUrl(post.featuredImage, DEFAULT_OG_IMAGE)
// → always a full https:// URL, safe to put in og:image
```

---

## What NOT to Do

```ts
// ❌ Manual S3 URL construction
const url = `https://amplify-mokhalab-...s3.us-west-2.amazonaws.com/${key}`

// ❌ Hardcoding the domain
const url = `https://www.mokhalab.com${relativePath}`

// ❌ Duplicating the resolution logic in a new file
function myResolve(src: string) { ... }
```

---

## S3 Bucket Details

Bucket name and region are read from `amplify_outputs.json` at build time — do not hardcode them.  
The bucket is configured in `amplify/storage/resource.ts`.  
Blog images are stored under the `blog-images/` prefix.
