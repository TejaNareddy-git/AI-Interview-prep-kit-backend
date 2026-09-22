import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import { errorHandler } from "../middleware/errorHandler.js";
import { withListeningApp } from "../testing/listen.js";
import { AppError } from "./appError.js";

test("AppError produces the expected JSON response", async () => {
  const app = express();
  app.get("/conflict", () => {
    throw new AppError(409, "CONFLICT", "Already exists");
  });
  app.use(errorHandler);

  await withListeningApp(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/conflict`);
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      error: {
        code: "CONFLICT",
        message: "Already exists",
      },
    });
  });
});
