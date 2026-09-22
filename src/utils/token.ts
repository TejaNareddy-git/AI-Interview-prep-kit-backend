import jwt, { type JwtPayload } from "jsonwebtoken";
import { AUTH_TOKEN_EXPIRES_IN } from "../config/auth.js";
import { requireEnv } from "../config/env.js";
import { AppError } from "./appError.js";

function jwtSecret(): string {
  if (process.env.NODE_TEST_CONTEXT) {
    return process.env.JWT_SECRET ?? "test-jwt-secret";
  }

  return requireEnv("JWT_SECRET");
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, jwtSecret(), {
    expiresIn: AUTH_TOKEN_EXPIRES_IN,
  });
}

export function verifyAccessToken(token: string): string {
  try {
    const payload = jwt.verify(token, jwtSecret());
    if (typeof payload === "string" || typeof payload.sub !== "string" || payload.sub === "") {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    return payload.sub;
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

export function decodeAccessToken(token: string): JwtPayload | string | null {
  return jwt.decode(token);
}
