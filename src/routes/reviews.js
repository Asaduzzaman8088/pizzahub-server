import { Router } from "express"
import { verifyToken, requireRole } from "../middlewares/auth.js"
import { listReviews, upsertReview, deleteReview } from "../controllers/review.controller.js"

const router = Router()

router.get("/menu/:itemId/reviews", listReviews)
router.post("/menu/:itemId/reviews", verifyToken, requireRole("customer"), upsertReview)
router.put("/menu/:itemId/reviews", verifyToken, requireRole("customer"), upsertReview)
router.delete("/reviews/:id", verifyToken, deleteReview)

export default router
