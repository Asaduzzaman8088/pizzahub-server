import { Router } from "express"
import rateLimit from "express-rate-limit"
import { register, login, logout, getMe, updateProfile, googleAuth } from "../controllers/auth.controller.js"
import { verifyToken } from "../middlewares/auth.js"

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
})

router.post("/register", authLimiter, register)
router.post("/login", authLimiter, login)
router.post("/google", authLimiter, googleAuth)
router.post("/logout", logout)
router.get("/me", verifyToken, getMe)
router.patch("/me", verifyToken, updateProfile)

export default router
