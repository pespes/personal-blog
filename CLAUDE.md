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

```text
src/
  components/     # 13 Astro components (Header, Card, Tag, Datetime, etc.)
  layouts/        # Layout, PostDetails, Main, AboutLayout
  pages/          # Routes — static and dynamic
    api/          # (Keystatic API is injected automatically by @keystatic/astro — no manual file needed)
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
| --- | --- |
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

Cloudflare Pages as a fully static site (no SSR adapter). Push to `main` → auto-deploy.

Build command for Cloudflare: `pnpm build`
Output directory: `dist/`

**Required Cloudflare Pages build environment variable:**

- `SKIP_KEYSTATIC=true` — excludes Keystatic from the production build (it injects server-side routes that break static builds)

## Media

**Images** — use standard Markdown syntax. Local images in `src/assets/images/` are processed through Astro's image pipeline (resized, format-converted). Use a relative path from the post file:

```md
![Alt text](../../assets/images/posts/my-image.jpg)
*Optional caption in italics below.*
```

Images can also be uploaded directly via the Keystatic editor — they are saved to `src/assets/images/posts/` automatically.

**Video** — use the `Video` component in `.mdx` posts for responsive YouTube or Vimeo embeds (16:9):

```mdx
import Video from '@/components/Video.astro';

<Video id="dQw4w9WgXcQ" title="My video" />
<Video id="123456789" platform="vimeo" title="My Vimeo video" />
```

## Gotchas

- **Pagefind search only works after a full build** — it's not available in `pnpm dev`. The build step runs pagefind and copies the index to `public/pagefind/`.
- **`@resvg/resvg-js` is externalized** in Vite config — required for OG image generation on Cloudflare. Don't move it to bundled deps.
- **`src/config.ts` still has AstroPaper defaults** — `website`, `author`, `profile`, `editPost.url`, and `timezone` all need updating before going live.
- **Dynamic OG images are enabled** — auto-generated at build time via Satori for posts without an explicit `ogImage`. Adds ~1s per post to build time.
- **Nested blog directories** — subdirectories prefixed with `_` (e.g., `_releases/`) are excluded from URL slugs. Other nested dirs are included.
- **Scheduled posts** — posts with `pubDatetime` up to 15 minutes in the future will still be published (controlled by `scheduledPostMargin` in `config.ts`).

## Environment Variables

```bash
PUBLIC_GOOGLE_SITE_VERIFICATION=  # Optional — Google Search Console
```

Copy `.env.example` to `.env` (or set directly in Cloudflare Pages dashboard).
