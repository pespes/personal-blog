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
