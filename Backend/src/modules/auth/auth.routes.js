import { Router } from "express";
import { register, login, refresh, logout  } from "./auth.controller.js";
import { validateRegister, validateLogin } from "./auth.validation.js";
import { protect } from "../../middleware/auth.middleware.js";
import { authRateLimiter } from "../../middleware/rateLimiter.middleware.js";

const router = Router();

router.post("/register", authRateLimiter, validateRegister, register);
router.post("/login", authRateLimiter, validateLogin, login);
router.post("/refresh", refresh);
router.post("/logout", protect, logout);

export default router;