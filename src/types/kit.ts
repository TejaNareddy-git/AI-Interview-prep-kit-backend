import type { infer as ZodInfer } from "zod";
import type {
  companyBriefSchema,
  coverageSchema,
  flashcardSchema,
  kitSchema,
  questionCategorySchema,
  questionDifficultySchema,
  questionSchema,
  requirementKindSchema,
  requirementPrioritySchema,
  requirementSchema,
  roleSchema,
  scheduleDaySchema,
  scheduleSchema,
  sourceSchema,
} from "../schemas/kit.schema.js";

export type Source = ZodInfer<typeof sourceSchema>;
export type CompanyBrief = ZodInfer<typeof companyBriefSchema>;
export type RequirementKind = ZodInfer<typeof requirementKindSchema>;
export type RequirementPriority = ZodInfer<typeof requirementPrioritySchema>;
export type Requirement = ZodInfer<typeof requirementSchema>;
export type Role = ZodInfer<typeof roleSchema>;
export type QuestionCategory = ZodInfer<typeof questionCategorySchema>;
export type QuestionDifficulty = ZodInfer<typeof questionDifficultySchema>;
export type Question = ZodInfer<typeof questionSchema>;
export type Flashcard = ZodInfer<typeof flashcardSchema>;
export type ScheduleDay = ZodInfer<typeof scheduleDaySchema>;
export type Schedule = ZodInfer<typeof scheduleSchema>;
export type Coverage = ZodInfer<typeof coverageSchema>;
export type Kit = ZodInfer<typeof kitSchema>;
