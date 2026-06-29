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
