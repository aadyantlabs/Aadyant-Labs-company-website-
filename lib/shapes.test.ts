// Run: node --test lib/shapes.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { browser, logoA, object3d, phone, rng, scatter } from "./shapes.ts";

test("every shape fills n points with finite values inside its box", () => {
  for (const make of [browser, phone, object3d, logoA]) {
    const p = make(5000);
    assert.equal(p.length, 15000);
    for (let i = 0; i < p.length; i += 3) {
      assert.ok(Number.isFinite(p[i]) && Number.isFinite(p[i + 1]) && Number.isFinite(p[i + 2]));
      assert.ok(Math.abs(p[i]) < 2.6 && Math.abs(p[i + 1]) < 2.2 && Math.abs(p[i + 2]) < 2, `${make.name} point out of bounds`);
    }
  }
  assert.equal(scatter(100).length, 300);
});

test("shapes are deterministic", () => {
  assert.deepEqual(browser(50), browser(50));
  const a = rng(1), b = rng(1);
  assert.equal(a(), b());
});
