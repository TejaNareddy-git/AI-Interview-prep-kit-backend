import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import {
  AppError,
  toErrorPath,
  type ApiErrorDetails,
  type ApiErrorResponse,
} from "../utils/appError.js";

function isZodError(err: unknown): err is ZodError {
  return err instanceof ZodError;
}

function detailsFromZodError(error: ZodError): ApiErrorDetails {
  return error.issues.map((issue) => ({
    path: toErrorPath(issue.path),
    message: issue.message,
  }));
}

function sendError(
  res: Parameters<ErrorRequestHandler>[2],
  statusCode: number,
  code: string,
  message: string,
  details?: ApiErrorDetails,
): void {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
    },
  };

  if (details !== undefined) {
    body.error.details = details;
  }

  res.status(statusCode).json(body);
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  if (isZodError(err)) {
    sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Request validation failed",
      detailsFromZodError(err),
    );
    return;
  }

  if (env.NODE_ENV === "development" && process.env.NODE_TEST_CONTEXT === undefined) {
    console.error(err);
  }

  sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred");
};
