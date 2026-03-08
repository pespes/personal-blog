# Personal Blog

A personal blog built with [Astro](https://astro.build/) and deployed to [Cloudflare Pages](https://pages.cloudflare.com/). Based on the [AstroPaper](https://github.com/satnaing/astro-paper) theme.

## Stack

- **[Astro](https://astro.build/)** — static site framework
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

Site settings live in [`src/config.ts`](src/config.ts) — update `website`, `author`, `title`, and `timezone` before deploying.

Social and share links are in [`src/constants.ts`](src/constants.ts).

## Writing Posts

Posts are Markdown files in `src/data/blog/`. Required frontmatter:

```yaml
---
title: My Post Title
author: Your Name
pubDatetime: 2025-01-01T10:00:00Z
description: A short description.
tags: [tag1, tag2]
draft: false
featured: false
---
```

You can also write posts via the Keystatic CMS UI at `/keystatic` in dev mode.

## Deployment

Pushing to `main` triggers an automatic deploy to Cloudflare Pages via GitHub Actions.

To set up from scratch: connect the repo to Cloudflare Pages with build command `pnpm build` and output directory `dist/`.

**Optional:** Set `PUBLIC_GOOGLE_SITE_VERIFICATION` in Cloudflare Pages environment variables for Google Search Console.
