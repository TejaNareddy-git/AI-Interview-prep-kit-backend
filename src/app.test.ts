import assert from "node:assert/strict";
import { test } from "node:test";
import { app } from "./app.js";
import { withListeningApp } from "./testing/listen.js";

test("GET /api/health returns ok", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  });
});

test("unknown API routes return JSON 404", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/does-not-exist`);
    assert.equal(response.status, 404);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/);
    assert.deepEqual(await response.json(), {
      error: {
        code: "NOT_FOUND",
        message: "Not found",
      },
    });
  });
});
