import assert from "node:assert/strict";
import { test } from "node:test";
import { loginBodySchema, registerBodySchema } from "./auth.schema.js";

test("registration validation rejects invalid email", () => {
  const result = registerBodySchema.safeParse({
    email: "not-an-email",
    password: "longenough",
  });
  assert.equal(result.success, false);
});

test("registration validation rejects invalid password", () => {
  const result = registerBodySchema.safeParse({
    email: "user@example.com",
    password: "short",
  });
  assert.equal(result.success, false);
});

test("login validation rejects empty password", () => {
  const result = loginBodySchema.safeParse({
    email: "user@example.com",
    password: "",
  });
  assert.equal(result.success, false);
});
