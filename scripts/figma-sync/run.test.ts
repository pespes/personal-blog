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
