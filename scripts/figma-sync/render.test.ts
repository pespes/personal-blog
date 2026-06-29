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
