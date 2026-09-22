import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import { z } from "zod";
import { withListeningApp } from "../testing/listen.js";
import { errorHandler } from "./errorHandler.js";
import { validate } from "./validate.js";

function validationApp() {
  const app = express();
  app.use(express.json());

  app.post(
    "/body",
    validate({
      body: z.object({
        name: z.string().min(2),
      }),
    }),
    (req, res) => {
      const body = req.body as { name: string };
      res.status(200).json({ name: body.name });
    },
  );

  app.get(
    "/query",
    validate({
      query: z.object({
        q: z.string().min(2),
      }),
    }),
    (req, res) => {
      const query = req.query as { q: string };
      res.status(200).json({ q: query.q });
    },
  );

  app.get(
    "/params/:id",
    validate({
      params: z.object({
        id: z.string().min(2),
      }),
    }),
    (req, res) => {
      res.status(200).json({ id: req.params.id });
    },
  );

  app.use(errorHandler);
  return app;
}

test("valid Zod request body passes validation", async () => {
  await withListeningApp(validationApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/body`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Teja" }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { name: "Teja" });
  });
});

test("invalid body is rejected", async () => {
  await withListeningApp(validationApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/body`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "A" }),
    });
    assert.equal(response.status, 400);
    const body = (await response.json()) as {
      error: { code: string; message: string; details: Array<{ path: unknown }> };
    };
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.equal(body.error.message, "Request validation failed");
    assert.ok(Array.isArray(body.error.details));
    assert.ok(body.error.details.length > 0);
    assert.deepEqual(body.error.details[0]?.path, ["body", "name"]);
  });
});

test("invalid query is rejected", async () => {
  await withListeningApp(validationApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/query?q=A`);
    assert.equal(response.status, 400);
    const body = (await response.json()) as {
      error: { code: string; details: Array<{ path: unknown }> };
    };
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.deepEqual(body.error.details[0]?.path, ["query", "q"]);
  });
});

test("invalid params are rejected", async () => {
  await withListeningApp(validationApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/params/A`);
    assert.equal(response.status, 400);
    const body = (await response.json()) as {
      error: { code: string; details: Array<{ path: unknown }> };
    };
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.deepEqual(body.error.details[0]?.path, ["params", "id"]);
  });
});
