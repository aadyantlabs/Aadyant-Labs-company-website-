// Run: node --test lib/contact.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseContact } from "./contact.ts";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const good = { name: "Asha", reach: "asha@example.com", need: "Web app or dashboard", message: "We need an admin dashboard for our orders." };

test("accepts a valid email or phone", () => {
  assert.equal(parseContact(form(good)).ok, true);
  assert.equal(parseContact(form({ ...good, reach: "+91 79751 75419" })).ok, true);
});

test("rejects bad fields, each with its own message", () => {
  const r = parseContact(form({ name: "A", reach: "nope", need: "Hack", message: "hi" }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.state.fields ?? {}).sort(), ["message", "name", "need", "reach"]);
});

test("honeypot blocks bots", () => {
  assert.equal(parseContact(form({ ...good, company: "Spam Inc" })).ok, false);
});
