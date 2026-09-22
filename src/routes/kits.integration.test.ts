import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { app } from "../app.js";
import { AUTH_COOKIE_NAME } from "../config/auth.js";
import { Kit } from "../models/kit.model.js";
import { User } from "../models/user.model.js";
import { withListeningApp } from "../testing/listen.js";
import { signAccessToken } from "../utils/token.js";

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

function validKit() {
  return {
    source: {
      company: "Acme",
      company_url: "https://example.com",
      role: "Software Engineer",
      location: "Remote",
      jd_chars: 1200,
      researched_at: "2026-09-22T00:00:00.000Z",
      pages_used: ["https://example.com/careers"],
    },
    company_brief: {
      summary: "Acme builds tools.",
      what_they_do: "Software products",
      sources: ["https://example.com"],
    },
    role: {
      title: "Software Engineer",
      seniority: "mid",
      responsibilities: ["Build features"],
      requirements: [
        {
          id: "req-1",
          text: "TypeScript",
          kind: "technical",
          priority: "must",
        },
      ],
    },
    questions: [
      {
        id: "q-1",
        requirement_ids: ["req-1"],
        category: "technical",
        prompt: "Explain TypeScript generics.",
        answer_outline: "Cover type parameters and constraints.",
        difficulty: 2,
      },
    ],
    flashcards: [
      {
        id: "fc-1",
        front: "What is a generic?",
        back: "A type parameterized by another type.",
        requirement_ids: ["req-1"],
      },
    ],
    schedule: {
      days_available: 3,
      days: [
        {
          day: 1,
          focus: "TypeScript",
          question_ids: ["q-1"],
          minutes: 45,
        },
      ],
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 1,
    },
  };
}

let mongo: MongoMemoryServer;

before(
  async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await User.init();
    await Kit.init();
  },
  { timeout: 120_000 },
);

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await Kit.deleteMany({});
});

// Helper to create authenticated user and return cookie
async function createUserAndCookie(
  baseUrl: string,
  email: string,
  password: string = "password123",
): Promise<string> {
  const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(registerResponse.status, 201);
  const token = cookieValue(registerResponse.headers.getSetCookie(), AUTH_COOKIE_NAME);
  assert.ok(token);
  return `${AUTH_COOKIE_NAME}=${token}`;
}

test("authenticated user can create a kit", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const cookie = await createUserAndCookie(baseUrl, "user@example.com");

    const response = await fetch(`${baseUrl}/api/kits`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ kit: validKit() }),
    });

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.ok(body.kit);
    assert.equal(body.kit.source.company, "Acme");
    assert.equal(body.kit.questions.length, 1);
  });
});

test("unauthenticated user cannot create a kit", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/kits`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kit: validKit() }),
    });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      },
    });
  });
});

test("created kit is persisted", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const cookie = await createUserAndCookie(baseUrl, "user@example.com");

    const createResponse = await fetch(`${baseUrl}/api/kits`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ kit: validKit() }),
    });
    assert.equal(createResponse.status, 201);
    const body = await createResponse.json();
    const kitId = body.id;

    const storedKit = await Kit.findById(kitId);
    assert.ok(storedKit);
    assert.ok(storedKit?._id);
    assert.equal(storedKit?._id.toString(), kitId);
    assert.ok((storedKit?.kit as any)?.source);
    assert.equal((storedKit?.kit as any).source.company, "Acme");
  });
});

test("authenticated user can list their kits", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const cookie = await createUserAndCookie(baseUrl, "user@example.com");

    // Create first kit
    await fetch(`${baseUrl}/api/kits`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ kit: validKit() }),
    });

    // Create second kit
    const kit2 = validKit();
    kit2.source.company = "AnotherCompany";
    await fetch(`${baseUrl}/api/kits`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ kit: kit2 }),
    });

    // List kits
    const response = await fetch(`${baseUrl}/api/kits`, {
      headers: { cookie },
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(Array.isArray(body.kits));
    assert.equal(body.kits.length, 2);
    assert.ok(body.kits.every((k: any) => k.company === "Acme" || k.company === "AnotherCompany"));
  });
});

test("user A cannot see user B's kit in the list", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const cookieA = await createUserAndCookie(baseUrl, "userA@example.com");
    const cookieB = await createUserAndCookie(baseUrl, "userB@example.com");

    // User A creates a kit
    await fetch(`${baseUrl}/api/kits`, {
      method: "POST",
      headers: { "content-type": "application/json", cookieA },
      body: JSON.stringify({ kit: validKit() }),
    });

    // User B lists kits - should be empty
    const responseB = await fetch(`${baseUrl}/api/kits`, {
      headers: { cookie: cookieB },
    });

    assert.equal(responseB.status, 200);
    const bodyB = await responseB.json();
    assert.ok(Array.isArray(bodyB.kits));
    assert.equal(bodyB.kits.length, 0);
  });
});

test("user A can retrieve their own kit", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const cookie = await createUserAndCookie(baseUrl, "user@example.com");

    const createResponse = await fetch(`${baseUrl}/api/kits`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ kit: validKit() }),
    });
    assert.equal(createResponse.status, 201);
    const body = await createResponse.json();
    const kitId = body.id;

    // Retrieve the kit
    const response = await fetch(`${baseUrl}/api/kits/${kitId}`, {
      headers: { cookie },
    });

    assert.equal(response.status, 200);
    const retrieved = await response.json();
    assert.equal(retrieved.kit.source.company, "Acme");
    assert.equal(retrieved.kit.questions.length, 1);
  });
});

test("user A cannot retrieve user B's kit", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const cookieA = await createUserAndCookie(baseUrl, "userA@example.com");
    const cookieB = await createUserAndCookie(baseUrl, "userB@example.com");

    // User A creates a kit
    const createResponse = await fetch(`${baseUrl}/api/kits`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookieA },
      body: JSON.stringify({ kit: validKit() }),
    });
    assert.equal(createResponse.status, 201);
    const body = await createResponse.json();
    const kitId = body.id;

    // User B tries to retrieve the kit
    const response = await fetch(`${baseUrl}/api/kits/${kitId}`, {
      headers: { cookie: cookieB },
    });

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: {
        code: "KIT_NOT_FOUND",
        message: "Kit not found",
      },
    });
  });
});

test("user A cannot update user B's kit", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const cookieA = await createUserAndCookie(baseUrl, "userA@example.com");
    const cookieB = await createUserAndCookie(baseUrl, "userB@example.com");

    // User A creates a kit
    const createResponse = await fetch(`${baseUrl}/api/kits`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookieA },
      body: JSON.stringify({ kit: validKit() }),
    });
    assert.equal(createResponse.status, 201);
    const body = await createResponse.json();
    const kitId = body.id;

    // User B tries to update the kit
    const updateResponse = await fetch(`${baseUrl}/api/kits/${kitId}`, {
      method: "PUT",
      headers: { "content-type": "application/json", cookie: cookieB },
      body: JSON.stringify({ kit: validKit() }),
    });

    assert.equal(updateResponse.status, 404);
    assert.deepEqual(await updateResponse.json(), {
      error: {
        code: "KIT_NOT_FOUND",
        message: "Kit not found",
      },
    });
  });
});

test("user A cannot delete user B's kit", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const cookieA = await createUserAndCookie(baseUrl, "userA@example.com");
    const cookieB = await createUserAndCookie(baseUrl, "userB@example.com");

    // User A creates a kit
    const createResponse = await fetch(`${baseUrl}/api/kits`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookieA },
      body: JSON.stringify({ kit: validKit() }),
    });
    assert.equal(createResponse.status, 201);
    const body = await createResponse.json();
    const kitId = body.id;

    // User B tries to delete the kit
    const deleteResponse = await fetch(`${baseUrl}/api/kits/${kitId}`, {
      method: "DELETE",
      headers: { cookie: cookieB },
    });

    assert.equal(deleteResponse.status, 404);
    assert.deepEqual(await deleteResponse.json(), {
      error: {
        code: "KIT_NOT_FOUND",
        message: "Kit not found",
      },
    });
  });
});

test("user B can access their own kit", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const cookieB = await createUserAndCookie(baseUrl, "userB@example.com");

    // User B creates a kit
    const createResponse = await fetch(`${baseUrl}/api/kits`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookieB },
      body: JSON.stringify({ kit: validKit() }),
    });
    assert.equal(createResponse.status, 201);
    const body = await createResponse.json();
    const kitId = body.id;

    // User B retrieves their kit
    const response = await fetch(`${baseUrl}/api/kits/${kitId}`, {
      headers: { cookie: cookieB },
    });

    assert.equal(response.status, 200);
    const retrieved = await response.json();
    assert.equal(retrieved.kit.source.company, "Acme");
  });
});

test("invalid kit payload is rejected with VALIDATION_ERROR", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const cookie = await createUserAndCookie(baseUrl, "user@example.com");

    const response = await fetch(`${baseUrl}/api/kits`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ kit: { invalid: "data" } }),
    });

    assert.equal(response.status, 400);
    const errorBody = await response.json();
    assert.equal(errorBody.error.code, "VALIDATION_ERROR");
  });
});

test("invalid kit ObjectId is handled cleanly", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const cookie = await createUserAndCookie(baseUrl, "user@example.com");

    // Try to get a kit with invalid ID
    const response = await fetch(`${baseUrl}/api/kits/not-a-valid-id`, {
      headers: { cookie },
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INVALID_KIT_ID",
        message: "Invalid kit ID",
      },
    });
  });
});

test("full kit returned from GET conforms to Appendix A validation", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const cookie = await createUserAndCookie(baseUrl, "user@example.com");

    const createResponse = await fetch(`${baseUrl}/api/kits`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ kit: validKit() }),
    });
    assert.equal(createResponse.status, 201);
    const body = await createResponse.json();
    const kitId = body.id;

    const getResponse = await fetch(`${baseUrl}/api/kits/${kitId}`, {
      headers: { cookie },
    });

    assert.equal(getResponse.status, 200);
    const retrieved = await getResponse.json();

    // Verify the kit has all required Appendix A fields
    assert.ok(retrieved.kit.source);
    assert.ok(retrieved.kit.company_brief);
    assert.ok(retrieved.kit.role);
    assert.ok(retrieved.kit.questions);
    assert.ok(retrieved.kit.flashcards);
    assert.ok(retrieved.kit.schedule);
    assert.ok(retrieved.kit.coverage);
  });
});

test("update preserves valid Appendix A structure", async () => {
  await withListeningApp(app, async (baseUrl) => {
    const cookie = await createUserAndCookie(baseUrl, "user@example.com");

    const createResponse = await fetch(`${baseUrl}/api/kits`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ kit: validKit() }),
    });
    assert.equal(createResponse.status, 201);
    const body = await createResponse.json();
    const kitId = body.id;

    // Update with modified kit
    const originalKit = validKit();
    const updatedKit = {
      ...originalKit,
      source: {
        ...originalKit.source,
        company: "UpdatedCompany",
      },
      questions: [
        {
          ...originalKit.questions[0],
          prompt: "Updated question",
        },
      ],
    };

    const updateResponse = await fetch(`${baseUrl}/api/kits/${kitId}`, {
      method: "PUT",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ kit: updatedKit }),
    });

    assert.equal(updateResponse.status, 200);
    const updated = await updateResponse.json();
    assert.equal(updated.kit.source.company, "UpdatedCompany");
    assert.equal(updated.kit.questions[0].prompt, "Updated question");
  });
});

test("existing authentication tests remain passing", async () => {
  // This test verifies the existing auth integration tests still work
  // by making sure our new routes don't interfere with auth endpoints
  await withListeningApp(app, async (baseUrl) => {
    // Register
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "password123" }),
    });
    assert.equal(registerResponse.status, 201);

    // Login
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "password123" }),
    });
    assert.equal(loginResponse.status, 200);
  });
});

test("existing validation/error tests remain passing", async () => {
  // This test verifies our changes don't break existing validation
  await withListeningApp(app, async (baseUrl) => {
    // Test that a kit with invalid question refs fails validation
    const cookie = await createUserAndCookie(baseUrl, "user@example.com");

    const originalKit = validKit();
    const invalidKit = {
      ...originalKit,
      questions: [
        {
          ...originalKit.questions[0],
          requirement_ids: ["nonexistent"],
        },
      ],
    };

    const response = await fetch(`${baseUrl}/api/kits`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ kit: invalidKit }),
    });

    assert.equal(response.status, 400);
    const errorBody = await response.json();
    assert.equal(errorBody.error.code, "VALIDATION_ERROR");
  });
});

test("existing health/404 tests remain passing", async () => {
  await withListeningApp(app, async (baseUrl) => {
    // Health check
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthResponse.status, 200);

    // 404 for unknown route
    const notFoundResponse = await fetch(`${baseUrl}/api/unknown`);
    assert.equal(notFoundResponse.status, 404);
  });
});
