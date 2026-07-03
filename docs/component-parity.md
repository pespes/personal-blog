# Figma ⇄ Code Component Parity Index

Tracks parity between Astro components (`src/components/`) and Figma components in file `m8DPlUQk60FzGE02CnrhS2`. Source of truth for componentization work.

_Last updated: 2026-07-02 (Batch 1 complete)._

## Status legend

- ✅ **In parity** — Figma component exists and matches the code component.
- 🟡 **Partial** — exists but needs work (e.g. missing a variant).
- ❌ **Missing** — no Figma component; exists only in code (and often as ad-hoc frames in mockups).
- ➖ **N/A** — not applicable / no code counterpart.

## Index — all 14 code components

| # | Code component | Figma | Appears in mockups | Wraps LinkButton | Priority | Notes |
|---|---|---|---|---|---|---|
| 1 | `Card.astro` | ✅ | Home, Posts (instances) | — | — | In parity. |
| 2 | `Header.astro` | 🟡 | All pages (desktop/tablet instances) | — | Batch 2 | Needs a **mobile size variant** — mobile mockups use ad-hoc "Peter Esveld" + hamburger frames instead of the component. |
| 3 | `Tag.astro` | ✅ | Post detail, Tags (instances) | — | — | In parity (Size=Large/Small). |
| 4 | `Datetime.astro` | ✅ | Home, Post detail (instances) | — | — | In parity (Size=Small/Large). |
| 5 | `LinkButton.astro` | ✅ | All pages (base atom) | self | — | In parity (State=Default/Hover). Base atom for the composites below. |
| 6 | `Footer.astro` | ✅ | **All 4 pages × 3 breakpoints (~12)** | via Socials | ✅ Batch 1 | Built (id `161:879`), `copyright` TEXT prop, top border + Socials + Caption copyright. Mockups re-wired to instances. |
| 7 | `Socials.astro` | ✅ | Inside every footer | ✅ (icon buttons) | ✅ Batch 1 | Built (id `158:171`) as an **icon** row (GitHub / Mail); nested in Footer. Uses `Icon/GitHub`, `Icon/Mail`. (X social removed 2026-07-02.) |
| 8 | `Breadcrumb.astro` | ✅ | Posts + Tags × 3 (6) | — | ✅ Batch 1 | Built (id `162:882`), `current` TEXT prop. Mockups re-wired to instances (Posts / Tags). |
| 9 | `Pagination.astro` | ✅ | Posts × 3 (3) | ✅ | ✅ Batch 1 | Built (COMPONENT_SET `165:188`), `State` variants (Default/FirstPage/LastPage) + `indicator` TEXT prop. Mockups re-wired. |
| 10 | `ShareLinks.astro` | ❌ | Post detail × 3 (3) | ✅ (icon buttons) | Batch 2 | "Share this post on:" + icon row. Structurally ≈ Socials with a label. |
| 11 | `BackButton.astro` | ❌ | Post detail × 3 (3) | ✅ | Batch 2 (optional) | Chevron + "Go back". Arguably just a LinkButton usage, not its own component. |
| 12 | `EditPost.astro` | ❌ | Post detail × 2 ("✎ Suggest Changes") | — | Low | Single icon+text link. Low reuse. |
| 13 | `BackToTopButton.astro` | ❌ | **Not in mockups** | — | Gap (design first) | Floating/sticky button with scroll-progress ring. Needs to be designed before componentizing. |
| 14 | `Video.astro` | ❌ | **Not in mockups** | — | Gap (design first) | Responsive 16:9 YouTube/Vimeo embed. Not represented in any mockup. |

## Non-code patterns (Figma-only candidates)

| Pattern | In mockups | Code component? | Note |
|---|---|---|---|
| Prev / Next post navigation | Post detail × 3 | ➖ (inline in `PostDetails.astro`) | Repeated pattern with no dedicated code component. Optional Figma-only component. |

## Summary

- **In parity (9):** Card, Datetime, LinkButton, Tag, **Footer, Socials, Breadcrumb, Pagination** (Batch 1 ✅), Header (partial — still needs a mobile variant).
- **Missing, in mockups (3):** ShareLinks, BackButton, EditPost.
- **Missing, not in mockups (2):** BackToTopButton, Video — require design work first.
- **New icon components (Batch 1):** `Icon/GitHub` (156:165), `Icon/Mail` (156:176) — used by Socials. (`Icon/BrandX` was created then removed when the X social was dropped on 2026-07-02.)
- **Composition note:** Footer nests Socials; the Figma `Socials`/`Pagination` are built as icon/text rows (not nesting `LinkButton`, which is a text-only atom) — a deliberate divergence from the code composition.
- **X social removed (2026-07-02):** dropped from `SOCIALS` in `src/constants.ts` and from the Figma `Socials`/Footer. The "share to X" button in `SHARE_LINKS` is a separate feature and was kept.

## Batches

- **Batch 1 ✅ (complete 2026-07-02):** Footer (+ Socials + 3 social icons), Breadcrumb, Pagination — built, described, and the Key Pages mockups re-wired to instances.
- **Batch 2:** Header mobile variant, ShareLinks, BackButton, EditPost.
- **Design-first backlog:** BackToTopButton, Video.
- **Separate follow-up:** Code Connect mappings (Figma component → `.astro` file).
