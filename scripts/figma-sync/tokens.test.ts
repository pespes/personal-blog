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

test("parseTokens rejects non-object JSON", () => {
  expect(() => parseTokens("[]")).toThrow(/expected a JSON object/);
  expect(() => parseTokens("42")).toThrow(/expected a JSON object/);
});

test("parseTokens rejects a token missing $value", () => {
  const bad = JSON.stringify({ accent: { $type: "color", $extensions: { mode: { dark: "#000" } } } });
  expect(() => parseTokens(bad)).toThrow(/Invalid token "accent"/);
});

test("parseTokens rejects a token missing mode.dark", () => {
  const bad = JSON.stringify({ accent: { $type: "color", $value: "#006cac", $extensions: { css: "var(--accent)" } } });
  expect(() => parseTokens(bad)).toThrow(/missing \$extensions\.mode\.dark/);
});
