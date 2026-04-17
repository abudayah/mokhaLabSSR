---
inclusion: fileMatch
fileMatchPattern: "app/admin/**"
---

# Admin Portal Standards

This document defines the rules and conventions for working on the mokhaLab admin portal (`app/admin/`).

## Architecture Overview

The admin portal lives under `/admin` and is completely isolated from the public site:

- **Framework**: Next.js 14 App Router (all admin components are Client Components — `"use client"`)
- **UI framework**: AWS Cloudscape Design System (`@cloudscape-design/components`) — no Tailwind classes or shadcn components inside `app/admin/`
- **Forms**: `react-hook-form` + `react-hook-form-cloudscape` (`CInput`, `CDatePicker`, etc.) + `zod` for validation
- **Auth**: AWS Amplify Authenticator component backed by Cognito User Pool; route protection via `middleware.ts`
- **Data**: AWS Amplify Data (AppSync + DynamoDB) via `generateClient<Schema>({ authMode: "userPool" })`
- **Storage**: AWS Amplify Storage (S3) for blog featured images

## Route Protection

Authentication is enforced by `middleware.ts` at the Next.js edge. It checks for a Cognito access token in cookies and redirects unauthenticated requests to `/admin/login`. No client-side `AuthGuard` component is needed.

## Cloudscape Design Guidelines

Always follow the official Cloudscape design guidelines and component API. **Before using any Cloudscape component, consult the llms.txt reference for the correct API, props, and patterns:**

> **Reference**: https://cloudscape.design/llms.txt
>
> Individual component API docs follow the pattern: `https://cloudscape.design/components/{component-name}/index.html.md`
> e.g. https://cloudscape.design/components/date-picker/index.html.md

Key rules:
- Use `variant="full-page"` on tables that occupy the full page, with `variant="awsui-h1-sticky"` on the header
- Use `trackBy` on all Table components for proper React key tracking
- Use `sortingColumn` / `sortingDescending` / `onSortingChange` props for table sorting — never custom sort buttons in column headers
- Use `ariaLabels` on Table for accessibility (sort states, action button labels)
- Use `constraintText` only for format hints (e.g. "YYYY-MM-DD"), not to indicate required/optional — use `<i>- optional</i>` in the label for optional fields instead
- Use `formAction="none"` on all Cloudscape `Button` components inside `<form>` elements that should not submit the form
- `TopNavigation` must be rendered outside `AppLayout` in the DOM; use `headerSelector` on `AppLayout` to link them

## Folder Structure

```
app/admin/
  layout.tsx                     # Root admin layout: Amplify config + Cloudscape global styles
  login/
    page.tsx                     # Login page (outside (portal) group — no AdminLayout)
  (portal)/
    layout.tsx                   # Portal layout: AdminProviders + AdminLayout shell
    page.tsx                     # Dashboard
    blog/
      page.tsx                   # Blog list
      new/page.tsx               # Create post form
      [id]/edit/page.tsx         # Edit post form
  _components/
    AmplifyProvider.tsx          # Configures Amplify with ssr: true
    AdminProviders.tsx           # BlogPostStoreProvider + NotificationProvider
    AdminLayout.tsx              # AppLayout + TopNavigation + SideNavigation + Flashbar
    CharacterCount.tsx           # Character counter display
    DeleteConfirmModal.tsx       # Cloudscape Modal for delete confirmation
    ImageUploader.tsx            # S3 upload via Amplify Storage
    RichTextEditor.tsx           # react-quill wrapper with error boundary fallback
    context/
      BlogPostStoreContext.tsx   # Amplify Data CRUD for BlogPost model
      NotificationContext.tsx    # Flashbar notification state
      useBlogPostStore.ts        # Hook for BlogPostStoreContext
    pages/
      LoginPage.tsx              # Amplify Authenticator (hideSignUp)
      DashboardPage.tsx
      BlogListPage.tsx
      BlogPostFormPage.tsx       # Handles both /new and /[id]/edit
    schemas/
      blogPostSchema.ts          # Zod schema for blog post form
    types/
      admin.ts                   # BlogPostFormData type
    utils/
      slugUtils.ts               # generateSlug, validateSlugUniqueness

middleware.ts                    # Edge middleware: protects /admin/* → redirects to /admin/login
components/
  S3Image.tsx                    # Shared: resolves S3 keys to public URLs
lib/
  blog-posts.ts                  # BlogPost interface + seed data
  image-url.ts                   # resolveImageUrl utility
```

## Data Model

`BlogPost` fields (DynamoDB via Amplify Data):
- `id` — auto-generated string UUID (primary key)
- `slug` — URL-safe string, auto-generated from title, unique
- `title` — required string
- `subtitle` — optional string
- `date` — ISO 8601 string, auto-set to today on create, preserved on update
- `author` — required string, defaults to "mokhaLab"
- `body` — required HTML string (from RichTextEditor)
- `featuredImage` — optional S3 key (e.g. `blog-images/1234-photo.jpg`)

## Auth Rules

- Route protection is handled by `middleware.ts` — checks for Cognito access token in cookies
- The Amplify Data client in `BlogPostStoreContext` uses `authMode: "userPool"` for all mutations
- Public blog pages use the default API key auth mode (read-only)
- Amplify is configured with `{ ssr: true }` so tokens are stored in cookies (not localStorage)
- Admin users are managed via Amplify Console → Authentication → User management

## Slug Generation

- Slugs are auto-generated from the title on create: lowercase, spaces → hyphens, strip non-alphanumeric
- On update, slug is only regenerated if the title changed
- On collision, a 2-character random suffix is appended (e.g. `my-post-k3`)
- The `generateSlug` utility returns an empty string for all-symbol titles — the store falls back to `"post"`

## Image Uploads

- Images are uploaded to S3 under the `blog-images/` prefix
- The S3 key (not a URL) is stored in `featuredImage`
- `S3Image` component resolves keys to direct public S3 URLs at render time
- The bucket has a public read policy on `blog-images/*` — no signed URLs needed for the public blog

## Notifications

- All success/error feedback uses the `NotificationContext` → `addNotification(item)`
- Success notifications auto-dismiss after 5 seconds
- Error notifications persist until manually dismissed
- Never use `alert()` or custom toast — always use the Flashbar via `NotificationContext`

## Form Conventions

- Use `react-hook-form` with `zodResolver` and `mode: "onBlur"`, `reValidateMode: "onChange"`
- Use the `react-hook-form-cloudscape` wrappers for all supported Cloudscape form controls
- Use `Controller` from `react-hook-form` **only** for custom components not covered by `react-hook-form-cloudscape` (e.g. `RichTextEditor`, `ImageUploader`)
- Use `get(errors, "field.message")` for error text in FormField
- Wrap all forms in a native `<form>` element with `noValidate` and `onSubmit={handleSubmit(onSubmit)}`
- The submit button uses `formAction="submit"` and `loading={isSubmitting}`
- Cancel button uses `formAction="none"` and comes before the primary action

## Isolation Rule

**Never import Tailwind classes or shadcn components inside `app/admin/`.**
**Never import Cloudscape components outside `app/admin/` (except `S3Image` which is shared).**

## Next.js Specific Rules

- All components under `app/admin/` must have `"use client"` at the top — Cloudscape, react-hook-form, and Amplify hooks are all browser-only
- Use `useRouter` and `usePathname` from `next/navigation` — never `react-router-dom`
- Use `useParams` from `next/navigation` for dynamic route params — or receive `params` as props from the page file
- Page files (`page.tsx`) are thin wrappers that import and render the corresponding component from `_components/pages/`
