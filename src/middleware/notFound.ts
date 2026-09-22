import type { RequestHandler } from "express";
import { AppError } from "../utils/appError.js";

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, "NOT_FOUND", "Not found"));
};
