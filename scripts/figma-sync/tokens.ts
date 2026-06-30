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
  const parsed: unknown = JSON.parse(text);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid tokens file: expected a JSON object of token entries.");
  }
  for (const [name, value] of Object.entries(parsed)) {
    const token = value as Record<string, unknown>;
    if (
      token === null ||
      typeof token !== "object" ||
      token.$type !== "color" ||
      typeof token.$value !== "string" ||
      token.$extensions === null ||
      typeof token.$extensions !== "object"
    ) {
      throw new Error(`Invalid token "${name}": expected a DTCG color token with $type, $value, and $extensions.`);
    }
    const mode = (token.$extensions as Record<string, unknown>).mode as Record<string, unknown> | undefined;
    if (!mode || typeof mode.dark !== "string") {
      throw new Error(`Invalid token "${name}": missing $extensions.mode.dark.`);
    }
  }
  return parsed as TokensFile;
}

export function tokenValueProjection(t: DtcgToken): { light: string; dark: string } {
  return { light: t.$value, dark: t.$extensions.mode.dark };
}
