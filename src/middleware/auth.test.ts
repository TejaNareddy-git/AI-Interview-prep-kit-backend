import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import cookieParser from "cookie-parser";
import { requireAuth } from "./auth.js";
import { errorHandler } from "./errorHandler.js";
import { AUTH_COOKIE_NAME } from "../config/auth.js";
import { withListeningApp } from "../testing/listen.js";
import { signAccessToken } from "../utils/token.js";

function protectedApp() {
  const app = express();
  app.use(cookieParser());
  app.get("/protected", requireAuth, (req, res) => {
    res.status(200).json({ userId: req.auth?.userId });
  });
  app.use(errorHandler);
  return app;
}

test("protected routes reject unauthenticated requests", async () => {
  await withListeningApp(protectedApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/protected`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      },
    });
  });
});

test("protected routes accept a valid auth cookie", async () => {
  const token = signAccessToken("user-123");

  await withListeningApp(protectedApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/protected`, {
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${token}`,
      },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { userId: "user-123" });
  });
});
