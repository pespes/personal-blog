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
  expect(out.startsWith(TOKENS_START)).toBe(true);
});

test("parseCssBlock reads both modes back", () => {
  const css = spliceTokensIntoCss("", tokensToCssBlock(tokens));
  expect(parseCssBlock(css)).toEqual({ accent: { light: "#006cac", dark: "#5db1e8" } });
});

test("tokensToCssBlock throws when a token has an empty dark value", () => {
  const badTokens: TokensFile = {
    accent: {
      $type: "color",
      $value: "#006cac",
      $extensions: {
        "com.figma": { variableId: "v", collection: "c" },
        mode: { dark: "" },
        css: "var(--accent)",
        scopes: [],
      },
    },
  };
  expect(() => tokensToCssBlock(badTokens)).toThrow(
    `Token "accent" is missing its dark-mode value`
  );
});

test("spliceTokensIntoCss throws when only TOKENS_START is present", () => {
  const css = `${TOKENS_START}\n.body {}`;
  expect(() => spliceTokensIntoCss(css, "block")).toThrow(
    "Malformed figma-tokens markers in CSS"
  );
});

test("spliceTokensIntoCss throws when markers are reversed (END before START)", () => {
  const css = `${TOKENS_END}\nsome content\n${TOKENS_START}`;
  expect(() => spliceTokensIntoCss(css, "block")).toThrow(
    "Malformed figma-tokens markers in CSS"
  );
});
