import type { RequestHandler } from "express";
import { AUTH_COOKIE_NAME } from "../config/auth.js";
import { AppError } from "../utils/appError.js";
import { verifyAccessToken } from "../utils/token.js";

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token !== "string" || token === "") {
    next(new AppError(401, "UNAUTHENTICATED", "Authentication required"));
    return;
  }

  try {
    const userId = verifyAccessToken(token);
    req.auth = { userId };
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }

    next(new AppError(401, "UNAUTHENTICATED", "Authentication required"));
  }
};
