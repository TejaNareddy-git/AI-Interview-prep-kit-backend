import { Kit, type KitFields } from "../models/kit.model.js";
import { AppError } from "../utils/appError.js";
import { isValidObjectId } from "mongoose";

/**
 * Error helpers for kit operations
 */
function kitNotFound(): AppError {
  return new AppError(404, "KIT_NOT_FOUND", "Kit not found");
}

function invalidKitId(): AppError {
  return new AppError(400, "INVALID_KIT_ID", "Invalid kit ID");
}

/**
 * Create a new kit for the authenticated user
 * 
 * @param userId - The authenticated user's ID (from req.auth.userId)
 * @param kitData - The Appendix A Kit structure to persist
 * @returns The created kit with MongoDB _id
 */
export async function createKit(
  userId: string,
  kitData: unknown,
): Promise<{ id: string; kit: KitFields["kit"] }> {
  const kit = (await Kit.create({
    userId,
    kit: kitData as any,
  })) as KitFields & { _id: { toString(): string }; createdAt: Date; updatedAt: Date };

  return {
    id: kit._id.toString(),
    kit: kit.kit,
  };
}

/**
 * Get a kit for a specific user
 * 
 * @param kitId - The MongoDB ObjectId of the kit
 * @param userId - The authenticated user's ID
 * @returns The kit document or throws error if not found/ownership denied
 */
export async function getKitForUser(
  kitId: string,
  userId: string,
): Promise<{ id: string; kit: KitFields["kit"]; createdAt: string; updatedAt: string }> {
  // First validate the ObjectId format
  if (!isValidObjectId(kitId)) {
    throw invalidKitId();
  }

  const kit = await Kit.findOne({
    _id: kitId,
    userId,
  });

  if (!kit) {
    throw kitNotFound();
  }

  return {
    id: kit._id.toString(),
    kit: kit.kit,
    createdAt: kit.createdAt.toISOString(),
    updatedAt: kit.updatedAt.toISOString(),
  };
}

/**
 * List all kits owned by the authenticated user
 * 
 * @param userId - The authenticated user's ID
 * @returns Array of kit summaries (id, company, role, company_url, days_available, timestamps)
 */
export async function listKitsForUser(
  userId: string,
): Promise<
  Array<{
    id: string;
    company: string;
    role: string;
    company_url: string;
    days_available: number;
    createdAt: string;
    updatedAt: string;
  }>
> {
  const kits = await Kit.find({ userId }, "userId kit createdAt updatedAt")
    .sort({ updatedAt: -1 });

  return kits.map((kit) => ({
    id: kit._id.toString(),
    company: (kit.kit as any).source.company,
    role: (kit.kit as any).source.role,
    company_url: (kit.kit as any).source.company_url,
    days_available: (kit.kit as any).schedule.days_available,
    createdAt: kit.createdAt.toISOString(),
    updatedAt: kit.updatedAt.toISOString(),
  }));
}

/**
 * Update a kit for a specific user
 * 
 * @param kitId - The MongoDB ObjectId of the kit
 * @param userId - The authenticated user's ID
 * @param kitData - The new Appendix A Kit structure
 * @returns The updated kit with MongoDB _id
 */
export async function updateKitForUser(
  kitId: string,
  userId: string,
  kitData: unknown,
): Promise<{ id: string; kit: KitFields["kit"] }> {
  // First validate the ObjectId format
  if (!isValidObjectId(kitId)) {
    throw invalidKitId();
  }

  const kit = await Kit.findOneAndUpdate(
    {
      _id: kitId,
      userId,
    },
    { kit: kitData },
    { new: true, returnDocument: "after" },
  );

  if (!kit) {
    throw kitNotFound();
  }

  return {
    id: kit._id.toString(),
    kit: kit.kit,
  };
}

/**
 * Delete a kit for a specific user
 * 
 * @param kitId - The MongoDB ObjectId of the kit
 * @param userId - The authenticated user's ID
 * @returns true if deleted, throws error if not found/ownership denied
 */
export async function deleteKitForUser(
  kitId: string,
  userId: string,
): Promise<void> {
  // First validate the ObjectId format
  if (!isValidObjectId(kitId)) {
    throw invalidKitId();
  }

  const result = await Kit.deleteOne({
    _id: kitId,
    userId,
  });

  if (result.deletedCount === 0) {
    throw kitNotFound();
  }
}
