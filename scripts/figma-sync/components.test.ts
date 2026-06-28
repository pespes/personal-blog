import { expect, test } from "vitest";
import { componentFigmaProjection, snapshotToComponents, unmappedComponents } from "./components";
import type { ComponentsFile, FigmaSnapshot } from "./types";

const snap: FigmaSnapshot = {
  fileKey: "abc",
  collection: "Blog Tokens",
  tokens: [],
  components: [
    { name: "Tag", figmaKey: "13:16", type: "COMPONENT_SET", variants: { Size: ["Large", "Small"] }, props: { Label: "TEXT" }, boundTokens: ["accent", "foreground"], description: "Tag" },
  ],
};

test("preserves existing source mapping", () => {
  const existing: ComponentsFile = { Tag: { figmaKey: "13:16", type: "COMPONENT_SET", source: "src/components/Tag.astro", variants: {}, props: {}, boundTokens: [], description: "" } };
  const out = snapshotToComponents(snap, existing);
  expect(out.Tag.source).toBe("src/components/Tag.astro");
  expect(out.Tag.variants).toEqual({ Size: ["Large", "Small"] });
});

test("new component uses resolver, else null; unmapped lists it", () => {
  const out = snapshotToComponents(snap, {}, () => null);
  expect(out.Tag.source).toBeNull();
  expect(unmappedComponents(out)).toEqual(["Tag"]);
});

test("figma projection excludes the code-owned source field", () => {
  const out = snapshotToComponents(snap, {}, () => "x");
  const proj = componentFigmaProjection(out.Tag) as Record<string, unknown>;
  expect(proj).not.toHaveProperty("source");
  expect(proj.figmaKey).toBe("13:16");
});
