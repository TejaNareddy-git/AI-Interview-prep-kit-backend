import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: env.FRONTEND_URL ?? true,
    credentials: true,
  }),
);

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
