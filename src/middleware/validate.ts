import type { Request, RequestHandler } from "express";
import { z } from "zod";
import { AppError, toErrorPath, type ApiErrorDetails } from "../utils/appError.js";

export type RequestSchemas = {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
};

function detailsFromZodError(error: z.ZodError, prefix: string): ApiErrorDetails {
  return error.issues.map((issue) => ({
    path: toErrorPath(issue.path, prefix),
    message: issue.message,
  }));
}

export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    const details: ApiErrorDetails = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (result.success) {
        req.body = result.data;
      } else {
        details.push(...detailsFromZodError(result.error, "body"));
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (result.success) {
        req.params = result.data as Request["params"];
      } else {
        details.push(...detailsFromZodError(result.error, "params"));
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (result.success) {
        req.query = result.data as Request["query"];
      } else {
        details.push(...detailsFromZodError(result.error, "query"));
      }
    }

    if (details.length > 0) {
      next(
        new AppError(400, "VALIDATION_ERROR", "Request validation failed", details),
      );
      return;
    }

    next();
  };
}
