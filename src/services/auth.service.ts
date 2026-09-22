import { mongo } from "mongoose";
import { User, type PublicUser } from "../models/user.model.js";
import { AppError } from "../utils/appError.js";
import { comparePassword, hashPassword } from "./password.service.js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicUser(user: { id: string; email: string }): PublicUser {
  return {
    id: user.id,
    email: user.email,
  };
}

function invalidCredentials(): AppError {
  return new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
}

function isDuplicateEmailError(err: unknown): boolean {
  return err instanceof mongo.MongoServerError && err.code === 11000;
}

export async function registerUser(email: string, password: string): Promise<PublicUser> {
  const passwordHash = await hashPassword(password);

  try {
    const user = await User.create({
      email: normalizeEmail(email),
      passwordHash,
    });

    return toPublicUser({ id: user._id.toString(), email: user.email });
  } catch (err) {
    if (isDuplicateEmailError(err)) {
      throw new AppError(409, "EMAIL_IN_USE", "An account with this email already exists");
    }

    throw err;
  }
}

export async function loginUser(email: string, password: string): Promise<PublicUser> {
  const user = await User.findOne({ email: normalizeEmail(email) }).select("+passwordHash");

  if (!user) {
    throw invalidCredentials();
  }

  const passwordHash = user.passwordHash;
  if (!passwordHash) {
    throw invalidCredentials();
  }

  const matches = await comparePassword(password, passwordHash);
  if (!matches) {
    throw invalidCredentials();
  }

  return toPublicUser({ id: user._id.toString(), email: user.email });
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }

  return toPublicUser({ id: user._id.toString(), email: user.email });
}
