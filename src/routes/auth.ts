import { Router } from "express";
import { login, logout, me, register } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { loginBodySchema, registerBodySchema } from "../schemas/auth.schema.js";

export const authRouter = Router();

authRouter.post("/register", validate({ body: registerBodySchema }), register);
authRouter.post("/login", validate({ body: loginBodySchema }), login);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, me);
