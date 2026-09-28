# design.md

> The design-decision reference for this blog: how theming works, where every design value lives, and the rules to follow when touching UI code. **Read it before generating or changing UI.** Update it in the same change whenever a design-architecture decision changes (see [Keeping this file current](#keeping-this-file-current)).

Last updated: 2026-09-26

---

## Purpose & stack

A personal blog (author: Peter Esveld) built on **Astro v7** (AstroPaper template), deployed as a fully static site to **Cloudflare Pages**.

| Concern | Tool | Where |
| --- | --- | --- |
| Design system | **HeroUI v3** theme layer (tokens, type styles, shadows, focus ring) — CSS only, no HeroUI React components | `src/styles/heroui-theme.css` |
| Styling | **Tailwind CSS v4** — CSS-first config (`@import "tailwindcss"` + `@theme inline`), no `tailwind.config.js` | `src/styles/global.css` |
| Long-form content | `@tailwindcss/typography`, customised as `.app-prose` | `src/styles/typography.css` |
| Fonts | **Inter** everywhere + **JetBrains Mono** for code, via Astro's top-level `fonts` API (Google provider) | `astro.config.ts`, `<Font>` in `src/layouts/Layout.astro` |
| Code highlighting | Shiki, dual theme (`min-light` / `night-owl`) + `@shikijs/transformers` | `astro.config.ts` → `markdown.shikiConfig` |
| Icons | **Lucide** (`@lucide/astro`); brand logos as local SVGs | `src/assets/icons/` (brands only) |
| Theme switching | `data-theme` attribute on `<html>` | `src/layouts/Layout.astro` (inline), `src/scripts/theme.ts` |

---

## Source of truth

**The code is the source of truth for all design values.** There is no token pipeline or design-tool sync: colors, shadows, focus rings and type styles are hand-authored in `src/styles/heroui-theme.css` (adapted once, by hand, from the HeroUI Figma Kit V3 — see [Color tokens](#color-tokens)), and everything else is Tailwind utilities in components.

Figma files exist as sketch/mockup references only (design-system reference: "HeroUI Figma Kit V3 (Community)" `Rtri93bnzqBZuWUHkgp7XI`; main file "Personal blog": `FdZ1cB4BCyXrA8YlOOXbm0`, which replaced the earlier design-system file `m8DPlUQk60FzGE02CnrhS2` on 2026-09-26; playground: `u3YqsuB3YHy2SmlZwSfv3C`). They are **not** synced and may lag behind the code — when Figma and code disagree, the code wins. Work with Figma through the **Figma Console MCP** (`figma-console`); see the Figma section of [`CLAUDE.md`](../CLAUDE.md).

---

## Theming

### Color tokens

The palette is **HeroUI v3's theme layer**, extracted 2026-09-26 from the `02_Theme (HeroUI)` variable collection of the HeroUI Figma Kit V3 (`Rtri93bnzqBZuWUHkgp7XI`) and adapted into `src/styles/heroui-theme.css` — the **only** place color values are defined. The kit's `01_Base (Tailwind)` collection and `tailwind/*` styles are stock Tailwind v4 and were not taken.

Figma group paths are flattened to HeroUI's CSS names (`accent/accent` → `--accent`, `foreground/muted` → `--muted`, `foreground/link` → `--link`, `focus-ring` → `--focus`, `field/background` → `--field-background`). The file is the full reference for values; the roles are:

| Group | Tokens (Tailwind: `bg-*` / `text-*` / `border-*`) | Role |
| --- | --- | --- |
| Canvas | `background` (+ `-secondary`, `-tertiary`, `-inverse`), `foreground` | Page background (`#f5f5f5` / `#060607`) and body text (`#18181b` / `#fcfcfc`) |
| Text | `muted`, `link` | Secondary text (dates, captions, prev/next titles); links (= `foreground`, distinguished by underline) |
| Surfaces | `surface` (+ `-secondary`, `-tertiary`, each with `-foreground`) | Cards and panels on the canvas. `surface-tertiary` is the subtle fill for inline code, the code-copy button, the code-filename tab, search tips and the scrollbar thumb. |
| Overlays | `overlay`, `overlay-foreground`, `backdrop` | Popovers, menus, modals |
| Lines | `border`, `separator` (+ `-secondary`, `-tertiary`) | `border` is the default for `*`; `separator` for dividers |
| Focus | `focus` (= `accent`) | Focus rings |
| Status | `default`, `accent`, `success`, `warning`, `danger` | Each has six slots: base, `-hover`, `-foreground`, `-soft`, `-soft-hover`, `-soft-foreground` |
| Forms | `field` (+ `-hover`, `-focus`), `field-foreground`, `field-placeholder`, `field-border` (+ `-hover`) | Inputs. Field borders are fully transparent in HeroUI; fields get their edge from `shadow-field`. |
| Other | `segment`, `segment-foreground`, `chart-1…5` | Segmented controls, charts |

The full HeroUI set is kept even where nothing consumes it yet (fields, segment, charts, status colors): unused variables cost nothing and keep parity with HeroUI.

**Accent is for fills, not text.** `--accent` (`#0485f7`, same in both modes) is only 3.38:1 on the light background, so it is used for fills (the header's "Send an email" button, selection, the reading-progress bar, the back-to-top ring), non-text graphics (the blockquote rule — 3:1 is the bar there) and the large 404 display text. Links follow HeroUI: `text-link` (= foreground) + underline. If a colored text link is ever needed, use `text-accent-soft-foreground` (5.59:1 light / 8.21:1 dark).

**Known contrast shortfalls, accepted for now:** white label on an accent button (`accent-foreground` on `accent`) is 3.59:1 (AA only for large/bold text); `muted` on `background` in light mode is 4.43:1.

**How they're wired (three layers — keep this order):**

1. **Raw values** — on `:root, html[data-theme="light"]` and `html[data-theme="dark"]` in `heroui-theme.css`. Theme-independent values (`--border-width`, `--field-radius`, `--disabled-opacity`, `--ring-offset-width`, `--ring-focus-width`, …) are on `:root`.
2. **Tailwind mapping** — the `@theme inline` block in the same file maps each to a `--color-*` theme variable, which generates the utilities. `inline` means utilities reference the live variable, so they switch with the theme with no `dark:` variants needed. It also maps `--radius-field` (`rounded-field`) and the shadows.
3. **Components** — use only semantic utilities (`text-muted`, `bg-surface-tertiary`, `bg-accent`, `border-border`, `bg-background/90`). Opacity modifiers are fine; new hex values are not.

To add a token: add the variable to **both** theme blocks, map it in `@theme inline`, then update the table above.

### Shadows

From HeroUI's Figma effect styles, as `shadow-*` utilities: `shadow-surface` (cards), `shadow-field` (inputs), `shadow-overlay` (floating panels — used by the header's mobile dropdown), `shadow-switch`, `shadow-tab`, and `inset-shadow-inner`. Their colors are tokens, so in dark mode the drop shadows go transparent and only the 1px inner highlight remains.

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

- **Type styles** come from HeroUI's Figma text styles as `type-*` utilities in `heroui-theme.css` (all Inter, letter-spacing 0):

  | Utility | Size / leading | Weight |
  | --- | --- | --- |
  | `type-h1` … `type-h6` | 36/40, 30/36, 24/32, 20/28, 18/28, 16/24 | Semibold |
  | `type-body`, `type-body-sm`, `type-body-xs` (+ `-medium`) | 16/28, 14/24, 12/20 | Regular (Medium) |
  | `type-link`, `type-link-sm` | 16/24 underlined, 14/20 underline-on-hover | Medium |
  | `type-field`, `type-field-sm`, `type-button`, `type-button-sm` | 16/24, 14/20 | Regular / Medium |

  Headings match Tailwind's default size/leading pairs; body styles use one step looser leading for long-form reading. Other text uses Tailwind's default scale directly.
- **Article content** is styled by `.app-prose` (`typography.css`), which layers on `prose`. Headings `h1`–`h6` use `type-h1`…`type-h6` (not the typography plugin's sizes) with `mb-3`. Text is `text-foreground`; links are `text-link` with a `muted` underline that turns `foreground` on hover; list markers are `muted`; inline code is `bg-surface-tertiary/75`; `hr` uses `border-separator`; tables and images use `border-border`.
- **Code-block annotations** (Shiki transformers, `typography.css`) use status tokens: diff add = `bg-success-soft` with a `success-soft-foreground` `+`, diff remove = `bg-danger-soft` with a `danger-soft-foreground` `−`, highlighted line = `bg-default`. The filename tab's dot is `bg-success`.

### Layout & interaction conventions

- **Content width:** `max-w-app` (= `max-w-3xl`) and `app-layout` (centred, `px-4`) utilities in `global.css`. The header uses the wider `max-w-header` (`--container-header: 70rem`, 1120px). Use these, not ad-hoc max-widths.
- **No forced scrollbar.** `<html>` does not set `overflow-y: scroll` (AstroPaper did, to avoid a sideways shift between short and long pages). With classic, non-overlay scrollbars it reserved an empty gutter on short pages, which cut the full-width header/footer borders short. The trade-off: centred content may shift a few pixels between pages that scroll and pages that don't.
- **Focus:** HeroUI's ring — **a 2px solid `focus` (accent) ring after a 2px `background`-colored gap, on `:focus-visible`** — as the **`focus-ring` utility** (`heroui-theme.css`). It is built on Tailwind's `ring-*` utilities, so it stacks with an element's own `shadow-*` instead of replacing it. Every `a` and `button` gets it from the base layer in `global.css`; `summary` and `pre` in `.app-prose` apply it too, and the header's icon controls and `BackButton` restate it. Add `focus-ring` to any other focusable element (e.g. a `[tabindex]` or `role="button"` element). Inputs use **`focus-ring-field`** (2px ring, no gap). Pagefind renders its own markup, so `search.astro` restates both rings in plain CSS. Never remove focus indicators.
- **Borders are solid.** The page chrome — the header's bottom border and the footer's top border — uses `border-border` and runs full width. In-content dividers (home-page section break, post `hr`s) use `border-separator`; component outlines use `border-border`. Tag links have a solid 2px `foreground` underline. No dashed borders or underlines.
- **Active nav item:** marked with `aria-current="page"` only; there is no visible active state (matching Figma). Nav links underline on hover.
- **Links:** `text-link` + underline (`underline-offset-4`); UI links (nav, `LinkButton`, `EditPost`, back-to-top) underline on hover instead of changing color.
- **Selection:** `bg-accent/75` with `text-background`.
- **Header** (`Header.astro`, from the "Header design" section, node `8:778`, in the Personal blog Figma file): full-width (the bottom `border-border` runs edge to edge), with its content centred in `max-w-header` (70rem = 1120px, from Figma, padding included) and `px-6`; `py-8` on `lg+` / `py-6` below. Site title is `type-h4`.
  - **`lg+`:** title · centred text nav (`type-h6`, `gap-8`, underline on hover) · "Send an email" as HeroUI's **md** primary button (`h-9`, `rounded-3xl`, `bg-accent` → `hover:bg-accent-hover`, `text-accent-foreground`, `type-button-sm`) — the same button as in the dropdown.
  - **Below `lg`:** title · a 40px round hamburger (`#menu-btn`, `default-hover` background on hover and while open) that toggles `#menu-items`, a HeroUI Dropdown: `w-60`, `p-2`, `rounded-3xl`, `bg-overlay`, `shadow-overlay`, 36px items (`type-body-sm-medium`, `rounded-2_5xl`, `bg-default` on hover/focus) and the full-width CTA as HeroUI's **md** primary button (`h-9`, `type-button-sm`). It closes on Escape (focus returns to the button) or an outside click, and re-initialises after view transitions.
  - Items come from one `navItems` list shared by both: **Work** (`/`), **Writing** (`/writing`, also active on `/posts/…`), **About** (`/about`).
  - The theme toggle (`#theme-btn`, a 40px round icon button) sits in the right-hand cluster at every width; its final placement is an open decision. There must be exactly one `#theme-btn` — `src/scripts/theme.ts` finds it with `querySelector`.
  - Archives and search are not in the header; their pages (`/archives`, `/search`) still exist but are unlinked.
- **Footer** (`Footer.astro`) mirrors the header: full-width with a top `border-border` running edge to edge, content centred in `max-w-header` with `px-6 py-6`. Copyright is `type-body-sm text-muted`; the `Socials` icons are `text-muted` → `hover:text-foreground` (with a small hover tilt). Stacked and centred below `sm`, a single row on `sm+`.

### Icons

- **UI icons come from Lucide** (`@lucide/astro`), imported by their suffixed names — `import { SearchIcon } from "@lucide/astro"` — which avoids clashes with local component names.
- Size and color them with Tailwind (`size-*`, `stroke-*`); they default to `stroke="currentColor"`, so they inherit text color and follow the theme.
- **Brand logos are the exception.** Lucide ships none, so GitHub / LinkedIn / X / WhatsApp / Facebook / Telegram / Pinterest are Tabler SVGs in `src/assets/icons/`, referenced from `SOCIALS` / `SHARE_LINKS` in `src/constants.ts`. Don't add non-brand SVGs there — use a Lucide icon.

### Open Graph images

OG images are generated by Satori from `src/utils/og-templates/{site,post}.js`, **only when `SITE.dynamicOgImage` is on (currently off)**. The templates use Inter (see Typography) but hardcode their own light palette (`#fefbfb`, `#ecebeb`); they do **not** read the theme tokens. The site-wide `/og.png` is the static AstroPaper stock image `public/astropaper-og.jpg` (`SITE.ogImage`), with its own lettering baked in — replace it with your own image.

---

## Components

All UI lives in `src/components/` (15 `.astro` components) and `src/layouts/` (`Layout`, `Main`, `PostDetails`, `AboutLayout`).

| Group | Components |
| --- | --- |
| Navigation | `Header`, `Breadcrumb`, `Pagination`, `BackButton`, `BackToTopButton` |
| Content | `Card`, `Datetime`, `Tag`, `EditPost`, `Video` |
| Social | `Socials` (in `Footer`), `ShareLinks` (end of a post) |
| Primitives | `LinkButton` — the base link atom that the composite links wrap |
| Work | `ProtectedContent` — password gate for protected case studies (HeroUI surface card, field, md primary button; error text `danger-soft-foreground`) |
| Chrome | `Footer` |

The HeroUI **md primary button** classes live in `src/utils/buttonClasses.ts` (`primaryButtonClass`, no display value) and are shared by the header CTA and the case-study unlock button — reuse it rather than re-typing the class list.

Most components accept a `class` prop and merge it with `class:list` — follow that pattern for new ones. Keep styling in Tailwind utilities inside the component; global CSS is only for tokens, base element styles, and `.app-prose`.

---

## Guardrails — do not do this

- **Don't hardcode colors in components.** No hex, `rgb()`, or Tailwind palette colors (`text-blue-600`) for UI. Use the semantic tokens. The one deliberate exception is the OG templates.
- **Don't use `text-accent` for text.** It fails AA on the light background. Links are `text-link` + underline; accent is for fills and non-text graphics (see [Color tokens](#color-tokens)).
- **Don't reuse old token meanings.** `--muted` is secondary *text* (HeroUI), not a fill — subtle fills are `surface-tertiary`.
- **Don't add a token to only one theme.** Every color variable needs a light and a dark value.
- **Don't use `@media (prefers-color-scheme)` for theming.** Use the `dark:` variant or tokens — the OS preference only feeds the initial choice.
- **Don't remove or reorder the inline theme script in `Layout.astro`** — it prevents the flash of the wrong theme.
- **Don't add a `tailwind.config.js`.** Tailwind v4 config lives in CSS (`@theme inline`, `@custom-variant`, `@utility`).
- **Don't add another typeface.** Inter covers all text, including headings; JetBrains Mono covers code. Style headings with weight and size, not a new family.
- **Don't hand-roll focus styles.** Use real `a`/`button` elements or the `focus-ring` / `focus-ring-field` utilities.
- **Don't reintroduce the X social link.** It was removed from `SOCIALS` on 2026-07-02. (The "share to X" button in `SHARE_LINKS` is separate and intentionally kept.)

---

## Open decisions

- **Theme toggle placement.** The new header design (Personal blog Figma, node `8:778`) has no theme toggle. It stays in the header for now until a home is chosen.
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
- 2026-09-26: **Started the HeroUI v3 overhaul.** Extracted the `02_Theme (HeroUI)` variables (83, Light/Dark), the 19 semantic text styles and the 10 HeroUI effect styles from the HeroUI Figma Kit V3 (`Rtri93bnzqBZuWUHkgp7XI`), skipping the stock-Tailwind base layer. Adapted them into the staged `src/styles/heroui-theme.css` (`html[data-theme]` blocks, `@theme inline` mappings, `type-*` and `focus-ring` utilities). It is not imported yet; see `docs/heroui-tokens.md`.
- 2026-09-26: **Adopted the HeroUI v3 theme layer.** `heroui-theme.css` is now imported by `global.css` and replaces the five AstroPaper-era tokens (`--background` `#fdfdfd`/`#1c1917`, `--foreground`, `--accent` `#006cac`/`#5db1e8`, `--muted` fill, `--border`). Decisions: old `--muted` fills → `surface-tertiary` (closest match in both modes); accent no longer used as text — links are `text-link` + underline, UI links underline on hover, prev/next titles are `text-muted`, post titles are `type-h2 sm:type-h1` in `foreground`; HeroUI's cool-grey canvas and solid `focus-ring` replace the warm canvas and the dashed `focus-outline` utility (removed); `.app-prose` headings use `type-h1…h6` (h3 is no longer italic); the full HeroUI token set is kept; the `Menu` pill uses `shadow-overlay` (removing its hardcoded-shadow exception) and `accent-foreground` / `accent-hover`. Button-label (3.59:1) and light `muted` text (4.43:1) contrast accepted for now. Folded `docs/heroui-tokens.md` into this file.
- 2026-09-26: Moved the last hardcoded UI colors onto HeroUI tokens: Shiki diff add/remove → `success-soft`/`danger-soft` (+ `-soft-foreground` glyphs), highlighted lines → `default`, filename-tab dot → `success`. Replaced all dashed borders/underlines with solid ones: tag underlines (still `foreground`), the 404 home link, and section dividers — which now use `border-separator` (post `hr`s, prose `hr`, header, footer, home-page section break). Removed the Shiki-tint exception from the guardrails.
- 2026-09-27: **New information architecture** (from the "Header design" section, node `8:778`, in the Personal blog Figma file). `/` is now **Work**, a blank landing page (`src/pages/index.astro`); the former home page (featured + recent posts) moved to **Writing** at `/writing` (`src/pages/writing.astro`); About is unchanged. Post, tag and archive URLs are unchanged. The nav is one `navItems` list shared by the desktop pill and the mobile menu; Writing stays active on `/posts/…`. The post "Go back" fallback now points to `/writing`. The CTA is relabelled "Send an email". The header's visual redesign itself is not implemented yet.
- 2026-09-27: Removed the **archives and search** icon buttons from the header (pages still exist, unlinked from the nav; `SITE.showArchives` now only gates the archives page). The theme toggle stays in the header pending a placement decision (added to Open decisions).
- 2026-09-27: **Rebuilt `Header.astro` from the Figma "Header design"** (Personal blog, node `8:778`). Replaced the `Menu.astro` pill (deleted) with a full-width header: text nav + HeroUI primary CTA on `lg+`, hamburger + HeroUI Dropdown below `lg`. The dropdown now closes on Escape / outside click. Added `--radius-2_5xl` (20px, HeroUI's base-scale extra) for dropdown items. Removed the unused `.active-nav` class; active items are marked with `aria-current`.
- 2026-09-28: Header content is now capped at **`max-w-header`** (`--container-header: 70rem` = 1120px, from the Figma frame) and centred, while the header itself and its bottom border stay full-width. The mobile dropdown's CTA uses HeroUI's **md** button size.
- 2026-09-28: **Footer matches the header.** Full-width with a top `border-border` (was a `border-separator` line inside the content column), content in `max-w-header` + `px-6`. Mapped its remaining styling to tokens: copyright `type-body-sm text-muted` (was full-size body text), social icons `text-muted` → `hover:text-foreground` (was `opacity-90`).
- 2026-09-28: Removed `overflow-y-scroll` from `<html>`. The always-on scrollbar gutter left an empty strip at the right of short pages (e.g. Work) with classic scrollbars, so the full-width header and footer borders stopped short of the window edge.
- 2026-09-28: Removed the permanent underline on the current page's desktop nav link; the current page is marked by `aria-current` only, and links underline on hover.
- 2026-09-28: The desktop header's "Send an email" button is now HeroUI's **md** size (was lg), matching the dropdown and the updated Figma. Both uses share one `ctaClass`.
- 2026-09-28: Added **case studies** (`work` collection / Keystatic "Case Studies", `/work/<slug>`) with an optional build-time-encrypted **password gate** (`ProtectedContent.astro`, `protectCaseStudies` integration, `WORK_PASSWORD`). Extracted the md primary button classes to `src/utils/buttonClasses.ts`. Layout gained a `noindex` prop (used by protected case studies). Work is now the active nav section on `/work/…` pages.
