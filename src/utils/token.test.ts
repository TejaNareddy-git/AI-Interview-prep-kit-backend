import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeAccessToken, signAccessToken, verifyAccessToken } from "./token.js";

test("token payload contains only the user id", () => {
  const token = signAccessToken("user-123");
  const payload = decodeAccessToken(token);

  assert.ok(payload && typeof payload === "object");
  assert.equal(payload.sub, "user-123");
  assert.equal("password" in payload, false);
  assert.equal("passwordHash" in payload, false);
});

test("verifyAccessToken extracts the user id", () => {
  const token = signAccessToken("user-123");
  assert.equal(verifyAccessToken(token), "user-123");
});

test("invalid tokens are rejected", () => {
  assert.throws(() => verifyAccessToken("not-a-token"), (err: unknown) => {
    return err instanceof Error && err.message === "Authentication required";
  });
});
