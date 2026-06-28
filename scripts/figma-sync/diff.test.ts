import { expect, test } from "vitest";
import { classifyEntity } from "./diff";
import { hashEntity } from "./hash";
import type { SyncEntry } from "./types";

const figma = { light: "#006cac", dark: "#5db1e8" };
const code = { light: "#006cac", dark: "#5db1e8" };
const prev: SyncEntry = { figmaHash: hashEntity(figma), codeHash: hashEntity(code), lastSync: "t", status: "in-sync" };

test("unchanged -> in-sync", () => {
  expect(classifyEntity("accent", figma, code, prev).status).toBe("in-sync");
});
test("figma changed only -> figma-changed", () => {
  expect(classifyEntity("accent", { light: "#000000", dark: "#5db1e8" }, code, prev).status).toBe("figma-changed");
});
test("code changed only -> code-drift", () => {
  expect(classifyEntity("accent", figma, { light: "#111111", dark: "#5db1e8" }, prev).status).toBe("code-drift");
});
test("both changed -> conflict", () => {
  expect(classifyEntity("accent", { light: "#a" , dark: "#b" }, { light: "#c", dark: "#d" }, prev).status).toBe("conflict");
});
test("no prev -> new", () => {
  expect(classifyEntity("accent", figma, code, undefined).status).toBe("new");
});
test("missing candidate -> removed", () => {
  expect(classifyEntity("accent", undefined, code, prev).status).toBe("removed");
});
