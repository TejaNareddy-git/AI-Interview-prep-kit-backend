import { z } from "zod";

const nonEmptyId = z.string().min(1);

export const requirementKindSchema = z.enum([
  "technical",
  "behavioural",
  "domain",
]);

export const requirementPrioritySchema = z.enum(["must", "nice"]);

export const questionCategorySchema = z.enum([
  "technical",
  "behavioural",
  "system-design",
  "company-fit",
]);

export const questionDifficultySchema = z.literal([1, 2, 3]);

export const sourceSchema = z.object({
  company: z.string(),
  company_url: z.string(),
  role: z.string(),
  location: z.string(),
  jd_chars: z.number(),
  researched_at: z.string(),
  pages_used: z.array(z.string()),
});

export const companyBriefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string()),
});

export const requirementSchema = z.object({
  id: nonEmptyId,
  text: z.string(),
  kind: requirementKindSchema,
  priority: requirementPrioritySchema,
});

export const roleSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(requirementSchema),
});

export const questionSchema = z.object({
  id: nonEmptyId,
  requirement_ids: z.array(nonEmptyId),
  category: questionCategorySchema,
  prompt: z.string(),
  answer_outline: z.string(),
  difficulty: questionDifficultySchema,
});

export const flashcardSchema = z.object({
  id: nonEmptyId,
  front: z.string(),
  back: z.string(),
  requirement_ids: z.array(nonEmptyId),
});

export const scheduleDaySchema = z.object({
  day: z.int(),
  focus: z.string(),
  question_ids: z.array(nonEmptyId),
  minutes: z.int(),
});

export const scheduleSchema = z.object({
  days_available: z.int(),
  days: z.array(scheduleDaySchema),
});

export const coverageSchema = z.object({
  uncovered_requirement_ids: z.array(nonEmptyId),
  passes: z.number(),
});

export const kitObjectSchema = z.object({
  source: sourceSchema,
  company_brief: companyBriefSchema,
  role: roleSchema,
  questions: z.array(questionSchema),
  flashcards: z.array(flashcardSchema),
  schedule: scheduleSchema,
  coverage: coverageSchema,
});

export const kitSchema = kitObjectSchema.superRefine((kit, ctx) => {
  const requirementIds = new Set(kit.role.requirements.map((requirement) => requirement.id));
  const questionIds = new Set(kit.questions.map((question) => question.id));

  for (const [questionIndex, question] of kit.questions.entries()) {
    for (const [requirementIndex, requirementId] of question.requirement_ids.entries()) {
      if (!requirementIds.has(requirementId)) {
        ctx.addIssue({
          code: "custom",
          message: `Question references unknown requirement id "${requirementId}"`,
          path: ["questions", questionIndex, "requirement_ids", requirementIndex],
        });
      }
    }
  }

  for (const [flashcardIndex, flashcard] of kit.flashcards.entries()) {
    for (const [requirementIndex, requirementId] of flashcard.requirement_ids.entries()) {
      if (!requirementIds.has(requirementId)) {
        ctx.addIssue({
          code: "custom",
          message: `Flashcard references unknown requirement id "${requirementId}"`,
          path: ["flashcards", flashcardIndex, "requirement_ids", requirementIndex],
        });
      }
    }
  }

  for (const [dayIndex, day] of kit.schedule.days.entries()) {
    for (const [questionIndex, questionId] of day.question_ids.entries()) {
      if (!questionIds.has(questionId)) {
        ctx.addIssue({
          code: "custom",
          message: `Schedule references unknown question id "${questionId}"`,
          path: ["schedule", "days", dayIndex, "question_ids", questionIndex],
        });
      }
    }
  }
});
