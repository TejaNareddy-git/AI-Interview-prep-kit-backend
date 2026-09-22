import type { RequestHandler } from "express";
import { AppError, type ApiErrorDetails } from "../utils/appError.js";
import {
  createKit,
  getKitForUser,
  listKitsForUser,
  updateKitForUser,
  deleteKitForUser,
} from "../services/kit.service.js";
import { kitSchema } from "../schemas/kit.schema.js";

type CreateKitRequestBody = {
  kit: unknown;
};

export const createKitController: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    const { kit } = req.body as CreateKitRequestBody;

    // Validate the kit against Appendix A schema
    const validation = kitSchema.safeParse(kit);
    if (!validation.success) {
      const details: ApiErrorDetails = validation.error.issues.map((issue) => ({
        path: issue.path as string[],
        message: issue.message,
      }));
      throw new AppError(400, "VALIDATION_ERROR", "Invalid kit structure", details);
    }

    const result = await createKit(userId, kit);

    res.status(201).json({ id: result.id, kit: result.kit });
  } catch (err) {
    next(err);
  }
};

export const getKitsController: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    const kits = await listKitsForUser(userId);

    res.status(200).json({ kits });
  } catch (err) {
    next(err);
  }
};

export const getKitByIdController: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw new AppError(400, "INVALID_KIT_ID", "Invalid kit ID");
    }

    const result = await getKitForUser(id, userId);

    res.status(200).json({ kit: result.kit });
  } catch (err) {
    next(err);
  }
};

export const updateKitController: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw new AppError(400, "INVALID_KIT_ID", "Invalid kit ID");
    }

    const { kit } = req.body as CreateKitRequestBody;

    // Validate the kit against Appendix A schema
    const validation = kitSchema.safeParse(kit);
    if (!validation.success) {
      const details: ApiErrorDetails = validation.error.issues.map((issue) => ({
        path: issue.path as string[],
        message: issue.message,
      }));
      throw new AppError(400, "VALIDATION_ERROR", "Invalid kit structure", details);
    }

    const result = await updateKitForUser(id, userId, kit);

    res.status(200).json({ kit: result.kit });
  } catch (err) {
    next(err);
  }
};

export const deleteKitController: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw new AppError(400, "INVALID_KIT_ID", "Invalid kit ID");
    }

    await deleteKitForUser(id, userId);

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};
