# Personal Blog

Built by Peter Esveld

A personal blog built with [Astro](https://astro.build/) and deployed to [Cloudflare Pages](https://pages.cloudflare.com/). Based on the [AstroPaper](https://github.com/satnaing/astro-paper) theme.

## Stack

- **[Astro](https://astro.build/)** — static site framework with MDX support
- **[Tailwind CSS v4](https://tailwindcss.com/)** — styling
- **[Keystatic](https://keystatic.com/)** — CMS for managing blog posts
- **[Pagefind](https://pagefind.app/)** — static search
- **[Cloudflare Pages](https://pages.cloudflare.com/)** — hosting

## Setup

**Prerequisites:** [pnpm](https://pnpm.io/), Node 20+

```bash
# Clone and install
git clone git@github.com:pespes/personal-blog.git
cd personal-blog
pnpm install

# Start dev server
pnpm dev
```

The dev server runs at `http://localhost:4321`. The Keystatic CMS is available at `http://localhost:4321/keystatic`.

## Commands

| Command        | Description                                        |
| -------------- | -------------------------------------------------- |
| `pnpm dev`     | Start dev server at localhost:4321                 |
| `pnpm build`   | Type-check, build, run Pagefind, copy search index |
| `pnpm preview` | Preview production build locally                   |
| `pnpm lint`    | Run ESLint                                         |
| `pnpm format`  | Format with Prettier                               |

## Configuration

Before going live, update these two files:

- **[`src/config.ts`](src/config.ts)** — site URL, author name, timezone, and feature flags
- **[`src/constants.ts`](src/constants.ts)** — social links and edit-post URL

## Writing Posts

Posts live in `src/data/blog/` as `.md` or `.mdx` files. You can write them directly or use the Keystatic CMS UI at `/keystatic` in dev mode.

### Frontmatter

Every post requires this frontmatter:

```yaml
---
title: My Post Title
author: Your Name
pubDatetime: 2025-01-01T10:00:00Z
description: A short description for SEO and post cards.
tags: [tag1, tag2]
draft: false
featured: false
---
```

Optional fields:

```yaml
modDatetime: 2025-06-01T10:00:00Z   # Shows "updated" date
ogImage: /assets/my-image.jpg        # Custom OG image (otherwise auto-generated)
timezone: America/New_York           # Override global timezone for this post
hideEditPost: true                   # Hide the "Edit page" link
canonicalURL: https://...            # If cross-posted elsewhere
```

### Images

Standard Markdown image syntax works everywhere:

```markdown
![Alt text](https://example.com/photo.jpg)
```

For optimized images with captions, use an `.mdx` post with the `Figure` component:

```mdx
import Figure from '@/components/Figure.astro';

<Figure
  src="https://example.com/photo.jpg"
  alt="Description"
  caption="Photo credit: ..."
/>
```

Local assets (in `src/assets/images/`) are processed through Astro's image pipeline:

```mdx
import Figure from '@/components/Figure.astro';
import myPhoto from '@/assets/images/photo.jpg';

<Figure src={myPhoto} alt="Description" caption="Caption text" />
```

### Videos

In `.mdx` posts, embed YouTube or Vimeo videos with the `Video` component:

```mdx
import Video from '@/components/Video.astro';

<Video id="dQw4w9WgXcQ" title="Video title" />
<Video id="123456789" platform="vimeo" title="Vimeo video title" />
```

The `id` is the video ID from the URL (e.g. `youtube.com/watch?v=dQw4w9WgXcQ`).

### Draft posts

Set `draft: true` in frontmatter to hide a post from production. Draft posts are still visible in dev mode.

### Scheduling posts

Set `pubDatetime` to a future date/time. Posts publish within 15 minutes of that time (controlled by `scheduledPostMargin` in `src/config.ts`).

## Deployment

Pushing to `main` triggers an automatic build and deploy to Cloudflare Pages via GitHub Actions.

### First-time Cloudflare setup

1. Connect the repo to Cloudflare Pages in the dashboard
2. Set build command: `pnpm build`
3. Set output directory: `dist/`
4. Set Node.js version to 20 in environment variables: `NODE_VERSION=20`

### Environment variables

Set these in the Cloudflare Pages dashboard under **Settings → Environment variables**:

| Variable | Required | Description |
| --- | --- | --- |
| `PUBLIC_GOOGLE_SITE_VERIFICATION` | No | Google Search Console verification |
