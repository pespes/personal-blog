import { expect, test } from "vitest";
import type { FigmaSnapshot } from "./types";

test("FigmaSnapshot shape is constructable", () => {
  const snap: FigmaSnapshot = {
    fileKey: "abc",
    collection: "Blog Tokens",
    tokens: [
      { name: "accent", variableId: "VariableID:5:5", light: "#006cac", dark: "#5db1e8", css: "var(--accent)", scopes: ["TEXT_FILL"] },
    ],
    components: [],
  };
  expect(snap.tokens[0].name).toBe("accent");
});
