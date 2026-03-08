# Personal Blog

Astro v5 blog built on the [AstroPaper](https://github.com/satnaing/astro-paper) template. Deployed to Cloudflare Pages.

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Type-check → build → run pagefind → copy index to public/
pnpm preview      # Preview production build
pnpm lint         # ESLint
pnpm format       # Prettier (write)
pnpm format:check # Prettier (check only)
pnpm sync         # Sync Astro content types
```

## Architecture

```
src/
  components/     # 13 Astro components (Header, Card, Tag, Datetime, etc.)
  layouts/        # Layout, PostDetails, Main, AboutLayout
  pages/          # Routes — static and dynamic
    api/          # Keystatic CMS API endpoint
    posts/        # Blog post list + detail pages
    tags/         # Tag index + filtered post pages
  data/blog/      # Markdown blog posts (content collection)
  utils/          # 9 utility functions (slugify, OG image gen, etc.)
  config.ts       # SITE object — primary site configuration
  constants.ts    # Social links, share links
  content.config.ts # Zod schema for blog posts
```

## Key Config Files

| File | Purpose |
|------|---------|
| `src/config.ts` | Site URL, author, timezone, feature flags — **needs personalization** |
| `src/constants.ts` | Social links and edit-post URL — **needs personalization** |
| `astro.config.ts` | Integrations, markdown/Shiki, Cloudflare adapter, experimental fonts |
| `keystatic.config.ts` | CMS schema; currently uses local storage |
| `wrangler.jsonc` | Cloudflare Workers/Pages config |

## Content Authoring

Blog posts live in `src/data/blog/` as Markdown files. Required frontmatter:

```yaml
title: string
author: string
pubDatetime: 2025-01-01T00:00:00Z   # ISO 8601
description: string
tags: [tag1, tag2]
draft: false
featured: false
```

The Keystatic CMS UI is available at `/keystatic` in dev mode (`pnpm dev`).

## Deployment

Cloudflare Pages via `@astrojs/cloudflare` adapter. Push to `main` → auto-deploy (if CI passes).

Build command for Cloudflare: `pnpm build`
Output directory: `dist/`

## Gotchas

- **Pagefind search only works after a full build** — it's not available in `pnpm dev`. The build step runs pagefind and copies the index to `public/pagefind/`.
- **`@resvg/resvg-js` is externalized** in Vite config — required for OG image generation on Cloudflare. Don't move it to bundled deps.
- **`src/config.ts` still has AstroPaper defaults** — `website`, `author`, `profile`, `editPost.url`, and `timezone` all need updating before going live.
- **`dynamicOgImage: false`** by default — OG images must be provided manually per post, or set to `true` to auto-generate via Satori.
- **Nested blog directories** — subdirectories prefixed with `_` (e.g., `_releases/`) are excluded from URL slugs. Other nested dirs are included.
- **Scheduled posts** — posts with `pubDatetime` up to 15 minutes in the future will still be published (controlled by `scheduledPostMargin` in `config.ts`).

## Environment Variables

```bash
PUBLIC_GOOGLE_SITE_VERIFICATION=  # Optional — Google Search Console
```

Copy `.env.example` to `.env` (or set directly in Cloudflare Pages dashboard).
