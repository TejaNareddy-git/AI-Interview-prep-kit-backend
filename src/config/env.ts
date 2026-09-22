import { config as loadEnv } from "dotenv";

loadEnv({ quiet: true });

type Env = {
  PORT: number;
  NODE_ENV: string;
  FRONTEND_URL?: string;
  MONGODB_URI?: string;
  JWT_SECRET?: string;
};

function parsePort(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") {
    return fallback;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT: "${value}"`);
  }

  return port;
}

export const env: Env = {
  PORT: parsePort(process.env.PORT, 4000),
  NODE_ENV: process.env.NODE_ENV ?? "development",
};

const frontendUrl = process.env.FRONTEND_URL;
if (frontendUrl) {
  env.FRONTEND_URL = frontendUrl;
}

const mongodbUri = process.env.MONGODB_URI;
if (mongodbUri) {
  env.MONGODB_URI = mongodbUri;
}

const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret) {
  env.JWT_SECRET = jwtSecret;
}

export function requireEnv(name: "MONGODB_URI" | "JWT_SECRET"): string {
  const value = process.env[name] ?? env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}
