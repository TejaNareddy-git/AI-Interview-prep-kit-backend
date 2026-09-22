import { z } from "zod";

/** Passwords must be at least 8 characters. */
export const MIN_PASSWORD_LENGTH = 8;

export const registerBodySchema = z.object({
  email: z.email(),
  password: z.string().min(MIN_PASSWORD_LENGTH),
});

export const loginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
