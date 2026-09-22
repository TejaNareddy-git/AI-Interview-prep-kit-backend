import type { RequestHandler } from "express";
import { clearAuthCookie, setAuthCookie } from "../utils/authCookie.js";
import { AppError } from "../utils/appError.js";
import { signAccessToken } from "../utils/token.js";
import { getCurrentUser, loginUser, registerUser } from "../services/auth.service.js";

export const register: RequestHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const user = await registerUser(email, password);
    setAuthCookie(res, signAccessToken(user.id));
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const user = await loginUser(email, password);
    setAuthCookie(res, signAccessToken(user.id));
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

export const logout: RequestHandler = (_req, res) => {
  clearAuthCookie(res);
  res.status(200).json({ success: true });
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    const user = await getCurrentUser(userId);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};
