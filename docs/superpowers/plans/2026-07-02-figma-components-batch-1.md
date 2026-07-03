# Figma Components — Batch 1 (Footer, Socials, Breadcrumb, Pagination) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution mechanism:** All Figma writes go through the `use_figma` tool. **Invoke the `/figma-use` skill before the first `use_figma` call** (if the Skill tool can't find it, read MCP resource `skill://figma/figma-use/SKILL.md`). Figma MCP tools are DEFERRED — load each with ToolSearch (e.g. `select:mcp__figma__use_figma`, `select:mcp__figma__get_screenshot`) before calling. "Verify" means reading component/style state back and capturing a screenshot; there is no pytest and Figma state is not committed to git (only the Task 7 doc edit is).

**Goal:** Bring three code components (Footer, Breadcrumb, Pagination) — plus Socials, which Footer nests — to parity in Figma, then re-wire the Key Pages mockups to use instances of them.

**Architecture:** Build small Figma components composed from existing atoms and the design-system text styles + color variables. Socials is an icon row; Footer nests Socials + a copyright line; Breadcrumb and Pagination are self-contained. Pagination encodes prev/next disabled states as variants. Finally, replace the ad-hoc footer/breadcrumb/pagination frames in the mockups (`4:162`) with instances.

**Tech Stack:** Figma components, variants, and component properties created via the Figma MCP `use_figma` (Plugin API) tool, orchestrated by `/figma-use`.

## Global Constraints

- Target Figma file key: `m8DPlUQk60FzGE02CnrhS2`. Component page: `0:1` "Personal blog components" (build new components there, near the existing ones). Mockups to re-wire: canvas `4:162` frame `21:162` "Key Pages".
- **Reuse existing Text Styles — create none:** `Caption` (Inter 13), `Body/Small` (Inter 13), `Body/Default` (Inter 16), `UI/Label` (Inter Medium 16). Apply via `node.setTextStyleIdAsync`.
- **Reuse existing color variables** from the `Blog Tokens` collection (`VariableCollectionId:5:2`): `foreground` (VariableID:5:4), `muted` (VariableID:5:6), `border` (VariableID:5:7), `accent` (VariableID:5:5). Bind text/stroke fills to these so Light/Dark works automatically. Do NOT hardcode hex.
- **Follow existing component conventions:** slash-grouped names (`Icon/…`), variant property naming like the existing set (`State=…`, `Size=…`). Existing atoms: `Card` (16:27), `Header` (17:26), `Tag` set (13:16), `Datetime` set (14:24), `LinkButton` set (15:26).
- **Icons are Lucide**, 24×24, matching the existing `Icon/*` components (e.g. `Icon/Menu` 11:6-tree). Source glyph SVGs from Lucide (lucide.dev / `lucide-static`) and create via `figma.createNodeFromSvg`.
- Do NOT modify `Blog Tokens` color values, the `Type Primitives` collection, or the 16 text styles.
- `await figma.loadFontAsync(...)` before creating/editing any text (fonts in use: Inter Regular/Medium, Sora is not needed here).
- Re-wiring must preserve each frame's position/size and carry over text overrides (copyright year, breadcrumb current label, pagination indicator).

---

### Task 1: Add Lucide social icons (`Icon/GitHub`, `Icon/BrandX`, `Icon/Mail`)

**Files:** none (creates 3 Figma COMPONENT nodes on page `0:1`).

**Interfaces:**
- Produces: three icon components named `Icon/GitHub`, `Icon/BrandX`, `Icon/Mail` (24×24), matching the existing `Icon/*` pattern. Task 2 swaps these into the Socials row.

- [ ] **Step 1: Get the three Lucide SVGs.** Use the Lucide glyphs `github`, `twitter` (Lucide's X/Twitter mark), and `mail` (24×24, stroke-width 2, `currentColor`). Obtain the raw SVG markup for each (from lucide.dev or the `lucide-static` package). These are the three socials shown in the footer mockups (GitHub / X / Email).

- [ ] **Step 2: Create each icon component.** Via `use_figma`, for each glyph: `const n = figma.createNodeFromSvg(svgString)`, resize/frame to 24×24, then `const c = figma.createComponent()` (or `figma.createComponentFromNode(n)`), set `c.name` to `Icon/GitHub` / `Icon/BrandX` / `Icon/Mail`. Set the vector stroke/fill to bind to the `foreground` color variable (VariableID:5:4) so the icon inherits theme color like the existing icons. Place them tidily next to the existing `Icons` frame (`11:5`) on page `0:1`.

- [ ] **Step 3: Verify.** Read local components; confirm the three `Icon/*` components exist at 24×24 with names exactly `Icon/GitHub`, `Icon/BrandX`, `Icon/Mail`, and their color is variable-bound (not hardcoded). Capture a screenshot of the three icons. Confirm existing `Icon/*` components are unchanged.

---

### Task 2: Build the `Socials` component

**Files:** none (creates a Figma COMPONENT on page `0:1`).

**Interfaces:**
- Consumes: `Icon/GitHub`, `Icon/BrandX`, `Icon/Mail` (Task 1).
- Produces: COMPONENT `Socials` — a horizontal icon row. Task 3 (Footer) nests one instance of it.

Anatomy (matches `Socials.astro` = a flex row of icon links):
- Horizontal AUTO_LAYOUT frame, `itemSpacing: 8`, `counterAxisAlignItems: CENTER`, padding 0, `primaryAxisSizingMode: AUTO`, hug contents.
- Three children: one INSTANCE each of `Icon/GitHub`, `Icon/BrandX`, `Icon/Mail`, in that order (matches the footer mockup GitHub / X / Email).

- [ ] **Step 1: Create the frame + place icons.** Via `use_figma`: create an auto-layout frame as above, append instances of the three icon components (`component.createInstance()`), then `figma.createComponentFromNode(frame)` and name it `Socials`. Place it on page `0:1` below the existing components.

- [ ] **Step 2: Verify.** Read the `Socials` component back: confirm it is a COMPONENT named `Socials`, horizontal auto-layout, containing 3 icon instances (GitHub, BrandX, Mail) whose colors resolve via the `foreground` variable. Screenshot it in Light and on a dark background (place a temp dark rectangle behind a second instance) to confirm the icons invert with the theme. Remove the temp rectangle after.

---

### Task 3: Build the `Footer` component

**Files:** none (creates a Figma COMPONENT on page `0:1`).

**Interfaces:**
- Consumes: `Socials` (Task 2), text style `Caption`, color variables `border`/`foreground`.
- Produces: COMPONENT `Footer` with a TEXT component property `copyright` (default `Copyright © 2026 | All rights reserved.`). Task 6 places instances in the mockups.

Anatomy (matches `Footer.astro`: a top-bordered block with Socials + a copyright line, centered on mobile):
- Root: vertical AUTO_LAYOUT frame, `layoutSizingHorizontal: FILL` (so instances stretch to their container width — mockup footers are 736 desktop / 358 mobile), `primaryAxisSizingMode: AUTO` (hug height), `counterAxisAlignItems: CENTER`, `itemSpacing: 8`, padding top 24 / bottom 24.
- Top border: set the frame's top stroke — `strokeTopWeight: 1`, stroke bound to the `border` color variable (VariableID:5:7). (Use `strokeAlign` INSIDE; only the top edge — set `strokeTopWeight:1` and other edge weights 0.)
- Child 1: one INSTANCE of `Socials`.
- Child 2: a TEXT node with characters `Copyright © 2026 | All rights reserved.`; apply the `Caption` text style; fill bound to `foreground` variable. This node is exposed as component property `year` — actually expose the copyright TEXT node's content via a TEXT property named `year` bound to the `2026` substring is not possible per-substring; instead expose the WHOLE line as a TEXT property named `copyright` (default `Copyright © 2026 | All rights reserved.`).

- [ ] **Step 1: Create the frame + children.** Build the root auto-layout frame as above, append a `Socials` instance and the copyright TEXT node (load Inter first, set characters, apply `Caption` style, bind fill to `foreground`). Set the top-only border stroke bound to `border`.

- [ ] **Step 2: Componentize + add property.** `figma.createComponentFromNode(frame)`, name `Footer`. Add a TEXT component property: `const p = footer.addComponentProperty("copyright", "TEXT", "Copyright © 2026 | All rights reserved.")` and bind the copyright text node's `componentPropertyReferences.characters` to `p`.

- [ ] **Step 3: Verify.** Read `Footer` back: COMPONENT named `Footer`, FILL horizontal sizing, top border bound to `border`, contains a `Socials` instance and a `Caption`-styled copyright line bound to a `copyright` TEXT property. Place one instance at 736 wide and one at 358 wide; screenshot both (Light + dark bg) to confirm it stretches and the border/text theme correctly. Remove temp instances.

---

### Task 4: Build the `Breadcrumb` component

**Files:** none (creates a Figma COMPONENT on page `0:1`).

**Interfaces:**
- Consumes: text style `Body/Small`, color variables `foreground`/`muted`.
- Produces: COMPONENT `Breadcrumb` with a TEXT property `current` (default `Posts`). Task 6 places instances (overriding `current` to `Posts` / `Tags`).

Anatomy (matches `Breadcrumb.astro` — mockups show 2 levels: `Home » Current`):
- Horizontal AUTO_LAYOUT, `itemSpacing: 6`, `counterAxisAlignItems: CENTER`, hug contents.
- Child 1: TEXT `Home` — `Body/Small` style, fill `foreground`, opacity 0.7 (matches code `opacity-70`).
- Child 2: TEXT `»` — `Body/Small` style, fill `foreground`, opacity 0.8.
- Child 3: TEXT `Posts` — `Body/Small` style, fill `foreground`, opacity 0.75 (current page, `aria-current` in code). Exposed as TEXT property `current`.

- [ ] **Step 1: Create the frame + three text nodes** as above (load Inter, apply `Body/Small` to each, bind fills to `foreground`, set the three opacities).

- [ ] **Step 2: Componentize + add property.** `createComponentFromNode`, name `Breadcrumb`. Add TEXT property `current` (default `Posts`) and bind the third text node's characters to it.

- [ ] **Step 3: Verify.** Read back: COMPONENT `Breadcrumb`, horizontal auto-layout, 3 `Body/Small` text nodes (`Home`, `»`, current), `current` TEXT property present. Screenshot. Confirm swapping the instance's `current` to `Tags` renders correctly (test on a temp instance, then delete it).

---

### Task 5: Build the `Pagination` component (with state variants)

**Files:** none (creates a Figma COMPONENT_SET on page `0:1`).

**Interfaces:**
- Consumes: text styles `UI/Label` (prev/next) and `Body/Default` (indicator), color variables `foreground`/`muted`.
- Produces: COMPONENT_SET `Pagination` with property `State` ∈ {`Default`, `FirstPage`, `LastPage`} and a TEXT property `indicator` (default `Page 1 of 2`). Task 6 places instances.

Anatomy (matches `Pagination.astro` — mockup: `‹ Prev   Page 1 of 2   Next ›`; the `‹`/`›` are text glyphs, NOT icons):
- Horizontal AUTO_LAYOUT, `layoutSizingHorizontal: FILL`, `primaryAxisAlignItems: SPACE_BETWEEN`, `counterAxisAlignItems: CENTER`, padding 0.
- Child 1: TEXT `‹ Prev` — `UI/Label` style, fill `foreground`.
- Child 2: TEXT `Page 1 of 2` — `Body/Default` style, fill `foreground`. Exposed as TEXT property `indicator`.
- Child 3: TEXT `Next ›` — `UI/Label` style, fill `foreground`.
- **State variants** (a disabled control is dimmed to 50% opacity, matching code `opacity-50`):
  - `State=Default`: both `‹ Prev` and `Next ›` at opacity 1.
  - `State=FirstPage`: `‹ Prev` opacity 0.5 (disabled), `Next ›` opacity 1.
  - `State=LastPage`: `‹ Prev` opacity 1, `Next ›` opacity 0.5 (disabled).

- [ ] **Step 1: Build the `Default` variant frame** as above (load Inter, apply the two text styles, bind fills to `foreground`).

- [ ] **Step 2: Create the three variants + combine.** Duplicate the frame for `FirstPage` and `LastPage`, apply the opacity differences per the table. Componentize each, then `figma.combineAsVariants([...], parent)` into a COMPONENT_SET named `Pagination` with the `State` property values `Default` / `FirstPage` / `LastPage`.

- [ ] **Step 3: Add the `indicator` TEXT property** on the component set (default `Page 1 of 2`) and bind each variant's middle text node characters to it.

- [ ] **Step 4: Verify.** Read back: COMPONENT_SET `Pagination`, 3 variants on `State`, each with `‹ Prev` (`UI/Label`), indicator (`Body/Default`, bound to `indicator` prop), `Next ›` (`UI/Label`); FirstPage dims Prev, LastPage dims Next. Screenshot all three variants (arrange them in a labeled row).

---

### Task 6: Re-wire the Key Pages mockups to component instances

**Files:** none (edits mockup frames under `21:162`; replaces ad-hoc frames with instances).

**Interfaces:**
- Consumes: `Footer` (Task 3), `Breadcrumb` (Task 4), `Pagination` (Task 5).
- Produces: mockups whose footers/breadcrumbs/paginations are instances, not raw frames.

Replace targets (from the mockup inventory). For EACH, record the ad-hoc frame's `x/y/width/height` and parent, create an instance of the corresponding component, set its width to match, position it at the same x/y in the same parent, then remove the old ad-hoc frame. Carry over text via instance property overrides.

- **Footers → `Footer` instances (12):** frames `21:262`, `22:187`, `22:261`, `23:252`, `24:182`, `24:247`, `25:273`, `26:200`, `26:293`, `27:268`, `27:295`, `27:386`. Override `copyright` = `Copyright © 2026 | All rights reserved.` (default already correct). Set instance width to the frame's width (736 desktop/tablet, 358 mobile).
- **Breadcrumbs → `Breadcrumb` instances (6):** frames `23:190`, `24:165`, `24:196` (Posts D/T/M) → `current` = `Posts`; frames `27:190`, `27:277`, `27:309` (Tags D/T/M) → `current` = `Tags`.
- **Paginations → `Pagination` instances (3):** frames `23:248`, `24:178` (desktop/tablet) → `State=Default`, `indicator` = `Page 1 of 2`; frame `24:243` (mobile) → `State=Default`, `indicator` = `1 / 2`.

- [ ] **Step 1: Re-wire the 12 footers.** For each footer frame id above: read its x/y/width/height + parent; create a `Footer` instance; set width to match (`layoutSizingHorizontal` FILL or explicit resize); position at the same x/y under the same parent; delete the original frame. (The footer socials in the old frames were text placeholders; the new instance uses the icon `Socials` — this intentional change is expected.)

- [ ] **Step 2: Re-wire the 6 breadcrumbs.** Same procedure; set each instance's `current` override to `Posts` or `Tags` per the list.

- [ ] **Step 3: Re-wire the 3 paginations.** Same procedure; set `State`/`indicator` overrides per the list.

- [ ] **Step 4: Verify.** Confirm zero remaining ad-hoc `footer`/`breadcrumb`/`pagination` frames under `21:162` (all are now INSTANCE nodes of the new components). Capture a screenshot of the whole `21:162` frame and confirm the four pages still render correctly with the icon footer, and nothing shifted position. Report any layout drift.

---

### Task 7: Update the parity index

**Files:**
- Modify: `docs/component-parity.md`

**Interfaces:**
- Consumes: outcome of Tasks 1–6.
- Produces: an accurate parity index.

- [ ] **Step 1: Update the index.** In `docs/component-parity.md`, change `Footer`, `Socials`, `Breadcrumb`, and `Pagination` rows from ❌ to ✅, move them out of the "Missing, in mockups" summary into "In parity", and note the new `Icon/GitHub`, `Icon/BrandX`, `Icon/Mail` icons. Update the "Batches" section to mark Batch 1 complete and update `_Last updated_`.

- [ ] **Step 2: Verify.** Re-read the file; confirm the four components show ✅, the summary counts are consistent, and no stale ❌ remains for them. (Commit only if/when the user approves committing repo docs.)

---

## Notes for the executor

- **LinkButton nesting:** the code composes Socials/Pagination from `LinkButton`, but the Figma `LinkButton` component is a text-labelled button. For faithful Figma design, Socials is an icon row and Pagination uses text glyph labels — neither nests `LinkButton`. This is a deliberate, acceptable divergence (record it; do not rebuild `LinkButton`).
- **Idempotency:** if a component/icon with a target name already exists from a partial run, update it in place; never create a duplicate name.
- **Screenshots on dark:** the file has no dark-mode page; to sanity-check theme behavior, temporarily place an instance over a rectangle filled with the `background` variable's dark value, screenshot, then delete the temp nodes.
- **Out of scope (separate follow-ups):** Code Connect mappings (Figma → `.astro`), the Header mobile variant, ShareLinks, BackButton, EditPost, BackToTopButton, Video. These are Batch 2 / backlog per `docs/component-parity.md`.
