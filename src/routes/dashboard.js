import { Router } from "express"
import { verifyToken, requireRole } from "../middlewares/auth.js"
import { adminStats, vendorStats, customerStats } from "../controllers/dashboard.controller.js"

const router = Router()

router.get("/admin", verifyToken, requireRole("admin"), adminStats)
router.get("/vendor", verifyToken, requireRole("vendor", "admin"), vendorStats)
router.get("/customer", verifyToken, requireRole("customer"), customerStats)

export default router
