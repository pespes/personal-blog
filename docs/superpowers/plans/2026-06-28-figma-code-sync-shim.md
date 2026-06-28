# Figma ⇄ Code Sync Shim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local, structured-first shim that caches the Figma design system (tokens + component manifest) so Claude can diff and sync code ⇄ Figma efficiently, with Figma as the source of truth.

**Architecture:** A set of pure, testable TypeScript modules under `scripts/figma-sync/` form the engine: normalize a Figma snapshot → DTCG `tokens.json` + `components.json`, classify drift against a `sync-state.json` ledger, regenerate a marked region of `global.css`, and render a read-only `DESIGN.md`. The MCP-dependent pull is performed by Claude (which writes `design/.figma-snapshot.json`); the engine consumes that snapshot, so all logic is unit-testable without Figma. A `/figma-sync` project command orchestrates pull → engine → report.

**Tech Stack:** TypeScript (ESM), Node 22.12+, Vitest (test), tsx (run), Node `crypto`/`fs`. No runtime deps added to the site bundle.

## Global Constraints

- **Node `22.12.0`+** required (repo already mandates this).
- **ESM only** — `package.json` has `"type": "module"`. Use `import`/`export`; no `require`.
- **No new runtime dependencies** in the shipped site. New packages are `devDependencies` only (`vitest`, `tsx`, `@types/node`).
- **Figma is the source of truth** — token changes apply code-ward automatically; component/code drift is reported, never auto-rewritten.
- **Never edit code outside the marked region** — token CSS lives only between `/* figma-tokens:start … */` and `/* figma-tokens:end */`.
- **Pro-plan constraint** — Figma variables are read only via the Plugin API (MCP); the engine consumes a snapshot file, it does not call Figma.
- **Every git commit ends with the trailer:**
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- Canonical artifacts live in `design/`; the engine lives in `scripts/figma-sync/`; tokens land in `src/styles/global.css`.

---

## File Structure

```
scripts/figma-sync/
  types.ts          # shared types + the FigmaSnapshot contract (Claude→engine boundary)
  hash.ts           # stableStringify + hashEntity (deterministic content hashes)
  tokens.ts         # snapshot→DTCG tokens, (de)serialize, value projection
  css.ts            # tokens→CSS marked block, splice into global.css, parse block back
  components.ts     # snapshot→component manifest (preserve source mapping), projections
  diff.ts           # classify entities (in-sync/figma-changed/code-drift/conflict/new/removed)
  render.ts         # render DESIGN.md from canonical data
  io.ts             # artifact paths + read/write helpers + src ref scan
  run.ts            # runSync() orchestration + CLI entry (flags)
  *.test.ts         # Vitest unit tests (colocated)
design/
  .gitignore        # ignores the transient .figma-snapshot.json
  (tokens.json, components.json, sync-state.json, DESIGN.md — generated)
.claude/commands/figma-sync.md   # the /figma-sync orchestration command
vitest.config.ts    # test config (node env, scripts globs)
```

---

### Task 1: Scaffolding, test harness, and shared types

**Files:**
- Modify: `package.json` (devDeps + `test`/`figma:sync` scripts)
- Create: `vitest.config.ts`
- Create: `scripts/figma-sync/types.ts`
- Create: `scripts/figma-sync/types.test.ts`

**Interfaces:**
- Produces: the type contract every other task imports — `FigmaSnapshot`, `TokensFile`, `DtcgToken`, `ComponentsFile`, `ComponentEntry`, `SyncState`, `SyncEntry`, `EntityStatus`.

- [ ] **Step 1: Add dev dependencies**

Run:
```bash
pnpm add -D vitest tsx @types/node
```
Expected: `vitest`, `tsx`, `@types/node` appear in `devDependencies`.

- [ ] **Step 2: Add scripts to `package.json`**

Add to the `"scripts"` object:
```json
"test": "vitest run",
"test:watch": "vitest",
"figma:sync": "tsx scripts/figma-sync/run.ts"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["scripts/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create `scripts/figma-sync/types.ts`**

```ts
// The snapshot Claude writes after pulling Figma via the MCP. This is the only
// boundary between the MCP-dependent pull and the pure engine.
export interface FigmaSnapshotToken {
  name: string;        // e.g. "accent"
  variableId: string;  // e.g. "VariableID:5:5"
  light: string;       // hex for Light mode, e.g. "#006cac"
  dark: string;        // hex for Dark mode, e.g. "#5db1e8"
  css: string;         // code syntax, e.g. "var(--accent)"
  scopes: string[];    // e.g. ["TEXT_FILL", "STROKE_COLOR"]
}

export interface FigmaSnapshotComponent {
  name: string;                          // e.g. "Tag"
  figmaKey: string;                      // node id, e.g. "13:16"
  type: string;                          // "COMPONENT" | "COMPONENT_SET"
  variants: Record<string, string[]>;    // { Size: ["Large", "Small"] }
  props: Record<string, string>;         // { Label: "TEXT" }
  boundTokens: string[];                 // token names referenced
  description: string;
}

export interface FigmaSnapshot {
  fileKey: string;
  collection: string;                    // "Blog Tokens"
  tokens: FigmaSnapshotToken[];
  components: FigmaSnapshotComponent[];
}

// Canonical DTCG token record.
export interface DtcgToken {
  $type: "color";
  $value: string; // Light value (default mode)
  $extensions: {
    "com.figma": { variableId: string; collection: string };
    mode: { dark: string };
    css: string;
    scopes: string[];
  };
}
export type TokensFile = Record<string, DtcgToken>;

// Component manifest entry (metadata only — no codegen).
export interface ComponentEntry {
  figmaKey: string;
  type: string;
  source: string | null; // .astro path, null when unmapped
  variants: Record<string, string[]>;
  props: Record<string, string>;
  boundTokens: string[];
  description: string;
}
export type ComponentsFile = Record<string, ComponentEntry>;

export type EntityStatus =
  | "in-sync"
  | "figma-changed"
  | "code-drift"
  | "conflict"
  | "new"
  | "removed";

export interface SyncEntry {
  figmaHash: string;
  codeHash: string;
  lastSync: string; // ISO timestamp + "@" + commit
  status: EntityStatus;
}
export type SyncState = Record<string, SyncEntry>;
```

- [ ] **Step 5: Write a smoke test `scripts/figma-sync/types.test.ts`**

```ts
import { expect, test } from "vitest";
import type { FigmaSnapshot } from "./types";

test("FigmaSnapshot shape is constructable", () => {
  const snap: FigmaSnapshot = {
    fileKey: "abc",
    collection: "Blog Tokens",
    tokens: [
      { name: "accent", variableId: "VariableID:5:5", light: "#006cac", dark: "#5db1e8", css: "var(--accent)", scopes: ["TEXT_FILL"] },
    ],
    components: [],
  };
  expect(snap.tokens[0].name).toBe("accent");
});
```

- [ ] **Step 6: Run the test suite (verifies harness works)**

Run: `pnpm test`
Expected: PASS — 1 passing test.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts scripts/figma-sync/types.ts scripts/figma-sync/types.test.ts
git commit -m "chore(figma-sync): scaffold test harness and shared types"
```

---

### Task 2: Deterministic hashing

**Files:**
- Create: `scripts/figma-sync/hash.ts`
- Create: `scripts/figma-sync/hash.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `stableStringify(value: unknown): string`, `hashEntity(value: unknown): string` (16-char hex). Used by `diff.ts` and `run.ts`.

- [ ] **Step 1: Write the failing test `scripts/figma-sync/hash.test.ts`**

```ts
import { expect, test } from "vitest";
import { hashEntity, stableStringify } from "./hash";

test("stableStringify is key-order independent", () => {
  expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
});

test("hashEntity is deterministic and order-independent", () => {
  expect(hashEntity({ x: 1, y: [2, 3] })).toBe(hashEntity({ y: [2, 3], x: 1 }));
});

test("hashEntity distinguishes different values", () => {
  expect(hashEntity({ v: "#006cac" })).not.toBe(hashEntity({ v: "#006cad" }));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run scripts/figma-sync/hash.test.ts`
Expected: FAIL — cannot resolve `./hash`.

- [ ] **Step 3: Implement `scripts/figma-sync/hash.ts`**

```ts
import { createHash } from "node:crypto";

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const obj = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(obj)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]))
      .join(",") +
    "}"
  );
}

export function hashEntity(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run scripts/figma-sync/hash.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/figma-sync/hash.ts scripts/figma-sync/hash.test.ts
git commit -m "feat(figma-sync): deterministic content hashing"
```

---

### Task 3: Token normalization (snapshot → DTCG)

**Files:**
- Create: `scripts/figma-sync/tokens.ts`
- Create: `scripts/figma-sync/tokens.test.ts`

**Interfaces:**
- Consumes: `FigmaSnapshot`, `TokensFile`, `DtcgToken` from `./types`.
- Produces:
  - `snapshotToTokens(s: FigmaSnapshot): TokensFile`
  - `serializeTokens(t: TokensFile): string`
  - `parseTokens(text: string): TokensFile`
  - `tokenValueProjection(t: DtcgToken): { light: string; dark: string }`

- [ ] **Step 1: Write the failing test `scripts/figma-sync/tokens.test.ts`**

```ts
import { expect, test } from "vitest";
import { snapshotToTokens, serializeTokens, parseTokens, tokenValueProjection } from "./tokens";
import type { FigmaSnapshot } from "./types";

const snap: FigmaSnapshot = {
  fileKey: "abc",
  collection: "Blog Tokens",
  tokens: [
    { name: "foreground", variableId: "VariableID:5:4", light: "#282728", dark: "#ffffff", css: "var(--foreground)", scopes: ["TEXT_FILL"] },
    { name: "accent", variableId: "VariableID:5:5", light: "#006cac", dark: "#5db1e8", css: "var(--accent)", scopes: ["TEXT_FILL"] },
  ],
  components: [],
};

test("snapshotToTokens builds sorted DTCG tokens", () => {
  const t = snapshotToTokens(snap);
  expect(Object.keys(t)).toEqual(["accent", "foreground"]); // alphabetized
  expect(t.accent.$type).toBe("color");
  expect(t.accent.$value).toBe("#006cac");
  expect(t.accent.$extensions.mode.dark).toBe("#5db1e8");
  expect(t.accent.$extensions["com.figma"].variableId).toBe("VariableID:5:5");
});

test("serialize/parse round-trips", () => {
  const t = snapshotToTokens(snap);
  expect(parseTokens(serializeTokens(t))).toEqual(t);
});

test("tokenValueProjection extracts both modes", () => {
  const t = snapshotToTokens(snap);
  expect(tokenValueProjection(t.accent)).toEqual({ light: "#006cac", dark: "#5db1e8" });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run scripts/figma-sync/tokens.test.ts`
Expected: FAIL — cannot resolve `./tokens`.

- [ ] **Step 3: Implement `scripts/figma-sync/tokens.ts`**

```ts
import type { DtcgToken, FigmaSnapshot, TokensFile } from "./types";

export function snapshotToTokens(s: FigmaSnapshot): TokensFile {
  const out: TokensFile = {};
  const sorted = [...s.tokens].sort((a, b) => a.name.localeCompare(b.name));
  for (const t of sorted) {
    out[t.name] = {
      $type: "color",
      $value: t.light,
      $extensions: {
        "com.figma": { variableId: t.variableId, collection: s.collection },
        mode: { dark: t.dark },
        css: t.css,
        scopes: [...t.scopes].sort(),
      },
    };
  }
  return out;
}

export function serializeTokens(t: TokensFile): string {
  return JSON.stringify(t, null, 2) + "\n";
}

export function parseTokens(text: string): TokensFile {
  return JSON.parse(text) as TokensFile;
}

export function tokenValueProjection(t: DtcgToken): { light: string; dark: string } {
  return { light: t.$value, dark: t.$extensions.mode.dark };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run scripts/figma-sync/tokens.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/figma-sync/tokens.ts scripts/figma-sync/tokens.test.ts
git commit -m "feat(figma-sync): normalize Figma snapshot to DTCG tokens"
```

---

### Task 4: CSS marked-region generation, splice, and parse-back

**Files:**
- Create: `scripts/figma-sync/css.ts`
- Create: `scripts/figma-sync/css.test.ts`

**Interfaces:**
- Consumes: `TokensFile` from `./types`.
- Produces:
  - `TOKENS_START: string`, `TOKENS_END: string`
  - `tokensToCssBlock(t: TokensFile): string`
  - `spliceTokensIntoCss(css: string, block: string): string`
  - `parseCssBlock(css: string): Record<string, { light: string; dark: string }>`

- [ ] **Step 1: Write the failing test `scripts/figma-sync/css.test.ts`**

```ts
import { expect, test } from "vitest";
import { TOKENS_END, TOKENS_START, parseCssBlock, spliceTokensIntoCss, tokensToCssBlock } from "./css";
import type { TokensFile } from "./types";

const tokens: TokensFile = {
  accent: { $type: "color", $value: "#006cac", $extensions: { "com.figma": { variableId: "v", collection: "c" }, mode: { dark: "#5db1e8" }, css: "var(--accent)", scopes: [] } },
};

test("tokensToCssBlock wraps both modes in markers", () => {
  const block = tokensToCssBlock(tokens);
  expect(block.startsWith(TOKENS_START)).toBe(true);
  expect(block.trimEnd().endsWith(TOKENS_END)).toBe(true);
  expect(block).toContain("--accent: #006cac;");
  expect(block).toContain("--accent: #5db1e8;");
});

test("splice replaces existing region, preserving surrounding CSS", () => {
  const original = `@import "x";\n${TOKENS_START}\nOLD\n${TOKENS_END}\n.body { color: red; }\n`;
  const out = spliceTokensIntoCss(original, tokensToCssBlock(tokens));
  expect(out).toContain('@import "x";');
  expect(out).toContain(".body { color: red; }");
  expect(out).not.toContain("OLD");
  expect(out).toContain("--accent: #006cac;");
});

test("splice inserts a block when no markers exist", () => {
  const out = spliceTokensIntoCss(`.body {}`, tokensToCssBlock(tokens));
  expect(out).toContain(TOKENS_START);
  expect(out).toContain(".body {}");
});

test("parseCssBlock reads both modes back", () => {
  const css = spliceTokensIntoCss("", tokensToCssBlock(tokens));
  expect(parseCssBlock(css)).toEqual({ accent: { light: "#006cac", dark: "#5db1e8" } });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run scripts/figma-sync/css.test.ts`
Expected: FAIL — cannot resolve `./css`.

- [ ] **Step 3: Implement `scripts/figma-sync/css.ts`**

```ts
import type { TokensFile } from "./types";

export const TOKENS_START = "/* figma-tokens:start — generated by /figma-sync, do not edit by hand */";
export const TOKENS_END = "/* figma-tokens:end */";

export function tokensToCssBlock(t: TokensFile): string {
  const names = Object.keys(t).sort();
  const lightDecls = names.map((n) => `  --${n}: ${t[n].$value};`).join("\n");
  const darkDecls = names.map((n) => `  --${n}: ${t[n].$extensions.mode.dark};`).join("\n");
  return [
    TOKENS_START,
    `:root,\nhtml[data-theme="light"] {\n${lightDecls}\n}`,
    `html[data-theme="dark"] {\n${darkDecls}\n}`,
    TOKENS_END,
  ].join("\n");
}

export function spliceTokensIntoCss(css: string, block: string): string {
  const start = css.indexOf(TOKENS_START);
  const end = css.indexOf(TOKENS_END);
  if (start !== -1 && end !== -1 && end > start) {
    return css.slice(0, start) + block + css.slice(end + TOKENS_END.length);
  }
  return block + "\n\n" + css;
}

export function parseCssBlock(css: string): Record<string, { light: string; dark: string }> {
  const start = css.indexOf(TOKENS_START);
  const end = css.indexOf(TOKENS_END);
  if (start === -1 || end === -1 || end < start) return {};
  const region = css.slice(start, end);
  const darkIdx = region.indexOf('data-theme="dark"');
  const lightPart = darkIdx === -1 ? region : region.slice(0, darkIdx);
  const darkPart = darkIdx === -1 ? "" : region.slice(darkIdx);
  const grab = (part: string): Record<string, string> => {
    const map: Record<string, string> = {};
    const re = /--([\w-]+):\s*([^;]+);/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(part)) !== null) map[m[1]] = m[2].trim();
    return map;
  };
  const light = grab(lightPart);
  const dark = grab(darkPart);
  const out: Record<string, { light: string; dark: string }> = {};
  for (const name of new Set([...Object.keys(light), ...Object.keys(dark)])) {
    out[name] = { light: light[name] ?? "", dark: dark[name] ?? "" };
  }
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run scripts/figma-sync/css.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/figma-sync/css.ts scripts/figma-sync/css.test.ts
git commit -m "feat(figma-sync): generate, splice, and parse token CSS region"
```

---

### Task 5: Component manifest normalization

**Files:**
- Create: `scripts/figma-sync/components.ts`
- Create: `scripts/figma-sync/components.test.ts`

**Interfaces:**
- Consumes: `FigmaSnapshot`, `ComponentsFile`, `ComponentEntry` from `./types`.
- Produces:
  - `snapshotToComponents(s: FigmaSnapshot, existing: ComponentsFile, resolveSource?: (name: string) => string | null): ComponentsFile`
  - `unmappedComponents(c: ComponentsFile): string[]`
  - `componentFigmaProjection(e: ComponentEntry): unknown`

- [ ] **Step 1: Write the failing test `scripts/figma-sync/components.test.ts`**

```ts
import { expect, test } from "vitest";
import { componentFigmaProjection, snapshotToComponents, unmappedComponents } from "./components";
import type { ComponentsFile, FigmaSnapshot } from "./types";

const snap: FigmaSnapshot = {
  fileKey: "abc",
  collection: "Blog Tokens",
  tokens: [],
  components: [
    { name: "Tag", figmaKey: "13:16", type: "COMPONENT_SET", variants: { Size: ["Large", "Small"] }, props: { Label: "TEXT" }, boundTokens: ["accent", "foreground"], description: "Tag" },
  ],
};

test("preserves existing source mapping", () => {
  const existing: ComponentsFile = { Tag: { figmaKey: "13:16", type: "COMPONENT_SET", source: "src/components/Tag.astro", variants: {}, props: {}, boundTokens: [], description: "" } };
  const out = snapshotToComponents(snap, existing);
  expect(out.Tag.source).toBe("src/components/Tag.astro");
  expect(out.Tag.variants).toEqual({ Size: ["Large", "Small"] });
});

test("new component uses resolver, else null; unmapped lists it", () => {
  const out = snapshotToComponents(snap, {}, () => null);
  expect(out.Tag.source).toBeNull();
  expect(unmappedComponents(out)).toEqual(["Tag"]);
});

test("figma projection excludes the code-owned source field", () => {
  const out = snapshotToComponents(snap, {}, () => "x");
  const proj = componentFigmaProjection(out.Tag) as Record<string, unknown>;
  expect(proj).not.toHaveProperty("source");
  expect(proj.figmaKey).toBe("13:16");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run scripts/figma-sync/components.test.ts`
Expected: FAIL — cannot resolve `./components`.

- [ ] **Step 3: Implement `scripts/figma-sync/components.ts`**

```ts
import type { ComponentEntry, ComponentsFile, FigmaSnapshot } from "./types";

export function snapshotToComponents(
  s: FigmaSnapshot,
  existing: ComponentsFile,
  resolveSource: (name: string) => string | null = () => null,
): ComponentsFile {
  const out: ComponentsFile = {};
  const sorted = [...s.components].sort((a, b) => a.name.localeCompare(b.name));
  for (const c of sorted) {
    const prior = existing[c.name];
    out[c.name] = {
      figmaKey: c.figmaKey,
      type: c.type,
      source: prior?.source ?? resolveSource(c.name),
      variants: c.variants,
      props: c.props,
      boundTokens: [...c.boundTokens].sort(),
      description: c.description,
    };
  }
  return out;
}

export function unmappedComponents(c: ComponentsFile): string[] {
  return Object.keys(c)
    .filter((n) => !c[n].source)
    .sort();
}

export function componentFigmaProjection(e: ComponentEntry): unknown {
  return {
    figmaKey: e.figmaKey,
    type: e.type,
    variants: e.variants,
    props: e.props,
    boundTokens: e.boundTokens,
    description: e.description,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run scripts/figma-sync/components.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/figma-sync/components.ts scripts/figma-sync/components.test.ts
git commit -m "feat(figma-sync): build component manifest preserving source mapping"
```

---

### Task 6: Drift classification

**Files:**
- Create: `scripts/figma-sync/diff.ts`
- Create: `scripts/figma-sync/diff.test.ts`

**Interfaces:**
- Consumes: `hashEntity` from `./hash`; `SyncState`, `SyncEntry`, `EntityStatus` from `./types`.
- Produces:
  - `interface EntityDiff { key: string; status: EntityStatus; figmaHash: string; codeHash: string }`
  - `classifyEntity(key: string, candidate: unknown | undefined, codeState: unknown | undefined, prev: SyncEntry | undefined): EntityDiff`
  - `classifyAll(candidates: Record<string, unknown>, codeStates: Record<string, unknown>, prev: SyncState): EntityDiff[]`

- [ ] **Step 1: Write the failing test `scripts/figma-sync/diff.test.ts`**

```ts
import { expect, test } from "vitest";
import { classifyEntity } from "./diff";
import { hashEntity } from "./hash";
import type { SyncEntry } from "./types";

const figma = { light: "#006cac", dark: "#5db1e8" };
const code = { light: "#006cac", dark: "#5db1e8" };
const prev: SyncEntry = { figmaHash: hashEntity(figma), codeHash: hashEntity(code), lastSync: "t", status: "in-sync" };

test("unchanged -> in-sync", () => {
  expect(classifyEntity("accent", figma, code, prev).status).toBe("in-sync");
});
test("figma changed only -> figma-changed", () => {
  expect(classifyEntity("accent", { light: "#000000", dark: "#5db1e8" }, code, prev).status).toBe("figma-changed");
});
test("code changed only -> code-drift", () => {
  expect(classifyEntity("accent", figma, { light: "#111111", dark: "#5db1e8" }, prev).status).toBe("code-drift");
});
test("both changed -> conflict", () => {
  expect(classifyEntity("accent", { light: "#a" , dark: "#b" }, { light: "#c", dark: "#d" }, prev).status).toBe("conflict");
});
test("no prev -> new", () => {
  expect(classifyEntity("accent", figma, code, undefined).status).toBe("new");
});
test("missing candidate -> removed", () => {
  expect(classifyEntity("accent", undefined, code, prev).status).toBe("removed");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run scripts/figma-sync/diff.test.ts`
Expected: FAIL — cannot resolve `./diff`.

- [ ] **Step 3: Implement `scripts/figma-sync/diff.ts`**

```ts
import { hashEntity } from "./hash";
import type { EntityStatus, SyncEntry, SyncState } from "./types";

export interface EntityDiff {
  key: string;
  status: EntityStatus;
  figmaHash: string;
  codeHash: string;
}

export function classifyEntity(
  key: string,
  candidate: unknown | undefined,
  codeState: unknown | undefined,
  prev: SyncEntry | undefined,
): EntityDiff {
  const figmaHash = candidate === undefined ? "" : hashEntity(candidate);
  const codeHash = codeState === undefined ? "" : hashEntity(codeState);

  let status: EntityStatus;
  if (candidate === undefined) {
    status = "removed";
  } else if (!prev) {
    status = "new";
  } else {
    const figmaChanged = figmaHash !== prev.figmaHash;
    const codeChanged = codeHash !== prev.codeHash;
    if (!figmaChanged && !codeChanged) status = "in-sync";
    else if (figmaChanged && !codeChanged) status = "figma-changed";
    else if (!figmaChanged && codeChanged) status = "code-drift";
    else status = "conflict";
  }
  return { key, status, figmaHash, codeHash };
}

export function classifyAll(
  candidates: Record<string, unknown>,
  codeStates: Record<string, unknown>,
  prev: SyncState,
): EntityDiff[] {
  const keys = new Set([...Object.keys(candidates), ...Object.keys(prev)]);
  return [...keys]
    .sort()
    .map((key) => classifyEntity(key, candidates[key], codeStates[key], prev[key]));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run scripts/figma-sync/diff.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/figma-sync/diff.ts scripts/figma-sync/diff.test.ts
git commit -m "feat(figma-sync): classify per-entity drift against the ledger"
```

---

### Task 7: DESIGN.md renderer

**Files:**
- Create: `scripts/figma-sync/render.ts`
- Create: `scripts/figma-sync/render.test.ts`

**Interfaces:**
- Consumes: `TokensFile`, `ComponentsFile` from `./types`; `EntityDiff` from `./diff`.
- Produces: `renderDesignMd(args: { tokens: TokensFile; components: ComponentsFile; diffs: EntityDiff[]; lastSync: string }): string`

- [ ] **Step 1: Write the failing test `scripts/figma-sync/render.test.ts`**

```ts
import { expect, test } from "vitest";
import { renderDesignMd } from "./render";
import type { ComponentsFile, TokensFile } from "./types";

const tokens: TokensFile = {
  accent: { $type: "color", $value: "#006cac", $extensions: { "com.figma": { variableId: "v", collection: "c" }, mode: { dark: "#5db1e8" }, css: "var(--accent)", scopes: [] } },
};
const components: ComponentsFile = {
  Tag: { figmaKey: "13:16", type: "COMPONENT_SET", source: "src/components/Tag.astro", variants: { Size: ["Large", "Small"] }, props: { Label: "TEXT" }, boundTokens: ["accent"], description: "Tag" },
};

test("renders tokens table, component map, and drift", () => {
  const md = renderDesignMd({
    tokens,
    components,
    diffs: [{ key: "tokens.accent", status: "code-drift", figmaHash: "a", codeHash: "b" }],
    lastSync: "2026-06-28T10:00:00Z@abc123",
  });
  expect(md).toContain("# Design System");
  expect(md).toContain("DO NOT EDIT");
  expect(md).toContain("`--accent`");
  expect(md).toContain("#006cac");
  expect(md).toContain("#5db1e8");
  expect(md).toContain("Tag");
  expect(md).toContain("src/components/Tag.astro");
  expect(md).toContain("code-drift");
  expect(md).toContain("2026-06-28T10:00:00Z@abc123");
});

test("reports clean when no drift", () => {
  const md = renderDesignMd({ tokens, components, diffs: [{ key: "tokens.accent", status: "in-sync", figmaHash: "a", codeHash: "a" }], lastSync: "t" });
  expect(md).toContain("In sync");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run scripts/figma-sync/render.test.ts`
Expected: FAIL — cannot resolve `./render`.

- [ ] **Step 3: Implement `scripts/figma-sync/render.ts`**

```ts
import type { EntityDiff } from "./diff";
import type { ComponentsFile, TokensFile } from "./types";

export function renderDesignMd(args: {
  tokens: TokensFile;
  components: ComponentsFile;
  diffs: EntityDiff[];
  lastSync: string;
}): string {
  const { tokens, components, diffs, lastSync } = args;

  const tokenRows = Object.keys(tokens)
    .sort()
    .map((n) => `| \`--${n}\` | ${tokens[n].$value} | ${tokens[n].$extensions.mode.dark} | \`${tokens[n].$extensions.css}\` |`)
    .join("\n");

  const compRows = Object.keys(components)
    .sort()
    .map((n) => {
      const c = components[n];
      const variants = Object.entries(c.variants).map(([k, v]) => `${k}: ${v.join("/")}`).join("; ") || "—";
      return `| ${n} | \`${c.figmaKey}\` | ${c.source ?? "**unmapped**"} | ${variants} |`;
    })
    .join("\n");

  const drift = diffs.filter((d) => d.status !== "in-sync");
  const driftSection = drift.length
    ? drift.map((d) => `- \`${d.key}\` — **${d.status}**`).join("\n")
    : "In sync — no drift.";

  return [
    "# Design System",
    "",
    "> **GENERATED by `/figma-sync` — DO NOT EDIT by hand.** Source of truth is Figma.",
    `> Last sync: ${lastSync}`,
    "",
    "## Tokens",
    "",
    "| Token | Light | Dark | CSS |",
    "| --- | --- | --- | --- |",
    tokenRows,
    "",
    "## Components",
    "",
    "| Name | Figma key | Source | Variants |",
    "| --- | --- | --- | --- |",
    compRows,
    "",
    "## Drift / Actions",
    "",
    driftSection,
    "",
  ].join("\n");
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run scripts/figma-sync/render.test.ts`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/figma-sync/render.ts scripts/figma-sync/render.test.ts
git commit -m "feat(figma-sync): render read-only DESIGN.md overview"
```

---

### Task 8: IO helpers, orchestration, and CLI

**Files:**
- Create: `scripts/figma-sync/io.ts`
- Create: `scripts/figma-sync/run.ts`
- Create: `scripts/figma-sync/run.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `io.ts`: `artifactPaths(root: string)`, `readJson<T>(p: string, fallback: T): T`, `writeJson(p: string, v: unknown): void`, `readText(p: string, fallback: string): string`, `writeText(p: string, v: string): void`, `fileExists(p: string): boolean`, `findTokenRefs(srcDir: string, name: string): string[]`
  - `run.ts`: `runSync(opts: RunOptions): SyncResult` and a CLI entry. `RunOptions = { root: string; flags: { check: boolean; dryRun: boolean; tokensOnly: boolean }; now: string; commit: string }`. `SyncResult = { report: string; wrote: boolean; drift: EntityDiff[] }`.

- [ ] **Step 1: Implement `scripts/figma-sync/io.ts`** (no test — thin fs wrappers exercised via `run.test.ts`)

```ts
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function artifactPaths(root: string) {
  return {
    snapshot: join(root, "design", ".figma-snapshot.json"),
    tokens: join(root, "design", "tokens.json"),
    components: join(root, "design", "components.json"),
    syncState: join(root, "design", "sync-state.json"),
    designMd: join(root, "design", "DESIGN.md"),
    globalCss: join(root, "src", "styles", "global.css"),
    srcDir: join(root, "src"),
  };
}

export function readJson<T>(p: string, fallback: T): T {
  if (!existsSync(p)) return fallback;
  return JSON.parse(readFileSync(p, "utf8")) as T;
}

export function writeJson(p: string, v: unknown): void {
  writeFileSync(p, JSON.stringify(v, null, 2) + "\n", "utf8");
}

export function readText(p: string, fallback: string): string {
  return existsSync(p) ? readFileSync(p, "utf8") : fallback;
}

export function writeText(p: string, v: string): void {
  writeFileSync(p, v, "utf8");
}

export function fileExists(p: string): boolean {
  return existsSync(p);
}

export function findTokenRefs(srcDir: string, name: string): string[] {
  if (!existsSync(srcDir)) return [];
  const needle = `--${name}`;
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (/\.(astro|css|ts|tsx|js|mjs)$/.test(entry) && readFileSync(full, "utf8").includes(needle)) hits.push(full);
    }
  };
  walk(srcDir);
  return hits;
}
```

- [ ] **Step 2: Write the failing test `scripts/figma-sync/run.test.ts`**

```ts
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { runSync } from "./run";
import type { FigmaSnapshot } from "./types";

function workspace(snapshot: FigmaSnapshot, globalCss = "") {
  const root = mkdtempSync(join(tmpdir(), "fsync-"));
  mkdirSync(join(root, "design"), { recursive: true });
  mkdirSync(join(root, "src", "styles"), { recursive: true });
  writeFileSync(join(root, "design", ".figma-snapshot.json"), JSON.stringify(snapshot));
  writeFileSync(join(root, "src", "styles", "global.css"), globalCss);
  return root;
}

const snap: FigmaSnapshot = {
  fileKey: "abc",
  collection: "Blog Tokens",
  tokens: [{ name: "accent", variableId: "VariableID:5:5", light: "#006cac", dark: "#5db1e8", css: "var(--accent)", scopes: ["TEXT_FILL"] }],
  components: [{ name: "Tag", figmaKey: "13:16", type: "COMPONENT_SET", variants: { Size: ["Large", "Small"] }, props: { Label: "TEXT" }, boundTokens: ["accent"], description: "Tag" }],
};

const opts = (root: string, flags = {}) => ({ root, flags: { check: false, dryRun: false, tokensOnly: false, ...flags }, now: "2026-06-28T10:00:00Z", commit: "abc123" });

test("first run writes all artifacts and the CSS region", () => {
  const root = workspace(snap, ":root {}\n");
  const res = runSync(opts(root));
  expect(res.wrote).toBe(true);
  expect(existsSync(join(root, "design", "tokens.json"))).toBe(true);
  expect(existsSync(join(root, "design", "components.json"))).toBe(true);
  expect(existsSync(join(root, "design", "sync-state.json"))).toBe(true);
  expect(readFileSync(join(root, "design", "DESIGN.md"), "utf8")).toContain("--accent");
  expect(readFileSync(join(root, "src", "styles", "global.css"), "utf8")).toContain("--accent: #006cac;");
});

test("second run with no changes is in-sync and idempotent", () => {
  const root = workspace(snap, ":root {}\n");
  runSync(opts(root));
  const css1 = readFileSync(join(root, "src", "styles", "global.css"), "utf8");
  const res2 = runSync(opts(root));
  expect(res2.drift.every((d) => d.status === "in-sync")).toBe(true);
  expect(readFileSync(join(root, "src", "styles", "global.css"), "utf8")).toBe(css1);
});

test("--check writes nothing and reports", () => {
  const root = workspace(snap, ":root {}\n");
  const res = runSync(opts(root, { check: true }));
  expect(res.wrote).toBe(false);
  expect(existsSync(join(root, "design", "tokens.json"))).toBe(false);
  expect(res.report).toContain("accent");
});

test("a hand edit to the CSS region is reported as code-drift on next run", () => {
  const root = workspace(snap, ":root {}\n");
  runSync(opts(root)); // seed
  const cssPath = join(root, "src", "styles", "global.css");
  writeFileSync(cssPath, readFileSync(cssPath, "utf8").replace("#006cac", "#123456"));
  const res = runSync(opts(root, { check: true }));
  expect(res.drift.find((d) => d.key === "tokens.accent")?.status).toBe("code-drift");
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm vitest run scripts/figma-sync/run.test.ts`
Expected: FAIL — cannot resolve `./run`.

- [ ] **Step 4: Implement `scripts/figma-sync/run.ts`**

```ts
import { componentFigmaProjection, snapshotToComponents, unmappedComponents } from "./components";
import { parseCssBlock, spliceTokensIntoCss, tokensToCssBlock } from "./css";
import { classifyAll, type EntityDiff } from "./diff";
import { hashEntity as hashOf } from "./hash";
import { artifactPaths, findTokenRefs, readJson, readText, writeJson, writeText } from "./io";
import { renderDesignMd } from "./render";
import { snapshotToTokens, tokenValueProjection } from "./tokens";
import type { ComponentsFile, FigmaSnapshot, SyncState } from "./types";

export interface RunOptions {
  root: string;
  flags: { check: boolean; dryRun: boolean; tokensOnly: boolean };
  now: string;
  commit: string;
}
export interface SyncResult {
  report: string;
  wrote: boolean;
  drift: EntityDiff[];
}

export function runSync(opts: RunOptions): SyncResult {
  const p = artifactPaths(opts.root);
  const snapshot = readJson<FigmaSnapshot | null>(p.snapshot, null);
  if (!snapshot) throw new Error(`No snapshot at ${p.snapshot}. Run the Figma pull first.`);

  const prevState = readJson<SyncState>(p.syncState, {});
  const existingComponents = readJson<ComponentsFile>(p.components, {});
  const css = readText(p.globalCss, "");

  // Candidate (Figma-derived) canonical data.
  const candidateTokens = snapshotToTokens(snapshot);
  const candidateComponents = snapshotToComponents(snapshot, existingComponents);

  // Projections for classification (compare like-for-like).
  const codeTokenValues = parseCssBlock(css);
  const tokenCandidates: Record<string, unknown> = {};
  const tokenCodeStates: Record<string, unknown> = {};
  for (const name of Object.keys(candidateTokens)) {
    tokenCandidates[`tokens.${name}`] = tokenValueProjection(candidateTokens[name]);
  }
  for (const name of new Set([...Object.keys(candidateTokens), ...Object.keys(codeTokenValues)])) {
    tokenCodeStates[`tokens.${name}`] = codeTokenValues[name];
  }

  const compCandidates: Record<string, unknown> = {};
  const compCodeStates: Record<string, unknown> = {};
  for (const name of Object.keys(candidateComponents)) {
    compCandidates[`components.${name}`] = componentFigmaProjection(candidateComponents[name]);
    const src = candidateComponents[name].source;
    compCodeStates[`components.${name}`] = { source: src, exists: src ? readText(`${opts.root}/${src}`, " MISSING") !== " MISSING" : false };
  }

  const candidates = opts.flags.tokensOnly ? tokenCandidates : { ...tokenCandidates, ...compCandidates };
  const codeStates = opts.flags.tokensOnly ? tokenCodeStates : { ...tokenCodeStates, ...compCodeStates };
  const drift = classifyAll(candidates, codeStates, prevState);

  // Build human report.
  const removedRefs: string[] = [];
  for (const d of drift) {
    if (d.status === "removed" && d.key.startsWith("tokens.")) {
      const name = d.key.slice("tokens.".length);
      const refs = findTokenRefs(p.srcDir, name);
      if (refs.length) removedRefs.push(`  removed token --${name} still referenced in: ${refs.join(", ")}`);
    }
  }
  const unmapped = unmappedComponents(candidateComponents);
  const lastSync = `${opts.now}@${opts.commit}`;
  const reportLines = [
    `figma-sync ${opts.flags.check ? "(check)" : opts.flags.dryRun ? "(dry-run)" : ""}`.trim(),
    ...drift.filter((d) => d.status !== "in-sync").map((d) => `  ${d.status.padEnd(14)} ${d.key}`),
    ...(drift.every((d) => d.status === "in-sync") ? ["  in sync — nothing to do"] : []),
    ...(unmapped.length ? [`  unmapped components: ${unmapped.join(", ")}`] : []),
    ...removedRefs,
  ];
  const report = reportLines.join("\n");

  if (opts.flags.check || opts.flags.dryRun) {
    return { report, wrote: false, drift };
  }

  // Apply (Figma wins): regenerate tokens.json + CSS region.
  writeJson(p.tokens, candidateTokens);
  writeText(p.globalCss, spliceTokensIntoCss(css, tokensToCssBlock(candidateTokens)));
  if (!opts.flags.tokensOnly) writeJson(p.components, candidateComponents);

  // Ledger reflects reconciled state (code now mirrors Figma for tokens).
  const newState: SyncState = {};
  const reconciledCss = parseCssBlock(readText(p.globalCss, ""));
  for (const d of drift) {
    if (d.key.startsWith("tokens.")) {
      const name = d.key.slice("tokens.".length);
      if (!candidateTokens[name]) continue; // removed
      const proj = tokenValueProjection(candidateTokens[name]);
      newState[d.key] = { figmaHash: d.figmaHash || hashOf(proj), codeHash: hashOf(reconciledCss[name]), lastSync, status: "in-sync" };
    } else if (!opts.flags.tokensOnly && d.key.startsWith("components.")) {
      const name = d.key.slice("components.".length);
      if (!candidateComponents[name]) continue;
      newState[d.key] = { figmaHash: d.figmaHash, codeHash: d.codeHash, lastSync, status: "in-sync" };
    }
  }
  writeJson(p.syncState, newState);

  // Regenerate DESIGN.md from canonical.
  const finalComponents = opts.flags.tokensOnly ? existingComponents : candidateComponents;
  writeText(p.designMd, renderDesignMd({ tokens: candidateTokens, components: finalComponents, diffs: drift, lastSync }));

  return { report, wrote: true, drift };
}

// ---- CLI entry ----
function parseFlags(argv: string[]) {
  return {
    check: argv.includes("--check"),
    dryRun: argv.includes("--dry-run"),
    tokensOnly: argv.includes("--tokens-only"),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { execSync } = await import("node:child_process");
  let commit = "uncommitted";
  try {
    commit = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    /* not a git repo / no commits yet */
  }
  const result = runSync({
    root: process.cwd(),
    flags: parseFlags(process.argv.slice(2)),
    now: new Date().toISOString(),
    commit,
  });
  console.log(result.report);
  if (parseFlags(process.argv.slice(2)).check && result.drift.some((d) => d.status !== "in-sync")) {
    process.exitCode = 1;
  }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm vitest run scripts/figma-sync/run.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 6: Run the full suite and lint**

Run: `pnpm test && pnpm lint`
Expected: all tests pass; lint clean (delete the `_unused` import if flagged).

- [ ] **Step 7: Commit**

```bash
git add scripts/figma-sync/io.ts scripts/figma-sync/run.ts scripts/figma-sync/run.test.ts
git commit -m "feat(figma-sync): orchestration engine, ledger, and CLI"
```

---

### Task 9: `/figma-sync` command + repo seeding

**Files:**
- Create: `.claude/commands/figma-sync.md`
- Create: `design/.gitignore`
- Modify: `src/styles/global.css` (wrap existing token blocks in markers)
- Modify: `CLAUDE.md` (document the shim + command)

**Interfaces:**
- Consumes: the CLI from Task 8 (`pnpm figma:sync`), the marker constants from `css.ts`.
- Produces: the operator-facing command and a marker-seeded `global.css` so the first real sync is a clean diff.

- [ ] **Step 1: Seed markers in `src/styles/global.css`**

Wrap the existing `:root, html[data-theme="light"] { … }` and `html[data-theme="dark"] { … }` blocks (currently [src/styles/global.css:6-22](../../../src/styles/global.css#L6-L22)) so the engine owns exactly that region. The result must look like:

```css
@import "tailwindcss";
@import "./typography.css";

@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

/* figma-tokens:start — generated by /figma-sync, do not edit by hand */
:root,
html[data-theme="light"] {
  --background: #fdfdfd;
  --foreground: #282728;
  --accent: #006cac;
  --muted: #e6e6e6;
  --border: #ece9e9;
}
html[data-theme="dark"] {
  --background: #1c1917;
  --foreground: #ffffff;
  --accent: #5db1e8;
  --muted: #292524;
  --border: #57534e;
}
/* figma-tokens:end */

@theme inline {
  /* …unchanged… */
```

Only the marker comments are added and the two token blocks moved inside them; the dark-block comments (`/* stone-900 */` etc.) may be dropped since values are now generated.

- [ ] **Step 2: Create `design/.gitignore`**

```gitignore
# transient Figma pull consumed by the engine; not a source artifact
.figma-snapshot.json
```

- [ ] **Step 3: Create `.claude/commands/figma-sync.md`**

````markdown
---
description: Sync design tokens + component manifest from Figma into the codebase (Figma is source of truth).
---

# /figma-sync

Pull the `Blog Tokens` collection and component metadata from Figma via the MCP, then run the
local sync engine. Figma wins: token changes apply to `src/styles/global.css`; component/code
drift is reported, never auto-rewritten.

**Flags (pass through to the engine):** `--check` (report only, exit 1 on drift), `--dry-run`
(report planned writes, no changes), `--tokens-only`.

## Steps

1. **Preflight.** Call `mcp__figma__whoami`. If it errors, stop and tell the user to open the
   Figma desktop app and authenticate the `figma` MCP (`/mcp`). Do not write anything.

2. **Pull via the MCP.** Using `mcp__figma__use_figma` (load the `figma-use` guidance first; pass
   `skillNames: "resource:figma-use"`), run a read-only script against fileKey
   `m8DPlUQk60FzGE02CnrhS2` that returns, as JSON matching the `FigmaSnapshot` type in
   `scripts/figma-sync/types.ts`:
   - `tokens`: for each variable in the `Blog Tokens` collection — `name`, `variableId`,
     `light` + `dark` hex values (resolve each mode), `css` (its WEB codeSyntax), `scopes`.
   - `components`: for each COMPONENT/COMPONENT_SET in the library — `name`, `figmaKey` (node id),
     `type`, `variants` (variant property → values), `props` (component property name → type),
     `boundTokens` (token names referenced by its bound variables), `description`.

3. **Write the snapshot** to `design/.figma-snapshot.json` (this file is git-ignored).

4. **Run the engine:** `pnpm figma:sync` (add the user's flags). For a preview, use
   `pnpm figma:sync --dry-run` first.

5. **Relay the report.** Print the engine's output. Call out any `code-drift`, `conflict`,
   `removed` (with still-referenced tokens), and `unmapped components`. For unmapped components,
   offer to fill the `source` field in `design/components.json` by matching the component name to a
   file in `src/components/`.

6. **Review the diff.** Show `git diff src/styles/global.css design/` so the user can confirm
   before committing. Do not commit automatically.

## Notes

- The engine never edits code outside the `/* figma-tokens:start … end */` region.
- Between syncs, read `design/DESIGN.md` + `design/tokens.json` for design-system context instead
  of querying Figma.
````

- [ ] **Step 4: Document in `CLAUDE.md`**

Add a section:

```markdown
## Design tokens ⇄ Figma

Design tokens and a component manifest are synced from Figma (source of truth) via `/figma-sync`.
- Canonical data: `design/tokens.json` (DTCG), `design/components.json`, `design/sync-state.json`.
- Read `design/DESIGN.md` for a current overview without querying Figma.
- Token CSS is generated into the `/* figma-tokens:start … end */` region of
  `src/styles/global.css` — **do not hand-edit inside those markers**; edit in Figma and run
  `pnpm figma:sync`. Hand edits there are reported as `code-drift`.
- `pnpm figma:sync --check` reports drift without writing (exit 1 if drift) — useful pre-commit.
```

- [ ] **Step 5: Verify the engine round-trips against the real seeded CSS**

Create a snapshot that mirrors current values and dry-run it:
```bash
mkdir -p design
cat > design/.figma-snapshot.json <<'JSON'
{"fileKey":"m8DPlUQk60FzGE02CnrhS2","collection":"Blog Tokens","tokens":[
{"name":"background","variableId":"VariableID:5:3","light":"#fdfdfd","dark":"#1c1917","css":"var(--background)","scopes":["FRAME_FILL"]},
{"name":"foreground","variableId":"VariableID:5:4","light":"#282728","dark":"#ffffff","css":"var(--foreground)","scopes":["TEXT_FILL"]},
{"name":"accent","variableId":"VariableID:5:5","light":"#006cac","dark":"#5db1e8","css":"var(--accent)","scopes":["TEXT_FILL"]},
{"name":"muted","variableId":"VariableID:5:6","light":"#e6e6e6","dark":"#292524","css":"var(--muted)","scopes":["FRAME_FILL"]},
{"name":"border","variableId":"VariableID:5:7","light":"#ece9e9","dark":"#57534e","css":"var(--border)","scopes":["STROKE_COLOR"]}
],"components":[]}
JSON
pnpm figma:sync --dry-run
```
Expected: report lists all five tokens as `new` (no ledger yet) and writes nothing. Then run `pnpm figma:sync` and confirm `git diff src/styles/global.css` shows **no value changes** inside the markers (only formatting, if any), and `design/tokens.json`, `design/sync-state.json`, `design/DESIGN.md` are created.

- [ ] **Step 6: Build still passes**

Run: `pnpm build`
Expected: type-check + build succeed (the marker comments are inert CSS).

- [ ] **Step 7: Commit**

```bash
git add .claude/commands/figma-sync.md design/.gitignore design/tokens.json design/components.json design/sync-state.json design/DESIGN.md src/styles/global.css CLAUDE.md
git commit -m "feat(figma-sync): add /figma-sync command, seed markers and initial artifacts"
```

---

## Self-Review

**Spec coverage:**
- Structured-first artifacts (`tokens.json`/`components.json`/`sync-state.json`/`DESIGN.md`) → Tasks 3, 5, 8, 7.
- DTCG token format → Task 3.
- Marked-region `global.css` codegen (option A) → Tasks 4, 9.
- Figma-wins + Figma→code apply, code drift reported → Task 8 (`runSync` apply + classification) and Task 6.
- Component manifest, no codegen, source preservation, unmapped detection → Task 5.
- Drift detection (figma-changed/code-drift/conflict/new/removed) → Task 6, integrated in Task 8.
- `/figma-sync` command with `--check`/`--dry-run`/`--tokens-only`, preflight, MCP pull, report → Tasks 8 (flags) + 9 (command).
- Edge cases: new/removed token (removed-ref scan), renamed token (id-stable via snapshot name+id; rename surfaces as new+removed pair flagged), per-mode values, unmapped component, Figma unreachable (preflight in command) → Tasks 8, 9.
- Success criteria (idempotent in-sync, color edit propagates both modes, hand-edit reported as code-drift, `--check` no writes) → Task 8 tests cover all four.
- Non-goals respected (no component codegen, no page sync, no CI) → scope of plan.

**Placeholder scan:** No TBD/TODO; all steps contain runnable code/commands. The `_unused` import in Task 8 is explicitly explained and optional.

**Type consistency:** `FigmaSnapshot`, `TokensFile`, `DtcgToken`, `ComponentsFile`, `ComponentEntry`, `SyncState`, `SyncEntry`, `EntityStatus`, `EntityDiff` are defined in Tasks 1/6 and used with consistent shapes throughout. `runSync`/`SyncResult`/`RunOptions` signatures match their test usage in Task 8. Token ledger keys are namespaced `tokens.<name>` / `components.<name>` consistently across `run.ts`, `render.test.ts`, and `run.test.ts`.

**Note on the renamed-token edge case:** a rename (stable `variableId`, new `name`) surfaces as a `removed` (old name) + `new` (new name) pair; the removed-ref scan flags any code still using the old `--var`. True id-based rename tracking is a deliberate v1 simplification consistent with the spec (reported, not silently migrated).
