# Task 8 Report: IO helpers, orchestration, and CLI

## TDD Evidence

### RED (run.test.ts before run.ts)
```
 FAIL  scripts/figma-sync/run.test.ts
Error: Cannot find module './run' imported from .../run.test.ts
 Test Files  1 failed (1)
      Tests  no tests
```

### GREEN (after implementing run.ts)
```
 Test Files  1 passed (1)
      Tests  4 passed (4)
   Duration  95ms
```

## Full Suite Result
```
 Test Files  8 passed (8)
      Tests  29 passed (29)
   Duration  131ms
```
All 29 tests pass (8 test files: types, hash, tokens, css, components, diff, render, run).

## Files Changed
- `scripts/figma-sync/io.ts` — created (52 lines): `artifactPaths`, `readJson`, `writeJson`, `readText`, `writeText`, `fileExists`, `findTokenRefs`
- `scripts/figma-sync/run.ts` — created (136 lines): `RunOptions`, `SyncResult`, `runSync`, CLI entry with `import.meta.url` guard and top-level `await import("node:child_process")`
- `scripts/figma-sync/run.test.ts` — created (53 lines): 4 integration tests using mkdtempSync workspace

## Implementation Notes

### Truncated line in brief (line 194)
The brief's `run.ts` code had a truncated line:
```
compCodeStates[`components.${name}`] = { source: src, exists: src ? readText(`${opts.root}/${src}`, "
```
Reconstructed as:
```ts
compCodeStates[`components.${name}`] = { source: src, exists: src ? readText(`${opts.root}/${src}`, "") !== "" : null };
```
This produces `{ source: null, exists: null }` for unmapped components (source = null), which is stable across runs and produces consistent hashes for the idempotency test.

### Lint
- Pre-existing `no-unused-vars` errors in `src/pages/index.astro` (3 errors) were already committed on the branch — not introduced by this task.
- Added `// eslint-disable-next-line no-console` before the CLI `console.log(result.report)` to suppress the `no-console` rule for the intentional CLI output.

## Self-Review

**Completeness:** All 3 files created per brief. All 4 integration behaviors verified: first-run write, idempotency, --check no-write, code-drift detection.

**No overbuild:** No new runtime dependencies. Only thin wrappers and orchestration logic as specified. No extra exports beyond the spec.

**Faithfulness to brief:** `run.ts` transcribed faithfully including the `hashOf` import alias, `import.meta.url` CLI guard, `node:` prefixed builtins, and `tokens.<name>` / `components.<name>` projection key namespacing.

**Pristine output:** Full suite 29/29 passing; no new lint errors introduced.

## Concerns
None. The truncated line was reconstructable from context and produces correct behavior verified by all 4 tests.

## Commit
`0293be8` feat(figma-sync): orchestration engine, ledger, and CLI

## Fix: Task 8 review findings

### Command run

```sh
pnpm test
```

### Full output

```text
> personal-blog@5.5.1 test /Users/peteresveld/Documents/GitHub/personal-blog
> vitest run


 RUN  v4.1.9 /Users/peteresveld/Documents/GitHub/personal-blog


 Test Files  8 passed (8)
      Tests  29 passed (29)
   Start at  08:26:29
   Duration  183ms (transform 251ms, setup 0ms, import 345ms, tests 34ms, environment 0ms)
```

### Changes applied to `scripts/figma-sync/run.ts`

**Fix 1 (Important):** Added `fileExists` to the import from `"./io"` and replaced the `exists` expression in the component code-state projection from `readText(...) !== ""` to `fileExists(...)`. This correctly identifies existing-but-empty files as present rather than treating them as absent.

**Fix 2 (Minor):** Introduced `const flags = parseFlags(process.argv.slice(2))` once at the top of the CLI block, replacing the two prior calls to `parseFlags(process.argv.slice(2))`. No behavior change.

### Result

29/29 passing, pristine.
