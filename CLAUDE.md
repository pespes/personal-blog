# Personal Blog

Astro v7 blog built on the [AstroPaper](https://github.com/satnaing/astro-paper) template. Deployed to Cloudflare Pages.

**Requires Node `22.12.0`+** (enforced via `engines` + `.nvmrc`; Astro 6 dropped Node 18/20 and Astro 7 keeps the same floor).

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
docs/             # Project documentation (design.md = design & theming reference)
src/
  components/     # 15 Astro components (Header, Card, Tag, Datetime, Video, etc.)
  layouts/        # Layout, PostDetails, Main, AboutLayout
  pages/          # Routes — static and dynamic
    api/          # (Keystatic API is injected automatically by @keystatic/astro — no manual file needed)
    posts/        # Blog post list + detail pages
    tags/         # Tag index + filtered post pages
  data/blog/      # Markdown blog posts (content collection)
  utils/          # 10 utility modules (slugify, OG image gen, etc.) + transformers/
  config.ts       # SITE object — primary site configuration
  constants.ts    # Social links, share links
  content.config.ts # Zod schema for blog posts
```

## Key Config Files

| File | Purpose |
| --- | --- |
| `src/config.ts` | Site URL, author, timezone, feature flags — **needs personalization** |
| `src/constants.ts` | Social links and edit-post URL — **needs personalization** |
| `astro.config.ts` | Integrations, markdown processor/Shiki, top-level `fonts` API |
| `keystatic.config.ts` | CMS schema; currently uses local storage |
| `wrangler.jsonc` | Cloudflare Pages/Workers static assets config (`wrangler dev` for local preview) |

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

**`SKIP_KEYSTATIC=true`** excludes Keystatic from the production build (it injects server-side routes that break static builds). This is already set inline in the `build` script in `package.json`, so it does **not** need to be configured separately in the Cloudflare dashboard.

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
- **OG image generation uses Satori → `@resvg/resvg-js`** (native bindings). `sharp`, `esbuild`, and `workerd` are allowed to run install scripts via `allowBuilds` in `pnpm-workspace.yaml`; don't remove them.
- **`src/config.ts` still has AstroPaper defaults** — `website`, `profile`, `desc`, `editPost.url`, and `timezone` all need updating before going live (`author`/`title` are already personalized).
- **Dynamic OG images are a feature flag (`dynamicOgImage`)** — currently **disabled** in `config.ts`. When enabled, posts without an explicit `ogImage` get an OG image auto-generated at build time via Satori (adds ~1s per post).
- **Nested blog directories** — subdirectories prefixed with `_` (e.g., `_releases/`) are excluded from URL slugs. Other nested dirs are included.
- **Scheduled posts** — posts with `pubDatetime` up to 15 minutes in the future will still be published (controlled by `scheduledPostMargin` in `config.ts`).

### Astro 7 migration notes

- **`zod` is pinned to `^4.5.4`** via `overrides` in `pnpm-workspace.yaml`. Astro `7.3` depends on `zod ^4.5.4` internally; `@astrojs/rss` and `@astrojs/sitemap` still declare `zod ^4.3.6`, so without the override pnpm resolves a second copy at `4.3.6`. The override keeps one zod on Astro's line. (Under Astro 6 this was pinned _down_ to `4.3.6` for a `z.function().optional()` incompatibility — that constraint is gone in v7.)
- **`@keystar/ui` is pinned to `0.10.0`** via `overrides` in `pnpm-workspace.yaml`. `@keystatic/core@0.6.x` requires `@keystar/ui ~0.10.0`, but pnpm otherwise keeps resolving the `0.7.21` that `@keystatic/core@0.5.x` used (leaving an unmet-peer warning). Bump this to match whatever `@keystatic/core` requires when Keystatic is upgraded.
- **Markdown plugins use the `markdown.processor` API** — Astro 7 renders `.md`/`.mdx` through its native pipeline; remark plugins require `@astrojs/markdown-remark` (a direct dependency, kept in sync with Astro's internal version — `7.3.1` for Astro `7.3.5`) via `processor: unified({ remarkPlugins: [...] })` in `astro.config.ts`. `@astrojs/mdx@8` also peer-depends on `@astrojs/markdown-remark ^7.3.0`.
- **`@shikijs/transformers` is pinned to the exact version Astro bundles** (`4.1.0` for Astro `6.4.x` and `7.3.x`). A newer minor pulls a second copy of `@shikijs/types`, and `astro check` then fails with `CodeToHastOptions ... is not assignable` on the transformer calls in `shikiConfig`. When bumping Astro, re-pin this to match `pnpm why shiki`.
- **`fonts` is a top-level config option** (was `experimental.fonts` in v5). `experimental.preserveScriptOrder` was removed (now the default).
- **`z` is imported from `astro/zod`** in `content.config.ts`, not from `astro:content` (deprecated since v6).
- **Clean `node_modules` after major upgrades** — stale, non-pnpm package directories left in `node_modules` (e.g. an old hoisted `zod`) can shadow the correct versions. If resolution looks wrong, `rm -rf node_modules && pnpm install`.

## Design & theming — `docs/design.md`

[`docs/design.md`](docs/design.md) is the single design reference: color tokens and their light/dark values, how theme switching works, typography, icons, component inventory, guardrails, and open decisions. **Read it before generating or changing UI.**

- The code is the source of truth. Color tokens are hand-authored CSS custom properties in `src/styles/global.css` (mapped to Tailwind via `@theme inline`); there is no Figma/token sync.
- **Keep `docs/design.md` current:** whenever you make or change a **design-architecture decision** — color tokens, typeface roles, the theming mechanism, naming conventions, a guardrail, component structure, or resolving one of its open decisions — update `docs/design.md` in the **same change**: edit the relevant section and append a dated entry to its Change log.

## Figma — use Figma Console MCP

For any Figma work in this project (reading designs, screenshots, variables, components, or editing the canvas), the Figma MCP servers are ranked:

1. **`figma-console`** — the default ([figma-console-mcp](https://github.com/southleft/figma-console-mcp), tools named `mcp__figma-console__figma_*`), plus the skills built on it (e.g. `figma-deep-component`, `figma-export-tokens`, `figma-lint-design`).
2. **`figma`** — official remote server (`mcp__figma__*`, with the `figma:*` plugin skills).
3. **`figma-devmode`** — local Dev Mode server (`mcp__figma-devmode__*`).

**Always start with `figma-console`, and ask before switching.**

1. **Check the bridge first:** call `figma_get_status` with `probe: true` and confirm which file is connected.
2. **If it isn't connected, help the user fix it — don't switch.** Ask them to open Figma Desktop and run the **Desktop Bridge** plugin in the target file (Plugins → Development → Figma Desktop Bridge), then call `figma_reconnect` and probe again. Repeat until it works or the user says they can't or don't want to.
3. **Only then offer a fallback, and ask first.** Never call `figma` or `figma-devmode` tools without the user's explicit OK. Say why `figma-console` can't do the job and which server you'd use instead. The same applies when the bridge works but the task needs something only the official server offers (e.g. Code Connect, `generate_figma_design`).
4. **Go back to `figma-console`** after any approved fallback. Approval covers that task only, not the rest of the session.

If the user names a server themselves, that counts as approval to use it.

- **Setup:** `figma-console` is configured at user scope (`~/.claude.json`, which holds `FIGMA_ACCESS_TOKEN`), not in this repo. Don't add a project `.mcp.json` entry for it — it would shadow the user config and need the token in the shell.
- **Check the file name before writing.** Several files (and other sessions) can be connected at once; confirm the active file before any edit or delete. The main file is "Personal blog" (`FdZ1cB4BCyXrA8YlOOXbm0`).
- Figma is a sketch reference only — the code is the source of truth (see `docs/design.md`). Nothing syncs between them.

## Environment Variables

```bash
PUBLIC_GOOGLE_SITE_VERIFICATION=  # Optional — Google Search Console
```

Copy `.env.example` to `.env` (or set directly in Cloudflare Pages dashboard).
