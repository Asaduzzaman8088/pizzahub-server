import { Router } from "express"
import { verifyToken, requireRole } from "../middlewares/auth.js"
import {
  createOrder,
  listMyOrders,
  listVendorOrders,
  listAllOrders,
  getOrder,
  updateOrderStatus,
} from "../controllers/order.controller.js"

const router = Router()

router.use(verifyToken)

router.post("/", requireRole("customer"), createOrder)
router.get("/my", listMyOrders)
router.get("/vendor", requireRole("vendor", "admin"), listVendorOrders)
router.get("/admin/all", requireRole("admin"), listAllOrders)
router.get("/:id", getOrder)
router.patch("/:id/status", updateOrderStatus)

export default router
