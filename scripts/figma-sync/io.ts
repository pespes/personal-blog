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
