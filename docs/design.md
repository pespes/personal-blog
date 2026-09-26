# design.md

> The design-decision reference for this blog: how theming works, where every design value lives, and the rules to follow when touching UI code. **Read it before generating or changing UI.** Update it in the same change whenever a design-architecture decision changes (see [Keeping this file current](#keeping-this-file-current)).

Last updated: 2026-09-26

---

## Purpose & stack

A personal blog (author: Peter Esveld) built on **Astro v7** (AstroPaper template), deployed as a fully static site to **Cloudflare Pages**.

| Concern | Tool | Where |
| --- | --- | --- |
| Styling | **Tailwind CSS v4** — CSS-first config (`@import "tailwindcss"` + `@theme inline`), no `tailwind.config.js` | `src/styles/global.css` |
| Long-form content | `@tailwindcss/typography`, customised as `.app-prose` | `src/styles/typography.css` |
| Fonts | **Inter** everywhere + **JetBrains Mono** for code, via Astro's top-level `fonts` API (Google provider) | `astro.config.ts`, `<Font>` in `src/layouts/Layout.astro` |
| Code highlighting | Shiki, dual theme (`min-light` / `night-owl`) + `@shikijs/transformers` | `astro.config.ts` → `markdown.shikiConfig` |
| Icons | **Lucide** (`@lucide/astro`); brand logos as local SVGs | `src/assets/icons/` (brands only) |
| Theme switching | `data-theme` attribute on `<html>` | `src/layouts/Layout.astro` (inline), `src/scripts/theme.ts` |

---

## Source of truth

**The code is the source of truth for all design values.** There is no token pipeline or design-tool sync: colors are hand-authored CSS custom properties in `src/styles/global.css`, and everything else is Tailwind utilities in components.

Figma files exist as sketch/mockup references only (main file "Personal blog": `FdZ1cB4BCyXrA8YlOOXbm0`, which replaced the earlier design-system file `m8DPlUQk60FzGE02CnrhS2` on 2026-09-26; playground: `u3YqsuB3YHy2SmlZwSfv3C`). They are **not** synced and may lag behind the code — when Figma and code disagree, the code wins. Work with Figma through the **Figma Console MCP** (`figma-console`); see the Figma section of [`CLAUDE.md`](../CLAUDE.md).

---

## Theming

### Color tokens

Five semantic color tokens, each with a light and dark value. They are the **only** place color values are defined.

| Token | Tailwind utility | Role | Light | Dark |
| --- | --- | --- | --- | --- |
| `--background` | `bg-background` | Page background | `#fdfdfd` | `#1c1917` |
| `--foreground` | `text-foreground` | Body text, icons | `#282728` | `#ffffff` |
| `--accent` | `text-accent`, `bg-accent`, `outline-accent` | Links on hover, active states, focus rings, CTA, list markers | `#006cac` | `#5db1e8` |
| `--muted` | `bg-muted` | Inline code background, scrollbar thumb, subtle fills | `#e6e6e6` | `#292524` |
| `--border` | `border-border` | Dividers, card/image/table borders (default border color for `*`) | `#ece9e9` | `#57534e` |

**How they're wired (three layers — keep this order):**

1. **Raw values** — defined on `:root, html[data-theme="light"]` and `html[data-theme="dark"]` in `global.css`.
2. **Tailwind mapping** — the `@theme inline` block maps each to a `--color-*` theme variable (`--color-accent: var(--accent)`, …), which generates the utilities above. `inline` means utilities reference the live variable, so they switch with the theme with no `dark:` variants needed.
3. **Components** — use only the semantic utilities (`text-accent`, `border-border`, `bg-background/90`, `outline-accent/75`). Opacity modifiers are fine; new hex values are not.

To add a token: add the variable to **both** theme blocks, map it in `@theme inline`, then add a row to the table above.

### Light / dark mode

- **Attribute-driven, not media-query-driven.** The active theme is `data-theme="light" | "dark"` on `<html>`. Tailwind's `dark:` variant is redefined to follow it: `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *))`.
- **Resolution order:** the user's saved choice (`localStorage.theme`) → the site default (`initialColorScheme`, currently `""`) → the OS `prefers-color-scheme`.
- **No flash of the wrong theme:** a small inline script in the `<head>` of `Layout.astro` sets `data-theme` before first paint. `src/scripts/theme.ts` then takes over — wires the `#theme-btn` toggle, persists the choice, keeps `<meta name="theme-color">` in sync with the body background, and re-applies the theme after Astro view transitions.
- **`initialColorScheme` is duplicated** in the inline script and `theme.ts` — change both together.
- Toggle visibility is controlled by `SITE.lightAndDarkMode` in `src/config.ts` (currently on).
- **Code blocks** follow the theme through Shiki's dual-theme CSS variables (`--shiki-light*` / `--shiki-dark*`), switched in `typography.css` under `html[data-theme="dark"] .astro-code`. To change syntax colors, change the Shiki themes in `astro.config.ts`, not CSS.

### Typography

**Two typefaces, and only two: Inter for everything, JetBrains Mono for code.** There is no separate display or heading face, and generated images use Inter too.

| Role | Typeface | How it's wired |
| --- | --- | --- |
| Body, UI, headings, display, captions | **Inter** (300–700, normal + italic) | `--font-inter` → `--font-app` in `@theme inline` → `font-app`, set on `<body>`. Preloaded (latin 400) via `<Font cssVariable="--font-inter">`. |
| Code — code blocks, inline code, `kbd`, `samp` | **JetBrains Mono** (400 + 700, normal + italic) | `--font-jetbrains-mono` → `--font-mono` in `@theme inline`. Tailwind's base styles apply the mono font to `code, kbd, samp, pre`, so every code surface picks it up with no extra classes; use `font-mono` for anything else. Loaded (not preloaded) via `<Font cssVariable="--font-jetbrains-mono">`. Italic is included because the Shiki themes italicise comments. |
| Generated OG images | **Inter** (400 + 700) | Satori can't use the site's web fonts, so `src/utils/loadGoogleFont.ts` fetches Inter from Google Fonts at build time — only when `dynamicOgImage` is on. |

Both fonts are registered in `astro.config.ts` (`fonts: [...]`) **and** need a `<Font>` tag in `Layout.astro` — registering alone doesn't load a font. To add a weight, add it to the `weights` array.

- **Type scale:** Tailwind's default scale, applied per component. There are no custom type tokens.
- **Article content** is styled by `.app-prose` (`typography.css`), which layers on `prose` and recolors everything to the semantic tokens: `text-foreground` for text, `accent` for list markers, blockquote rule and link hover, `border-border` for rules/tables/images, `bg-muted/75` for inline code. Headings get `mb-3`; `h3` is italic.

### Layout & interaction conventions

- **Content width:** `max-w-app` (= `max-w-3xl`) and `app-layout` (centred, `px-4`) utilities in `global.css`. Use these, not ad-hoc max-widths.
- **Focus:** the focus ring is a **2px dashed `accent` outline, offset 1px, shown on `:focus-visible`** (plus no underline while focused). Every `a` and `button` gets it from the base layer in `global.css`. The same ring is also available as the **`focus-outline` utility** (`@utility focus-outline` in `global.css`), used on the header's icon controls (menu toggle, archives, search, theme toggle) and on `BackButton`. Add `focus-outline` to any other focusable element (e.g. a `[tabindex]` or `role="button"` element) so it matches. Never remove outlines.
- **Active nav item:** `.active-nav` (underline); icon buttons also switch their SVG stroke to accent (`[&>svg]:stroke-accent`).
- **Selection:** `bg-accent/75` with `text-background`.
- **Header:** the `Menu.astro` pill is the primary nav on `sm+` (translucent `bg-background/90` + `backdrop-blur`, `border-border`, soft shadow, accent CTA pill). On mobile it's a hamburger + dropdown `#menu-items`. Search / archives / theme toggle are an always-visible cluster outside the menu. Current items: Home, Posts, About + "Email me" CTA.

### Icons

- **UI icons come from Lucide** (`@lucide/astro`), imported by their suffixed names — `import { SearchIcon } from "@lucide/astro"` — which avoids clashes with local components such as `Menu.astro`.
- Size and color them with Tailwind (`size-*`, `stroke-*`); they default to `stroke="currentColor"`, so they inherit text color and follow the theme.
- **Brand logos are the exception.** Lucide ships none, so GitHub / LinkedIn / X / WhatsApp / Facebook / Telegram / Pinterest are Tabler SVGs in `src/assets/icons/`, referenced from `SOCIALS` / `SHARE_LINKS` in `src/constants.ts`. Don't add non-brand SVGs there — use a Lucide icon.

### Open Graph images

OG images are generated by Satori from `src/utils/og-templates/{site,post}.js`, **only when `SITE.dynamicOgImage` is on (currently off)**. The templates use Inter (see Typography) but hardcode their own light palette (`#fefbfb`, `#ecebeb`); they do **not** read the theme tokens. The site-wide `/og.png` is the static AstroPaper stock image `public/astropaper-og.jpg` (`SITE.ogImage`), with its own lettering baked in — replace it with your own image.

---

## Components

All UI lives in `src/components/` (15 `.astro` components) and `src/layouts/` (`Layout`, `Main`, `PostDetails`, `AboutLayout`).

| Group | Components |
| --- | --- |
| Navigation | `Header` (uses `Menu`), `Menu`, `Breadcrumb`, `Pagination`, `BackButton`, `BackToTopButton` |
| Content | `Card`, `Datetime`, `Tag`, `EditPost`, `Video` |
| Social | `Socials` (in `Footer`), `ShareLinks` (end of a post) |
| Primitives | `LinkButton` — the base link atom that the composite links wrap |
| Chrome | `Footer` |

Most components accept a `class` prop and merge it with `class:list` — follow that pattern for new ones. Keep styling in Tailwind utilities inside the component; global CSS is only for tokens, base element styles, and `.app-prose`.

---

## Guardrails — do not do this

- **Don't hardcode colors in components.** No hex, `rgb()`, or Tailwind palette colors (`text-blue-600`) for UI. Use the five semantic tokens. The existing exceptions are deliberate: the `Menu` drop shadow (`rgb(0 0 0 / 0.16)`), the Shiki diff/highlight tints in `typography.css`, and the OG templates.
- **Don't add a token to only one theme.** Every color variable needs a light and a dark value.
- **Don't use `@media (prefers-color-scheme)` for theming.** Use the `dark:` variant or tokens — the OS preference only feeds the initial choice.
- **Don't remove or reorder the inline theme script in `Layout.astro`** — it prevents the flash of the wrong theme.
- **Don't add a `tailwind.config.js`.** Tailwind v4 config lives in CSS (`@theme inline`, `@custom-variant`, `@utility`).
- **Don't add another typeface.** Inter covers all text, including headings; JetBrains Mono covers code. Style headings with weight and size, not a new family.
- **Don't hand-roll focus styles.** Use real `a`/`button` elements or the `focus-outline` utility.
- **Don't reintroduce the X social link.** It was removed from `SOCIALS` on 2026-07-02. (The "share to X" button in `SHARE_LINKS` is separate and intentionally kept.)

---

## Open decisions

- **OG images and theme tokens.** The OG templates carry their own hardcoded palette. Decide whether they should match the site tokens before turning `dynamicOgImage` on.

---

## Keeping this file current

Update `design.md` in the **same change** whenever you make or change a design-architecture decision: color tokens (adding, removing, or changing a token's role), typeface roles, the theming mechanism, naming conventions, a guardrail, component structure, or resolving an open decision. Edit the relevant section and append a dated Change log entry. Tweaking an existing token's hex value only needs the table above updated.

---

## Change log

- 2026-07-02: Added **Sora** (Google Fonts) as a display typeface (`--font-display`); later extended Sora to all headings (H1–H5), so Sora is now display + headings and Inter is body/UI. Superseded the original "Sora display-only" rule.
- 2026-07-02: Created the **typography token system in Figma** — `Type Primitives` collection (Major Third scale, 25 primitives) + 16 semantic Text Styles. Established the "lineHeight/letterSpacing stay literal" Figma constraint.
- 2026-07-02: Mapped all mockup + component typography to the Text Styles across the Component Library and Key Pages boards.
- 2026-07-02: Built **Batch 1 Figma components** (Footer, Socials, Breadcrumb, Pagination + social icons) to reach code parity, added usage descriptions, and re-wired the Key Pages mockups to instances. Introduced `docs/component-parity.md`.
- 2026-07-02: Removed the **X social** from `SOCIALS` (`src/constants.ts`) and from Figma `Socials`/Footer.
- 2026-09-07: Added **`Menu.astro`** — a pill-shaped primary-nav component (rounded-full translucent panel + soft shadow, text links with underline-on-hover, trailing accent CTA pill). Hand-built from a Figma mock in the **Playground** file (`u3YqsuB3YHy2SmlZwSfv3C`), **not** the synced design-system file, so it is not covered by `pnpm figma:sync`. Colors are mapped to the blog's semantic tokens (`--background`/`--border` glass, `--accent` CTA) rather than the mock's literal black/white so it works in both themes. **`Header.astro` restructured** to use it: on `sm+` the pill is the primary nav; the search / archives / theme-toggle controls moved out of the collapsible `#menu-items` list into an always-visible cluster (keeps a single `#theme-btn` for `src/scripts/theme.ts`); on mobile `#menu-items` is now an absolute dropdown of links only.
- 2026-09-26: Switched all UI icons from the AstroPaper/Tabler SVGs to **Lucide** (`@lucide/astro`): Archive, ArrowLeft/Right/Up, Calendar, ChevronLeft/Right, SquarePen (edit), Hash, Mail, Menu, Moon, Sun, Search, X. Removed the replaced SVGs (and the unused `IconRss.svg`) from `src/assets/icons/`. Brand logos stay as Tabler SVGs because Lucide has no brand icons.
- 2026-09-26: **Removed the Figma ⇄ code token sync.** Code is now the single source of truth for design values; Figma is a non-synced sketch reference. Deleted `scripts/figma-sync/` (+ its Vitest suite), `design/` (`tokens.json`, `components.json`, sync state, generated overview), the `/figma-sync` command, `docs/component-parity.md`, and the Figma planning docs under `docs/superpowers/`. The `figma-tokens` markers in `global.css` became a plain hand-authored block. Dropped the `figma:sync` / `test` scripts and the `vitest` + `tsx` dev dependencies. Consolidated theming documentation into this file, recording that the Figma-era Sora-headings / JetBrains Mono decisions were never implemented (now an open decision). Removed Tags from the header nav.
- 2026-09-26: **Typography settled on Inter everywhere + JetBrains Mono for code.** Switched generated OG images from IBM Plex Mono to **Inter**. Removed the unused **Sora** font and its `--font-display` mapping (superseding the 2026-07-02 Sora-headings decision, which never shipped). Added **JetBrains Mono** (400/700, normal + italic) as `--font-mono`, so code blocks and inline code now use it. Defined the **`focus-outline`** utility in `global.css` (it was used in `Header`/`BackButton` but never defined) with the same dashed accent ring as links and buttons.
- 2026-09-26: Moved this file from the repo root to **`docs/design.md`**; `docs/` is now the home for project documentation (README.md, CLAUDE.md and LICENSE stay at the root, where GitHub and Claude Code look for them).
