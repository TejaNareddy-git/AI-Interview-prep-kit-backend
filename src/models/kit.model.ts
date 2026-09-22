import mongoose, { Schema, type Model } from "mongoose";
import { kitSchema } from "../schemas/kit.schema.js";

/**
 * Kit document stored in MongoDB.
 * 
 * Design notes:
 * - userId: owner's MongoDB ObjectId, always enforced at query level
 * - kit: the full Appendix A Kit structure
 * - contentState: metadata to support future edit/regeneration features
 *   - generated: tracks which top-level kit sections were auto-generated
 *   - edited: tracks which items were manually modified by user
 *   - pinned: tracks items user wants to preserve during regeneration
 * - createdAt/updatedAt: timestamps for listing and debugging
 * 
 * This design allows us to later:
 * - Identify which parts were generated vs edited
 * - Regenerate specific sections without overwriting user edits
 * - Preserve pinned items across partial regeneration
 * - Keep the returned kit clean (contentState is internal-only)
 */
export type KitFields = {
  userId: string;
  kit: mongoose.Schema.Types.Mixed;
  contentState: {
    generated: {
      questions?: boolean;
      flashcards?: boolean;
      schedule?: boolean;
      companyBrief?: boolean;
    };
    edited: {
      questions?: string[];
      flashcards?: string[];
      schedule?: string[];
      companyBrief?: boolean;
    };
    pinned: {
      questions?: string[];
      flashcards?: string[];
      schedule?: string[];
      companyBrief?: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
};

const contentStateSchema = new Schema({
  generated: {
    questions: { type: Boolean, default: true },
    flashcards: { type: Boolean, default: true },
    schedule: { type: Boolean, default: true },
    companyBrief: { type: Boolean, default: true },
  },
  edited: {
    questions: [{ type: String, default: [] }],
    flashcards: [{ type: String, default: [] }],
    schedule: [{ type: String, default: [] }],
    companyBrief: { type: Boolean, default: false },
  },
  pinned: {
    questions: [{ type: String, default: [] }],
    flashcards: [{ type: String, default: [] }],
    schedule: [{ type: String, default: [] }],
    companyBrief: { type: Boolean, default: false },
  },
}, { _id: false });

const kitSchemaDef = new Schema<KitFields>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    kit: {
      type: Schema.Types.Mixed,
      required: true,
      validate: {
        validator: (value: unknown) => kitSchema.safeParse(value).success,
        message: "Invalid kit structure",
      },
    },
    contentState: {
      type: contentStateSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

// Index for efficient user kit listing
kitSchemaDef.index({ userId: 1, updatedAt: -1 });

// Transform to exclude internal fields from API responses
kitSchemaDef.set("toJSON", {
  transform(_doc, ret: Record<string, unknown>) {
    delete ret.__v;
    // contentState is internal-only, should not be exposed in API
    delete ret.contentState;
    return ret;
  },
});

export const Kit: Model<KitFields> =
  (mongoose.models.Kit as Model<KitFields> | undefined) ??
  mongoose.model<KitFields>("Kit", kitSchemaDef);
