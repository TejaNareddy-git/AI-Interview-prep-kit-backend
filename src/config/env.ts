import { config as loadEnv } from "dotenv";

loadEnv({ quiet: true });

type Env = {
  PORT: number;
  NODE_ENV: string;
  FRONTEND_URL?: string;
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
