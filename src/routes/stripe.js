import { Router } from "express"
import { verifyToken, requireRole } from "../middlewares/auth.js"
import {
  createCheckoutSession,
  getSubscriptionStatus,
  handleWebhook,
  simulatePremiumUpgrade,
} from "../controllers/stripe.controller.js"

const router = Router()

router.post("/webhook", handleWebhook)
router.get("/status", verifyToken, requireRole("vendor"), getSubscriptionStatus)
router.post("/create-checkout-session", verifyToken, requireRole("vendor"), createCheckoutSession)
router.post("/demo-activate", verifyToken, requireRole("vendor"), simulatePremiumUpgrade)

export default router
