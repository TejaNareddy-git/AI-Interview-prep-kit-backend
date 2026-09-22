import { app } from "./app.js";
import { env, requireEnv } from "./config/env.js";
import { connectDatabase } from "./db/connect.js";

async function start(): Promise<void> {
  requireEnv("JWT_SECRET");
  const mongodbUri = requireEnv("MONGODB_URI");
  await connectDatabase(mongodbUri);

  app.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
  });
}

start().catch(() => {
  console.error("Failed to start server");
  process.exit(1);
});
