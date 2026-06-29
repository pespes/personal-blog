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
    compCodeStates[`components.${name}`] = { source: src, exists: src ? readText(`${opts.root}/${src}`, "") !== "" : null };
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
  // eslint-disable-next-line no-console
  console.log(result.report);
  if (parseFlags(process.argv.slice(2)).check && result.drift.some((d) => d.status !== "in-sync")) {
    process.exitCode = 1;
  }
}
