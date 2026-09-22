import assert from "node:assert/strict";
import { test } from "node:test";
import { comparePassword, hashPassword } from "./password.service.js";

test("password hashing does not return the plaintext password", async () => {
  const password = "correct-horse-battery";
  const passwordHash = await hashPassword(password);

  assert.notEqual(passwordHash, password);
  assert.equal(passwordHash.includes(password), false);
  assert.match(passwordHash, /^\$2[aby]?\$/);
});

test("password comparison works", async () => {
  const password = "correct-horse-battery";
  const passwordHash = await hashPassword(password);

  assert.equal(await comparePassword(password, passwordHash), true);
  assert.equal(await comparePassword("wrong-password", passwordHash), false);
});
