# Typography Token System (Figma) — Design

**Date:** 2026-07-02
**Status:** Approved (pending spec review)
**Scope:** Create a type primitive scale + semantic type Text Styles in Figma. Figma only — no code/sync changes.

## Goal

Establish a systematic typography foundation in the design system's Figma file, following current best practice: a **primitive variable scale** (raw, reusable values) plus a **semantic layer of Text Styles** that bind those primitives. Inter is the base workhorse font; Sora is used as a **display font only**.

## Context

- Target Figma file: `m8DPlUQk60FzGE02CnrhS2`.
- Existing collection `Blog Tokens` holds 5 **color** variables (Light/Dark modes). Typography is out of scope for that collection and stays untouched.
- No typography tokens exist yet. Type currently renders via Inter + Tailwind's `prose` plugin with no explicit scale.
- Sora was recently added to the codebase (`astro.config.ts` fonts, `--font-sora` / `font-display` utility) but is unused.
- Auth confirmed for write access (Pro / expert seat).

## Architecture (two layers)

1. **New Figma collection `Type Primitives`** — single mode (typography does not vary by light/dark). Holds raw variables in five families: `family`, `size`, `leading`, `weight`, `tracking`.
2. **15 semantic Text Styles** that **bind** the primitive variables. Designers apply one style; the underlying values stay token-driven.

Colors remain in `Blog Tokens` — a separate concern, not mixed into type.

## Primitive scales

Font-size ramp is a **Major Third (×1.25)** modular scale, base 16px, with numeric step names.

### `size` (NUMBER, px)

| Token | px |
| --- | --- |
| `size/50` | 13 |
| `size/100` | 16 |
| `size/200` | 20 |
| `size/300` | 25 |
| `size/400` | 31 |
| `size/500` | 39 |
| `size/600` | 49 |
| `size/700` | 61 |
| `size/800` | 76 |

### `leading` (NUMBER, %)

| Token | % |
| --- | --- |
| `leading/tight` | 110 |
| `leading/snug` | 125 |
| `leading/normal` | 150 |
| `leading/relaxed` | 165 |

### `weight` (NUMBER)

| Token | value |
| --- | --- |
| `weight/regular` | 400 |
| `weight/medium` | 500 |
| `weight/semibold` | 600 |
| `weight/bold` | 700 |
| `weight/extrabold` | 800 |

### `tracking` (NUMBER, %)

| Token | % |
| --- | --- |
| `tracking/tighter` | -3 |
| `tracking/tight` | -2 |
| `tracking/normal` | 0 |
| `tracking/wide` | 6 |

### `family` (STRING)

| Token | value |
| --- | --- |
| `family/base` | Inter |
| `family/display` | Sora |
| `family/mono` | JetBrains Mono |

## Semantic Text Styles

15 styles, each binding the primitives above. Sora appears **only** in the three Display styles.

| Style | Family | Size | Weight | Leading | Tracking | Case |
| --- | --- | --- | --- | --- | --- | --- |
| Display/Large | Sora | 76 (`size/800`) | 800 | 110 | -3 | — |
| Display/Default | Sora | 61 (`size/700`) | 700 | 110 | -2 | — |
| Display/Small | Sora | 49 (`size/600`) | 700 | 110 | -2 | — |
| Heading/H1 | Inter | 39 (`size/500`) | 700 | 125 | -2 | — |
| Heading/H2 | Inter | 31 (`size/400`) | 600 | 125 | -2 | — |
| Heading/H3 | Inter | 25 (`size/300`) | 600 | 125 | 0 | — |
| Heading/H4 | Inter | 20 (`size/200`) | 600 | 125 | 0 | — |
| Heading/H5 | Inter | 16 (`size/100`) | 600 | 150 | 0 | — |
| Body/Large | Inter | 20 (`size/200`) | 400 | 165 | 0 | — |
| Body/Default | Inter | 16 (`size/100`) | 400 | 150 | 0 | — |
| Body/Small | Inter | 13 (`size/50`) | 400 | 150 | 0 | — |
| Caption | Inter | 13 (`size/50`) | 400 | 125 | 0 | — |
| Label/Eyebrow | Inter | 13 (`size/50`) | 600 | 125 | 6 | UPPERCASE |
| Quote | Inter | 20 (`size/200`) | 400 (italic) | 165 | 0 | — |
| Code/Inline | JetBrains Mono | 13 (`size/50`) | 400 | 150 | 0 | — |

## Font availability notes

- **Inter** and **Sora** are already used by the codebase (Google Fonts). Inter weights configured: 300–700; Sora: 400–800. All weights referenced above are covered.
- **JetBrains Mono** is a new mono face for `Code/Inline`. It must be available in Figma for the Text Style to render. In eventual code it maps to a `ui-monospace, …` fallback stack (out of scope here).
- Sora has no italic; only the `Quote` style uses italic, and it is an **Inter** style, so no synthetic italic is required for Sora.

## Figma unit handling (implementation notes)

- Line height bound as a **percentage** value (110/125/150/165 → `%`).
- Letter spacing bound as a **percentage** value (e.g. -2 → `-2%`, equivalent to -0.02em).
- Font weight bound via a NUMBER variable; the Text Style's font style (Regular/Medium/SemiBold/Bold/ExtraBold) must resolve to the corresponding named weight of the family.
- `Label/Eyebrow` sets text-case = UPPERCASE on the style.
- `Quote` uses the italic variant of Inter.

## Out of scope (explicit)

- Wiring these tokens into `src/styles/global.css` or the `/figma-sync` pipeline. The current sync emits **colors only** and does not yet handle NUMBER/STRING typography variables. Extending it (and generating CSS type utilities / applying styles to blog components) is a **separate follow-up spec**.
- Changing the existing `Blog Tokens` color collection.
- Applying the new Text Styles to existing Figma frames/components.

## Success criteria

- A `Type Primitives` collection exists with all `family`, `size`, `leading`, `weight`, `tracking` variables listed above.
- 15 Text Styles exist with the exact family/size/weight/leading/tracking/case values in the table, each binding the corresponding primitive variables where Figma supports binding.
- Sora is used only by the three Display styles; every other style uses Inter (or JetBrains Mono for Code/Inline).

## Revisions (2026-07-02, post-build)

After the initial 15-style system was built and verified, two changes were made during the component-mapping pass:

1. **Added a 16th style `UI/Label`** (Inter Medium 16, 150% LH) for UI-control labels (nav links, buttons) that need medium weight — a gap the original set didn't cover.
2. **Headings now use Sora.** `Heading/H1–H5` were redefined from Inter to Sora (same sizes/weights; `fontFamily` rebound to `family/display`). This **supersedes the original "Sora = display only" rule**: Sora is now the display **and** heading face; Inter remains the body/UI/caption/label/quote face; JetBrains Mono for code. This choice was made deliberately by the user.

**Binding note (Figma limitation discovered during build):** `fontSize`, `fontFamily`, and `fontWeight` are variable-bound to the primitives; `lineHeight` and `letterSpacing` are kept as literal PERCENT values because binding them coerces the unit to PIXELS on this Figma version. The `leading/*` and `tracking/*` primitives remain the documented source of truth.

**Mapping:** all 61 text nodes across the Component Library (5 components + doc chrome + Light/Dark showcase instances) were mapped to these styles.
