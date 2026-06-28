import { expect, test } from "vitest";
import { hashEntity, stableStringify } from "./hash";

test("stableStringify is key-order independent", () => {
  expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
});

test("hashEntity is deterministic and order-independent", () => {
  expect(hashEntity({ x: 1, y: [2, 3] })).toBe(hashEntity({ y: [2, 3], x: 1 }));
});

test("hashEntity distinguishes different values", () => {
  expect(hashEntity({ v: "#006cac" })).not.toBe(hashEntity({ v: "#006cad" }));
});
