import assert from "node:assert/strict";
import { test } from "node:test";
import { kitSchema } from "./kit.schema.js";

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

test("a valid Appendix A-shaped kit passes", () => {
  const result = kitSchema.safeParse(validKit());
  assert.equal(result.success, true);
});

test("missing required fields fail", () => {
  const kit = validKit();
  const { company: _company, ...incompleteSource } = kit.source;
  const result = kitSchema.safeParse({
    ...kit,
    source: incompleteSource,
  });
  assert.equal(result.success, false);
});

test("invalid difficulty fails", () => {
  const kit = validKit();
  const question = kit.questions[0];
  assert.ok(question);
  const result = kitSchema.safeParse({
    ...kit,
    questions: [{ ...question, difficulty: 4 }],
  });
  assert.equal(result.success, false);
});

test("invalid requirement priority fails", () => {
  const kit = validKit();
  const requirement = kit.role.requirements[0];
  assert.ok(requirement);
  const result = kitSchema.safeParse({
    ...kit,
    role: {
      ...kit.role,
      requirements: [{ ...requirement, priority: "optional" }],
    },
  });
  assert.equal(result.success, false);
});

test("invalid requirement kind fails", () => {
  const kit = validKit();
  const requirement = kit.role.requirements[0];
  assert.ok(requirement);
  const result = kitSchema.safeParse({
    ...kit,
    role: {
      ...kit.role,
      requirements: [{ ...requirement, kind: "soft-skill" }],
    },
  });
  assert.equal(result.success, false);
});

test("invalid question category fails", () => {
  const kit = validKit();
  const question = kit.questions[0];
  assert.ok(question);
  const result = kitSchema.safeParse({
    ...kit,
    questions: [{ ...question, category: "trivia" }],
  });
  assert.equal(result.success, false);
});

test("non-integer minutes fail", () => {
  const kit = validKit();
  const day = kit.schedule.days[0];
  assert.ok(day);
  const result = kitSchema.safeParse({
    ...kit,
    schedule: {
      ...kit.schedule,
      days: [{ ...day, minutes: 45.5 }],
    },
  });
  assert.equal(result.success, false);
});

test("a question referencing a nonexistent requirement fails", () => {
  const kit = validKit();
  const question = kit.questions[0];
  assert.ok(question);
  const result = kitSchema.safeParse({
    ...kit,
    questions: [{ ...question, requirement_ids: ["req-missing"] }],
  });
  assert.equal(result.success, false);
});

test("a schedule referencing a nonexistent question fails", () => {
  const kit = validKit();
  const day = kit.schedule.days[0];
  assert.ok(day);
  const result = kitSchema.safeParse({
    ...kit,
    schedule: {
      ...kit.schedule,
      days: [{ ...day, question_ids: ["q-missing"] }],
    },
  });
  assert.equal(result.success, false);
});
