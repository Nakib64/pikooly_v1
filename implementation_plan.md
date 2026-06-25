# Pikooly: Vite/React (Lovable) → Next.js 15 Conversion Plan

## Background

Pikooly is an e-commerce SPA (flowers/gifts/cakes delivery in Bangladesh) originally scaffolded by Lovable. It is currently a **Vite + React Router v6** app with:

- **37 pages** (public) + **31 admin pages** + **7 seller pages** = 75+ total routes
- Supabase for auth + database
- TanStack Query for data fetching
- Shadcn/ui (Radix UI) component library
- Tailwind CSS with a custom design system
- Firebase for push notifications / FCM tokens
- TipTap rich-text editor (admin blog/events)
- PWA support (`vite-plugin-pwa`)
- Google AdSense, GA, GTM, Facebook Pixel injection
- Framer Motion for animations
- `next-themes` for dark mode (already installed)

---

## Lovable Artifacts to Remove

| Artifact | Location | Action |
|---|---|---|
| `lovable-tagger` dev dep | `package.json` | Remove |
| `@lovable.dev/cloud-auth-js` dep | `package.json` | Remove |
| `componentTagger()` plugin | `vite.config.ts` (deleted anyway) | Deleted with file |
| `.lovable/` directory | project root | Delete entirely |
| `src/integrations/lovable/` | `src/integrations/lovable/index.ts` | Replace with native Supabase OAuth |
| `lovable.auth.signInWithOAuth()` calls | `src/pages/Auth.tsx` (lines 93, 101) | Replace with `supabase.auth.signInWithOAuth()` |
| `lovableproject.com` hostname checks | `src/main.tsx` (line 16) | Remove `isPreviewHost` guard |
| `lovableproject.com` / `.lovable.app` checks | `src/components/ads/AdSense.tsx` (lines 21–22) | Remove those hostnames |
| `lovable.app` fallback URL | `src/pages/Blog.tsx` (line 228) | Replace with `siteSettings.public_site_url` only |
| `lovableproject.com` fallback URL | `src/pages/Checkout.tsx` (lines 974, 989) | Remove ternary, use `public_site_url` directly |
| `lovableproject.com` fallback URL | `src/pages/admin/AdminOrders.tsx` (lines 154, 182) | Same cleanup |
| `"lovable"` option in AI provider | `src/pages/admin/AdminSettings.tsx` (line 408) | Remove that select option |
| Comment in `web-vitals-rum.ts` | `src/lib/web-vitals-rum.ts` (line 49) | Update comment text |
| `name: "vite_react_shadcn_ts"` | `package.json` (line 2) | Rename to `"pikooly"` |

---

## Proposed Architecture

### Framework
**Next.js 15** with the **App Router** (`app/` directory).

> [!IMPORTANT]
> We will keep all existing React component code. This is a **structural migration**, not a rewrite. Component logic, hooks, contexts, and UI components move with minimal changes.

### Routing Strategy

The current React Router structure maps to Next.js App Router as follows:

| Current React Router path | Next.js `app/` path |
|---|---|
| `/` | `app/page.tsx` |
| `/shop` | `app/shop/page.tsx` |
| `/product-category/:catSlug` | `app/product-category/[catSlug]/page.tsx` |
| `/product-category/:catSlug/:subSlug` | `app/product-category/[catSlug]/[subSlug]/page.tsx` |
| `/product/:id` | `app/product/[id]/page.tsx` |
| `/blog` | `app/blog/page.tsx` |
| `/blog/category/:category` | `app/blog/category/[category]/page.tsx` |
| `/blog/category/:category/:subcategory` | `app/blog/category/[category]/[subcategory]/page.tsx` |
| `/blog/subcategory/:subcategory` | `app/blog/subcategory/[subcategory]/page.tsx` |
| `/blog/:slug` | `app/blog/[slug]/page.tsx` |
| `/cart` | `app/cart/page.tsx` |
| `/checkout` | `app/checkout/page.tsx` |
| `/order-success/:orderNumber` | `app/order-success/[orderNumber]/page.tsx` |
| `/remittance-payment/:orderId` | `app/remittance-payment/[orderId]/page.tsx` |
| `/track-order` | `app/track-order/page.tsx` |
| `/eps-callback` | `app/eps-callback/page.tsx` |
| `/about-us` | `app/about-us/page.tsx` |
| `/contact-us` | `app/contact-us/page.tsx` |
| `/refund-policy` | `app/refund-policy/page.tsx` |
| `/privacy-policy` | `app/privacy-policy/page.tsx` |
| `/terms-conditions` | `app/terms-conditions/page.tsx` |
| `/return-policy` | `app/return-policy/page.tsx` *(redirect to `/refund-policy`)* |
| `/privacy` | `app/privacy/page.tsx` *(redirect to `/privacy-policy`)* |
| `/terms` | `app/terms/page.tsx` *(redirect to `/terms-conditions`)* |
| `/reviews` | `app/reviews/page.tsx` |
| `/custom-bouquet` | `app/custom-bouquet/page.tsx` |
| `/install` | `app/install/page.tsx` |
| `/events` | `app/events/page.tsx` |
| `/events/:slug` | `app/events/[slug]/page.tsx` |
| `/photography` | `app/photography/page.tsx` |
| `/search` | `app/search/page.tsx` |
| `/all-gifts` | `app/all-gifts/page.tsx` |
| `/auth` | `app/auth/page.tsx` |
| `/auth/verify` | `app/auth/verify/page.tsx` |
| `/auth/reset` | `app/auth/reset/page.tsx` |
| `/account` | `app/account/page.tsx` |
| `/account/loyalty-rewards/:id` | `app/account/loyalty-rewards/[id]/page.tsx` |
| `/reset-password` | `app/reset-password/page.tsx` |
| `/reset-password-phone` | `app/reset-password-phone/page.tsx` |
| `/affiliate` | `app/affiliate/page.tsx` |
| `/sitemap.html` | `app/sitemap.html/page.tsx` |
| **Admin routes** | `app/admin/**/page.tsx` (31 pages) |
| **Seller routes** | `app/seller/**/page.tsx` (7 pages) |

### Layouts

| Layout | File | Pages it wraps |
|---|---|---|
| Root layout (providers + global head) | `app/layout.tsx` | All pages |
| Public layout (Header + Footer + BottomNav + WhatsApp) | `app/(public)/layout.tsx` | All public pages |
| Admin layout (no public nav) | `app/admin/layout.tsx` | All `/admin/*` pages |
| Seller layout | `app/seller/layout.tsx` | All `/seller/*` pages |
| Blog layout (no header) | `app/(blog)/layout.tsx` | `/blog`, `/blog/[slug]` |

---

## Proposed Changes

### Phase 1 — Bootstrap Next.js & Config

#### [NEW] `next.config.ts`
- Port Vite `resolve.alias` `@/` to Next.js `@` path alias
- Configure PWA via `next-pwa`
- Add `redirects()` for old WordPress paths (from `WordPressRedirects.tsx` logic)
- Add `headers()` for security headers (from `public/_headers`)

#### [MODIFY] `package.json`
- Replace Vite scripts with Next.js scripts (`next dev`, `next build`, `next start`)
- Add `next` and `next-pwa` dependencies
- **Remove**: `vite`, `@vitejs/plugin-react-swc`, `vite-plugin-pwa`, `vitest`, `lovable-tagger`, `@lovable.dev/cloud-auth-js`, `eslint-plugin-react-refresh`
- Rename `"name"` to `"pikooly"`
- Keep all Radix UI, Supabase, TanStack Query, Framer Motion, etc.
- Migrate vitest tests to Jest (optional, can defer)

#### [NEW] `tsconfig.json` (overwrite)
- Next.js-compatible TypeScript config with `paths: { "@/*": ["./src/*"] }`

#### [NEW] `postcss.config.js` (keep as-is, Tailwind-compatible)

#### [DELETE] `vite.config.ts`
#### [DELETE] `vitest.config.ts`
#### [DELETE] `index.html`
#### [DELETE] `tsconfig.app.json`, `tsconfig.node.json`
#### [DELETE] `.lovable/` directory
#### [DELETE] `src/main.tsx`, `src/App.tsx` (replaced by Next.js app dir)
#### [DELETE] `src/vite-env.d.ts`

---

### Phase 2 — Environment Variables

#### [MODIFY] `.env` → `.env.local`
- Rename `VITE_SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL`
- Rename `VITE_SUPABASE_PUBLISHABLE_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Remove bare `SUPABASE_*` duplicates (not needed)
- Keep `VITE_SUPABASE_PROJECT_ID` → `NEXT_PUBLIC_SUPABASE_PROJECT_ID`

#### [MODIFY] `src/integrations/supabase/client.ts`
- Replace `import.meta.env.VITE_*` → `process.env.NEXT_PUBLIC_*`

#### [MODIFY] `src/lib/web-vitals-rum.ts`
- Replace `import.meta.env.VITE_SUPABASE_URL` → `process.env.NEXT_PUBLIC_SUPABASE_URL`
- Update comment (remove Lovable mention)

---

### Phase 3 — Remove Lovable Integrations

#### [DELETE] `src/integrations/lovable/`
All OAuth will use Supabase directly.

#### [MODIFY] `src/pages/Auth.tsx`
Replace:
```ts
import { lovable } from "@/integrations/lovable/index";
const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: ... });
```
With:
```ts
import { supabase } from "@/integrations/supabase/client";
const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: window.location.origin + "/auth/callback" }
});
```
*(Apple OAuth same pattern)*

#### [MODIFY] `src/main.tsx` (to be deleted after migration — kept during bridge phase)

#### [MODIFY] `src/components/ads/AdSense.tsx`
Remove `.lovable.app` and `.lovableproject.com` checks from `isPreviewDomain()`.

#### [MODIFY] `src/pages/Blog.tsx`
Remove hardcoded `lovable.app` fallback from `origin` calculation.

#### [MODIFY] `src/pages/Checkout.tsx`
Remove lovable URL ternaries on lines 974 and 989.

#### [MODIFY] `src/pages/admin/AdminOrders.tsx`
Remove lovable URL ternaries on lines 154 and 182.

#### [MODIFY] `src/pages/admin/AdminSettings.tsx`
Remove `{ value: "lovable", label: "Lovable AI (default, no key needed)" }` from AI provider options.

---

### Phase 4 — Root Layout & Providers

#### [NEW] `app/layout.tsx`
Root layout. Wraps everything in:
- `ThemeProvider` (next-themes — already in deps)
- `QueryClientProvider` (TanStack Query)
- `TooltipProvider`
- `AuthProvider`
- `LanguageProvider`
- `CurrencyProvider`
- `CartProvider`
- `Toaster` + `Sonner`
- Global `<head>` tags (favicon, OG, Twitter meta from `index.html`)
- `DynamicHead` (analytics injection — stays as client component)
- `AdSenseScript`

#### [NEW] `app/(public)/layout.tsx`
Wraps public pages with:
- `Header`
- main content slot
- `Footer` (hidden on `/checkout`)
- `BottomNav`
- `WhatsAppButton` (hidden on `/product/[id]`)
- Replaced `ScrollToTop` with Next.js `usePathname` equivalent
- Replaced `NavigationProgress` with `next-nprogress-bar` or custom implementation

#### [NEW] `app/admin/layout.tsx`
Wraps admin pages with `ProtectedAdminRoute`.

#### [NEW] `app/seller/layout.tsx`
Wraps seller pages with `ProtectedSellerRoute`.

---

### Phase 5 — Page Migration

Every page in `src/pages/` becomes a thin Next.js page file that renders the existing component. All current page components are **kept as client components** (marked with `"use client"`) since they rely on hooks, browser APIs, and Supabase client.

**Strategy per page:**

```tsx
// app/shop/page.tsx
"use client";
import Shop from "@/pages/Shop";
export default function ShopPage() { return <Shop />; }
```

This is the **minimum-risk approach**: zero logic changes to existing components during migration. Full SSR/ISR optimisations can be added incrementally after the migration is stable.

> [!NOTE]
> The existing `src/pages/` directory is **retained** and all components move as client components. Only routing glue (`App.tsx`, `main.tsx`) is removed.

**Pages requiring router adapter work:**

| Component | Router API used | Next.js equivalent |
|---|---|---|
| `ScrollToTop` | `useLocation`, `useNavigationType` | `usePathname`, custom logic or `@/components/layout/ScrollToTop` refactor |
| `NavigationProgress` | `useLocation` | `usePathname` / `useSearchParams` |
| `AffiliateTracker` | `useLocation` | `usePathname` / `useSearchParams` |
| `WordPressRedirects` | `useNavigate`, `useLocation` | Move to `next.config.ts` `redirects()` |
| Any page using `useParams` | `useParams` from react-router | `useParams` from next/navigation (same name, compatible) |
| Any page using `useNavigate` | react-router | `useRouter` from next/navigation |
| Any page using `<Link>` | react-router-dom | next/link |
| `<Navigate>` | react-router-dom | `redirect()` or `useRouter().replace()` |

**Adapter shim approach** (minimizes diff in existing components):
Create `src/lib/router-adapter.ts` that re-exports Next.js equivalents under react-router-dom-compatible names:
- `useParams` → `useParams` from `next/navigation`
- `useNavigate` → wraps `useRouter().push`
- `Link` → `next/link`

#### [NEW] admin route group `app/admin/`
31 admin pages, all using `ProtectedAdminRoute` from layout.

#### [NEW] seller route group `app/seller/`
7 seller pages, all using `ProtectedSellerRoute` from layout.

---

### Phase 6 — Router API Replacements

#### [MODIFY] Components using `react-router-dom`

All components using react-router APIs must switch to next/navigation equivalents:

| react-router-dom | next/navigation or next/link |
|---|---|
| `useNavigate` | `useRouter` |
| `useLocation` | `usePathname` + `useSearchParams` |
| `useParams` | `useParams` |
| `<Link>` | `<Link>` from `next/link` |
| `<Navigate>` | `redirect()` (server) or `router.replace()` (client) |
| `BrowserRouter` | Removed (Next.js handles routing) |
| `Routes` / `Route` | Removed (App Router file system) |

> [!IMPORTANT]
> `react-router-dom` is **removed** from dependencies entirely. Any component importing from it must be updated. This is the most labor-intensive part of the migration.

**Files needing react-router-dom replacement** (estimated ~50 files across pages and components):
- All layout components: `ScrollToTop`, `NavigationProgress`, `AffiliateTracker`, `BottomNav`, `Header`, `Footer`, `WordPressRedirects`
- All page components that use `useNavigate`, `useParams`, `useLocation`, `<Link>`, `<Navigate>`
- Protected route components

---

### Phase 7 — PWA

#### Replace `vite-plugin-pwa` → `next-pwa`
- `next-pwa` generates service worker in `next.config.ts`
- `public/sw-push.js` remains for FCM push (kept as-is)
- Manifest config moves from `vite.config.ts` to `app/manifest.ts` (Next.js 15 API)

---

### Phase 8 — Sitemap & SEO

- Delete `scripts/generate-sitemap.ts` (Vite-specific prebuild script)
- Create `app/sitemap.ts` (Next.js built-in sitemap API) or keep existing static XML files in `public/`
- `DynamicHead.tsx` stays as a client component for runtime analytics injection
- Static meta tags move to layout `metadata` exports

---

### Phase 9 — Final Cleanup

- Remove `src/vite-env.d.ts`
- Remove `eslint.config.js` Vite-specific rules
- Update `components.json` (shadcn): change `tsx: true` path aliases to Next.js compatible
- Update `tailwind.config.ts` content paths (`"./app/**/*.{ts,tsx}"` added)
- Delete `bun.lock` / `bun.lockb` if using npm

---

## Open Questions

> [!IMPORTANT]
> **OAuth Redirect URI**: The Lovable OAuth integration handled Google/Apple sign-in through Lovable's own auth proxy. Replacing it with native Supabase OAuth requires configuring redirect URIs in both Supabase dashboard (Site URL + Redirect URLs) and Google/Apple developer consoles. Do you have access to configure these?

> [!IMPORTANT]
> **PWA / Service Worker**: The site currently has a custom `public/sw-push.js` for Firebase push notifications. In Next.js + `next-pwa`, the auto-generated service worker and the custom push worker need to coexist. Should we keep the PWA / push notification support?

> [!IMPORTANT]
> **Testing Migration**: The project has `vitest` tests in `src/test/`. Next.js uses Jest by default. Should we migrate tests to Jest or simply defer test migration and keep tests as-is (they'll be skipped during migration)?

> [!NOTE]
> **SSR vs. CSR**: All pages will start as **Client Components** (`"use client"`) for a zero-risk migration. After the migration is stable, individual pages (e.g. product detail, blog post) can be upgraded to Server Components with `generateStaticParams` for better SEO/performance. Should we plan SSR upgrades for any specific pages in this first pass?

> [!NOTE]
> **Deployment**: Where will the Next.js app be deployed? Vercel (simplest), self-hosted Node.js server, or a static export? This affects how we handle API routes, edge functions, and ISR.

---

## Verification Plan

### After each phase:
- Run `next build` to check for TypeScript / import errors
- Run `next dev` and manually verify affected pages

### Manual Verification Checklist
- [ ] Home page loads correctly
- [ ] Product listing and detail pages work
- [ ] Cart and checkout flow complete
- [ ] Admin login and dashboard accessible
- [ ] Seller portal login and dashboard accessible
- [ ] Google/Apple OAuth sign-in works (requires Supabase redirect config)
- [ ] No `lovable` references in browser network tab or source
- [ ] PWA installable (if kept)
- [ ] Analytics scripts injecting correctly
- [ ] All 75+ routes render without 404

---

## Execution Order Summary

1. ✅ Bootstrap Next.js project config (`next.config.ts`, updated `package.json`, `tsconfig.json`)
2. ✅ Rename env vars (`.env.local`)
3. ✅ Remove Lovable artifacts (delete files, patch references)
4. ✅ Create App Router layouts (`app/layout.tsx`, `app/(public)/layout.tsx`, etc.)
5. ✅ Migrate all 75 pages to `app/` route files (thin client component wrappers)
6. ✅ Replace `react-router-dom` APIs across all components
7. ✅ Port PWA to `next-pwa` + `app/manifest.ts`
8. ✅ Finalize SEO and sitemap
9. ✅ Run build and fix errors
10. ✅ Cleanup dead code and files
