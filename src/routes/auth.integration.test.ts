import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { app } from "../app.js";
import { AUTH_COOKIE_NAME } from "../config/auth.js";
import { User } from "../models/user.model.js";
import { withListeningApp } from "../testing/listen.js";
import { decodeAccessToken } from "../utils/token.js";

function cookieValue(setCookieHeaders: string[], name: string): string | undefined {
  for (const header of setCookieHeaders) {
    const firstPart = header.split(";", 1)[0];
    if (!firstPart) {
      continue;
    }

    const separator = firstPart.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const cookieName = firstPart.slice(0, separator);
    if (cookieName === name) {
      return firstPart.slice(separator + 1);
    }
  }

  return undefined;
}

function authCookieHeader(response: Response): string | undefined {
  const token = cookieValue(response.headers.getSetCookie(), AUTH_COOKIE_NAME);
  return token === undefined ? undefined : `${AUTH_COOKIE_NAME}=${token}`;
}

const credentials = {
  email: "user@example.com",
  password: "longenough",
};

let mongo: MongoMemoryServer;

before(
  async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await User.init();
  },
  { timeout: 120_000 },
);

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

test("successful registration creates a user and authenticates", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(credentials),
    });

    assert.equal(response.status, 201);
    const body = (await response.json()) as {
      user: { id: string; email: string; passwordHash?: string };
    };
    assert.equal(body.user.email, credentials.email);
    assert.ok(body.user.id);
    assert.equal("passwordHash" in body.user, false);

    const token = cookieValue(response.headers.getSetCookie(), AUTH_COOKIE_NAME);
    assert.ok(token);
    const payload = decodeAccessToken(token);
    assert.ok(payload && typeof payload === "object");
    assert.equal(payload.sub, body.user.id);
    assert.equal("password" in payload, false);
    assert.equal("passwordHash" in payload, false);

    const stored = await User.findById(body.user.id).select("+passwordHash");
    assert.ok(stored);
    assert.notEqual(stored.passwordHash, credentials.password);
  });
});

test("duplicate registration is handled correctly", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const first = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(credentials),
    });
    assert.equal(first.status, 201);

    const second = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(credentials),
    });
    assert.equal(second.status, 409);
    assert.deepEqual(await second.json(), {
      error: {
        code: "EMAIL_IN_USE",
        message: "An account with this email already exists",
      },
    });
  });
});

test("successful login authenticates the user", async () => {
  await withListeningApp(app, async (baseUrl) => {
    await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(credentials),
    });

    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(credentials),
    });

    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      user: { id: string; email: string; passwordHash?: string };
    };
    assert.equal(body.user.email, credentials.email);
    assert.equal("passwordHash" in body.user, false);
    assert.ok(authCookieHeader(response));
  });
});

test("invalid credentials return a generic authentication error", async () => {
  await withListeningApp(app, async (baseUrl) => {
    await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(credentials),
    });

    const unknownEmail = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "missing@example.com",
        password: credentials.password,
      }),
    });
    const wrongPassword = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: credentials.email,
        password: "wrong-password",
      }),
    });

    const unknownBody = await unknownEmail.json();
    const wrongBody = await wrongPassword.json();
    const expected = {
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      },
    };

    assert.equal(unknownEmail.status, 401);
    assert.equal(wrongPassword.status, 401);
    assert.deepEqual(unknownBody, expected);
    assert.deepEqual(wrongBody, expected);
  });
});

test("logout clears the cookie", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const registered = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(credentials),
    });
    const cookie = authCookieHeader(registered);
    assert.ok(cookie);

    const response = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { cookie },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true });

    const cleared = cookieValue(response.headers.getSetCookie(), AUTH_COOKIE_NAME);
    assert.equal(cleared, "");
  });
});

test("GET /api/auth/me rejects unauthenticated requests", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      },
    });
  });
});

test("authenticated GET /api/auth/me returns safe user data", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const registered = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(credentials),
    });
    const cookie = authCookieHeader(registered);
    assert.ok(cookie);

    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { cookie },
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      user: { id: string; email: string; passwordHash?: string };
    };
    assert.equal(body.user.email, credentials.email);
    assert.ok(body.user.id);
    assert.equal("passwordHash" in body.user, false);
  });
});

test("logout is safe when already logged out", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/logout`, { method: "POST" });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true });
  });
});
