import { Router } from "express";
import { z } from "zod";
import {
  createKitController,
  getKitsController,
  getKitByIdController,
  updateKitController,
  deleteKitController,
} from "../controllers/kit.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { kitSchema } from "../schemas/kit.schema.js";

export const kitsRouter = Router();

// POST /api/kits - Create a new kit
kitsRouter.post(
  "/",
  requireAuth,
  validate({
    body: z.object({ kit: kitSchema }),
  }),
  createKitController,
);

// GET /api/kits - List all kits for the authenticated user
kitsRouter.get("/", requireAuth, getKitsController);

// GET /api/kits/:id - Get a single kit by ID
kitsRouter.get("/:id", requireAuth, getKitByIdController);

// PUT /api/kits/:id - Update a kit
kitsRouter.put(
  "/:id",
  requireAuth,
  validate({
    body: z.object({ kit: kitSchema }),
  }),
  updateKitController,
);

// DELETE /api/kits/:id - Delete a kit
kitsRouter.delete("/:id", requireAuth, deleteKitController);
