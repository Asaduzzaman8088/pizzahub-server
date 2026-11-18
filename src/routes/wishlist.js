import { Router } from "express"
import { verifyToken, requireRole } from "../middlewares/auth.js"
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from "../controllers/wishlist.controller.js"

const router = Router()

router.use(verifyToken, requireRole("customer"))

router.get("/", getWishlist)
router.post("/", addToWishlist)
router.delete("/:itemId", removeFromWishlist)

export default router
