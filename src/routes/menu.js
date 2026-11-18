import { Router } from "express"
import { verifyToken, requireRole } from "../middlewares/auth.js"
import {
  listMenuItems,
  getMenuItem,
  getMyVendorItems,
  listAllItemsAdmin,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  setItemStatus,
  setItemFeatured,
} from "../controllers/menu.controller.js"

const router = Router()

router.get("/", listMenuItems)
router.get("/vendor/mine", verifyToken, requireRole("vendor", "admin"), getMyVendorItems)
router.get("/admin/all", verifyToken, requireRole("admin"), listAllItemsAdmin)
router.post("/", verifyToken, requireRole("vendor", "admin"), createMenuItem)
router.get("/:id", getMenuItem)
router.patch("/:id", verifyToken, requireRole("vendor", "admin"), updateMenuItem)
router.delete("/:id", verifyToken, requireRole("vendor", "admin"), deleteMenuItem)
router.patch("/:id/status", verifyToken, requireRole("admin"), setItemStatus)
router.patch("/:id/feature", verifyToken, requireRole("admin"), setItemFeatured)

export default router
