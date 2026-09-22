import type { CookieOptions } from "express";
import { env } from "./env.js";

export const AUTH_COOKIE_NAME = "auth_token";
export const AUTH_TOKEN_EXPIRES_IN = "7d" as const;
export const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function authCookieOptions(): CookieOptions {
  const isProduction = env.NODE_ENV === "production";

  return {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  };
}

export function clearAuthCookieOptions(): CookieOptions {
  const options = authCookieOptions();
  delete options.maxAge;
  return options;
}
