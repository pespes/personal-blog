# Typography Token System (Figma) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution mechanism:** All writes go through the Figma `use_figma` tool. **Before the first `use_figma` call you MUST invoke the `/figma-use` skill (MANDATORY per the Figma MCP).** "Verification" in this plan means reading the Figma state back (via `mcp__figma__get_variable_defs` and/or a `use_figma` read snippet) and confirming names/values — there is no pytest and no git commit of Figma state (the tokens live in Figma, not the repo).

**Goal:** Create a primitive typography variable scale and a semantic layer of 15 Text Styles in the design-system Figma file, with Inter as the base font and Sora as a display-only font.

**Architecture:** A new single-mode Figma variable collection `Type Primitives` holds raw values in five families (`family`, `size`, `leading`, `weight`, `tracking`). 15 semantic Text Styles bind those primitives. The existing `Blog Tokens` color collection is untouched.

**Tech Stack:** Figma variables + Text Styles, created via the Figma MCP `use_figma` (Plugin API) tool, orchestrated by the `/figma-use` skill.

## Global Constraints

- Target Figma file key: `m8DPlUQk60FzGE02CnrhS2`.
- **Sora is display-only** — it may appear ONLY in the three `Display/*` Text Styles. Every other style uses Inter (or JetBrains Mono for `Code/Inline`).
- Do NOT modify the existing `Blog Tokens` collection or any existing color variable.
- Font-size scale is Major Third (×1.25), base 16px, exact px values as listed — do not recompute or re-round.
- Line height and letter spacing are expressed as **percentage** values in Figma (e.g. leading 150 → `150%`, tracking -2 → `-2%`).
- Scope: Figma only. Do NOT touch `src/styles/global.css`, `astro.config.ts`, or the `/figma-sync` pipeline.
- `/figma-use` skill MUST be invoked before the first `use_figma` write.

---

### Task 0: Preflight — write access and font availability

**Files:** none (Figma-side checks only).

**Interfaces:**
- Produces: confirmation that `use_figma` can write to file `m8DPlUQk60FzGE02CnrhS2`, and that fonts `Inter`, `Sora`, `JetBrains Mono` are available/loadable in Figma. Later tasks assume all three fonts load successfully.

- [ ] **Step 1: Invoke the `/figma-use` skill.** This is mandatory before any `use_figma` call. Follow its guidance for connecting to the desktop app / file.

- [ ] **Step 2: Confirm the target file is open and writable.** Run `mcp__figma__get_metadata` with `fileKey: "m8DPlUQk60FzGE02CnrhS2"` (no `nodeId`).
  Expected: returns the list of top-level pages (no auth/permission error). If it errors on permissions, STOP — write access must be resolved first (see memory note "Figma MCP write setup").

- [ ] **Step 3: Verify the three fonts are available.** Via `use_figma`, list available fonts and confirm `Inter`, `Sora`, and `JetBrains Mono` are present, then load the specific styles used by this plan:
  - Inter: Regular (400), Medium (500), Semi Bold (600) — note: the Figma style name is `"Semi Bold"` with a space — Bold (700), Italic
  - Sora: Bold (700), ExtraBold (800)
  - JetBrains Mono: Regular (400)

  Plugin API pattern the `use_figma` call should run:
  ```js
  const fonts = [
    { family: "Inter", style: "Regular" },
    { family: "Inter", style: "Medium" },
    { family: "Inter", style: "SemiBold" },
    { family: "Inter", style: "Bold" },
    { family: "Inter", style: "Italic" },
    { family: "Sora", style: "Bold" },
    { family: "Sora", style: "ExtraBold" },
    { family: "JetBrains Mono", style: "Regular" },
  ];
  await Promise.all(fonts.map(f => figma.loadFontAsync(f)));
  ```
  Expected: all `loadFontAsync` calls resolve. If `JetBrains Mono` (or any style, e.g. Sora ExtraBold) is missing, STOP and report which font is unavailable — the user must enable it in Figma before continuing.

- [ ] **Step 4: Record outcome.** Note in the working log that preflight passed (file writable + all fonts loadable). No Figma objects are created in this task.

---

### Task 1: Create `Type Primitives` collection and all primitive variables

**Files:** none (creates Figma variables in file `m8DPlUQk60FzGE02CnrhS2`).

**Interfaces:**
- Consumes: preflight from Task 0.
- Produces: a variable collection named `Type Primitives` with a single mode, containing exactly these variables (grouped by `/`-delimited name). Later tasks bind Text Style fields to these by name:
  - STRING: `family/base`, `family/display`, `family/mono`
  - FLOAT: `size/50`,`size/100`,`size/200`,`size/300`,`size/400`,`size/500`,`size/600`,`size/700`,`size/800`
  - FLOAT: `leading/tight`,`leading/snug`,`leading/normal`,`leading/relaxed`
  - FLOAT: `weight/regular`,`weight/medium`,`weight/semibold`,`weight/bold`,`weight/extrabold`
  - FLOAT: `tracking/tighter`,`tracking/tight`,`tracking/normal`,`tracking/wide`

- [ ] **Step 1: Create the collection.** Via `use_figma`, create a variable collection named exactly `Type Primitives`. It gets one default mode (rename to `Value` or leave default — single mode only; do NOT add Light/Dark).

- [ ] **Step 2: Create the `family` STRING variables** with `scopes: ["FONT_FAMILY"]`:

  | Variable name | Value |
  | --- | --- |
  | `family/base` | `Inter` |
  | `family/display` | `Sora` |
  | `family/mono` | `JetBrains Mono` |

- [ ] **Step 3: Create the `size` FLOAT variables** with `scopes: ["FONT_SIZE"]`:

  | Variable name | Value | | Variable name | Value |
  | --- | --- | --- | --- | --- |
  | `size/50` | 13 | | `size/500` | 39 |
  | `size/100` | 16 | | `size/600` | 49 |
  | `size/200` | 20 | | `size/700` | 61 |
  | `size/300` | 25 | | `size/800` | 76 |
  | `size/400` | 31 | | | |

- [ ] **Step 4: Create the `leading` FLOAT variables** with `scopes: ["LINE_HEIGHT"]` (values are percent):

  | Variable name | Value |
  | --- | --- |
  | `leading/tight` | 110 |
  | `leading/snug` | 125 |
  | `leading/normal` | 150 |
  | `leading/relaxed` | 165 |

- [ ] **Step 5: Create the `weight` FLOAT variables** with `scopes: ["FONT_WEIGHT"]`:

  | Variable name | Value |
  | --- | --- |
  | `weight/regular` | 400 |
  | `weight/medium` | 500 |
  | `weight/semibold` | 600 |
  | `weight/bold` | 700 |
  | `weight/extrabold` | 800 |

- [ ] **Step 6: Create the `tracking` FLOAT variables** with `scopes: ["LETTER_SPACING"]` (values are percent):

  | Variable name | Value |
  | --- | --- |
  | `tracking/tighter` | -3 |
  | `tracking/tight` | -2 |
  | `tracking/normal` | 0 |
  | `tracking/wide` | 6 |

- [ ] **Step 7: Verify.** Run `mcp__figma__get_variable_defs` with `fileKey: "m8DPlUQk60FzGE02CnrhS2"` (scoped to the `Type Primitives` collection).
  Expected: exactly 25 variables with the names and values above (3 family + 9 size + 4 leading + 5 weight + 4 tracking). Confirm no variable was added to `Blog Tokens`. If any name/value is wrong, fix that single variable and re-verify.

---

### Task 2: Create the three `Display` Text Styles (Sora)

**Files:** none (creates Figma Text Styles).

**Interfaces:**
- Consumes: `Type Primitives` variables from Task 1; fonts loaded in Task 0.
- Produces: Text Styles `Display/Large`, `Display/Default`, `Display/Small`.

For each style: create a `TextStyle`, set literal values, then bind each field to the matching primitive variable via `setBoundVariable`. Bind `fontSize`→`size/*`, `lineHeight`→`leading/*`, `letterSpacing`→`tracking/*`, and (where the environment supports text-style variable binding) `fontFamily`→`family/display` and font weight→`weight/*`. If a given field cannot be bound in this environment, leave the literal value set (the literal equals the primitive value, so the visual result is identical) and note it.

- [ ] **Step 1: Create `Display/Large`.**
  - fontName: `{ family: "Sora", style: "ExtraBold" }` · fontSize: 76 · lineHeight: `{ value: 110, unit: "PERCENT" }` · letterSpacing: `{ value: -3, unit: "PERCENT" }` · textCase: ORIGINAL
  - Bind: fontSize→`size/800`, lineHeight→`leading/tight`, letterSpacing→`tracking/tighter`, fontFamily→`family/display`, weight→`weight/extrabold`.

- [ ] **Step 2: Create `Display/Default`.**
  - fontName: `{ family: "Sora", style: "Bold" }` · fontSize: 61 · lineHeight: `{ value: 110, unit: "PERCENT" }` · letterSpacing: `{ value: -2, unit: "PERCENT" }`
  - Bind: fontSize→`size/700`, lineHeight→`leading/tight`, letterSpacing→`tracking/tight`, fontFamily→`family/display`, weight→`weight/bold`.

- [ ] **Step 3: Create `Display/Small`.**
  - fontName: `{ family: "Sora", style: "Bold" }` · fontSize: 49 · lineHeight: `{ value: 110, unit: "PERCENT" }` · letterSpacing: `{ value: -2, unit: "PERCENT" }`
  - Bind: fontSize→`size/600`, lineHeight→`leading/tight`, letterSpacing→`tracking/tight`, fontFamily→`family/display`, weight→`weight/bold`.

- [ ] **Step 4: Verify.** Read the local text styles back via `use_figma`. Expected: three styles under the `Display/` group with the exact fontName, fontSize, lineHeight, and letterSpacing above, and bound variables present where supported. Confirm all three use `Sora`.

---

### Task 3: Create the five `Heading` Text Styles (Inter)

**Files:** none (creates Figma Text Styles).

**Interfaces:**
- Consumes: `Type Primitives` variables (Task 1); fonts loaded (Task 0).
- Produces: Text Styles `Heading/H1`…`Heading/H5`. Binding approach identical to Task 2, but `fontFamily`→`family/base`.

- [ ] **Step 1: Create `Heading/H1`.**
  - fontName: `{ family: "Inter", style: "Bold" }` · fontSize: 39 · lineHeight: `{ value: 125, unit: "PERCENT" }` · letterSpacing: `{ value: -2, unit: "PERCENT" }`
  - Bind: fontSize→`size/500`, lineHeight→`leading/snug`, letterSpacing→`tracking/tight`, fontFamily→`family/base`, weight→`weight/bold`.

- [ ] **Step 2: Create `Heading/H2`.**
  - fontName: `{ family: "Inter", style: "Semi Bold" }` · fontSize: 31 · lineHeight: `{ value: 125, unit: "PERCENT" }` · letterSpacing: `{ value: -2, unit: "PERCENT" }`
  - Bind: fontSize→`size/400`, lineHeight→`leading/snug`, letterSpacing→`tracking/tight`, fontFamily→`family/base`, weight→`weight/semibold`.

- [ ] **Step 3: Create `Heading/H3`.**
  - fontName: `{ family: "Inter", style: "Semi Bold" }` · fontSize: 25 · lineHeight: `{ value: 125, unit: "PERCENT" }` · letterSpacing: `{ value: 0, unit: "PERCENT" }`
  - Bind: fontSize→`size/300`, lineHeight→`leading/snug`, letterSpacing→`tracking/normal`, fontFamily→`family/base`, weight→`weight/semibold`.

- [ ] **Step 4: Create `Heading/H4`.**
  - fontName: `{ family: "Inter", style: "Semi Bold" }` · fontSize: 20 · lineHeight: `{ value: 125, unit: "PERCENT" }` · letterSpacing: `{ value: 0, unit: "PERCENT" }`
  - Bind: fontSize→`size/200`, lineHeight→`leading/snug`, letterSpacing→`tracking/normal`, fontFamily→`family/base`, weight→`weight/semibold`.

- [ ] **Step 5: Create `Heading/H5`.**
  - fontName: `{ family: "Inter", style: "Semi Bold" }` · fontSize: 16 · lineHeight: `{ value: 150, unit: "PERCENT" }` · letterSpacing: `{ value: 0, unit: "PERCENT" }`
  - Bind: fontSize→`size/100`, lineHeight→`leading/normal`, letterSpacing→`tracking/normal`, fontFamily→`family/base`, weight→`weight/semibold`.

- [ ] **Step 6: Verify.** Read local text styles back. Expected: five `Heading/*` styles with exact values above; all use `Inter`; bound variables present where supported.

---

### Task 4: Create the seven Body and support Text Styles (Inter + JetBrains Mono)

**Files:** none (creates Figma Text Styles).

**Interfaces:**
- Consumes: `Type Primitives` variables (Task 1); fonts loaded (Task 0).
- Produces: Text Styles `Body/Large`, `Body/Default`, `Body/Small`, `Caption`, `Label/Eyebrow`, `Quote`, `Code/Inline`. This completes the 15-style set (3 + 5 + 7).

- [ ] **Step 1: Create `Body/Large`.**
  - fontName: `{ family: "Inter", style: "Regular" }` · fontSize: 20 · lineHeight: `{ value: 165, unit: "PERCENT" }` · letterSpacing: `{ value: 0, unit: "PERCENT" }`
  - Bind: fontSize→`size/200`, lineHeight→`leading/relaxed`, letterSpacing→`tracking/normal`, fontFamily→`family/base`, weight→`weight/regular`.

- [ ] **Step 2: Create `Body/Default`.**
  - fontName: `{ family: "Inter", style: "Regular" }` · fontSize: 16 · lineHeight: `{ value: 150, unit: "PERCENT" }` · letterSpacing: `{ value: 0, unit: "PERCENT" }`
  - Bind: fontSize→`size/100`, lineHeight→`leading/normal`, letterSpacing→`tracking/normal`, fontFamily→`family/base`, weight→`weight/regular`.

- [ ] **Step 3: Create `Body/Small`.**
  - fontName: `{ family: "Inter", style: "Regular" }` · fontSize: 13 · lineHeight: `{ value: 150, unit: "PERCENT" }` · letterSpacing: `{ value: 0, unit: "PERCENT" }`
  - Bind: fontSize→`size/50`, lineHeight→`leading/normal`, letterSpacing→`tracking/normal`, fontFamily→`family/base`, weight→`weight/regular`.

- [ ] **Step 4: Create `Caption`.**
  - fontName: `{ family: "Inter", style: "Regular" }` · fontSize: 13 · lineHeight: `{ value: 125, unit: "PERCENT" }` · letterSpacing: `{ value: 0, unit: "PERCENT" }`
  - Bind: fontSize→`size/50`, lineHeight→`leading/snug`, letterSpacing→`tracking/normal`, fontFamily→`family/base`, weight→`weight/regular`.

- [ ] **Step 5: Create `Label/Eyebrow`.**
  - fontName: `{ family: "Inter", style: "Semi Bold" }` · fontSize: 13 · lineHeight: `{ value: 125, unit: "PERCENT" }` · letterSpacing: `{ value: 6, unit: "PERCENT" }` · **textCase: UPPER**
  - Bind: fontSize→`size/50`, lineHeight→`leading/snug`, letterSpacing→`tracking/wide`, fontFamily→`family/base`, weight→`weight/semibold`.

- [ ] **Step 6: Create `Quote`.**
  - fontName: `{ family: "Inter", style: "Italic" }` · fontSize: 20 · lineHeight: `{ value: 165, unit: "PERCENT" }` · letterSpacing: `{ value: 0, unit: "PERCENT" }`
  - Bind: fontSize→`size/200`, lineHeight→`leading/relaxed`, letterSpacing→`tracking/normal`, fontFamily→`family/base`, weight→`weight/regular`.
  - Note: italic is the font style, not a bound variable.

- [ ] **Step 7: Create `Code/Inline`.**
  - fontName: `{ family: "JetBrains Mono", style: "Regular" }` · fontSize: 13 · lineHeight: `{ value: 150, unit: "PERCENT" }` · letterSpacing: `{ value: 0, unit: "PERCENT" }`
  - Bind: fontSize→`size/50`, lineHeight→`leading/normal`, letterSpacing→`tracking/normal`, fontFamily→`family/mono`, weight→`weight/regular`.

- [ ] **Step 8: Verify all 15 styles.** Read all local text styles back via `use_figma`. Expected: 15 total (3 Display + 5 Heading + 3 Body + Caption + Label/Eyebrow + Quote + Code/Inline). Confirm:
  - Sora is used ONLY by the three `Display/*` styles.
  - `Label/Eyebrow` has textCase UPPER; `Quote` is italic; `Code/Inline` uses JetBrains Mono.
  - Every size/leading/tracking/family/weight matches the tables above.

---

### Task 5: Final review and screenshot

**Files:** none.

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: a visual confirmation artifact for the user.

- [ ] **Step 1: Optionally lay out a type specimen.** If desired, create a frame that places one text node per Text Style (label + sample) so the scale is visible at a glance. (Skip if the user only wants the tokens/styles.)

- [ ] **Step 2: Capture a screenshot.** Use `mcp__figma__get_screenshot` on the specimen frame (or the styles panel) so the user can review the result.

- [ ] **Step 3: Summarize to the user.** Report: 25 primitives created in `Type Primitives`, 15 Text Styles created, Sora confined to Display, `Blog Tokens` untouched. Flag any field that could not be variable-bound in this environment (literal value set instead).

---

## Notes for the executor

- **Variable binding fallback:** Figma's support for binding `fontFamily`/`fontWeight` inside Text Styles has varied by version. Always set the literal `fontName`/`fontSize`/`lineHeight`/`letterSpacing` first so the style is correct even if a bind is unavailable; then attempt the `setBoundVariable` calls. Record any field that would not bind — it is a known-acceptable degradation, not a failure (the literal equals the primitive).
- **Idempotency:** If a variable or style with the target name already exists (e.g. from a partial prior run), update it in place rather than creating a duplicate.
- **Do not** run `pnpm figma:sync` as part of this plan — code/CSS integration is a separate, later effort.
