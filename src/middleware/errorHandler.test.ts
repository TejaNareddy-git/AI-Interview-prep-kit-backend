import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import { z } from "zod";
import { withListeningApp } from "../testing/listen.js";
import { errorHandler } from "./errorHandler.js";

test("unknown errors become safe HTTP 500 responses", async () => {
  const app = express();
  app.get("/boom", () => {
    throw new Error("secret database password");
  });
  app.use(errorHandler);

  await withListeningApp(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/boom`);
    assert.equal(response.status, 500);
    const body: unknown = await response.json();
    assert.deepEqual(body, {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    });
    assert.equal(JSON.stringify(body).includes("secret"), false);
  });
});

test("raw Zod errors become standardized validation responses", async () => {
  const app = express();
  app.get("/zod", () => {
    throw z.object({ name: z.string().min(2) }).parse({ name: "A" });
  });
  app.use(errorHandler);

  await withListeningApp(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/zod`);
    assert.equal(response.status, 400);
    const body = (await response.json()) as {
      error: { code: string; message: string; details: unknown };
    };
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.equal(body.error.message, "Request validation failed");
    assert.ok(Array.isArray(body.error.details));
  });
});
