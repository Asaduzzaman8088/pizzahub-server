import { Router } from "express"
import { verifyToken, requireRole } from "../middlewares/auth.js"
import {
  listUsers,
  setUserBlocked,
  setUserRole,
  deleteUser,
  listTransactions,
} from "../controllers/admin.controller.js"

const router = Router()

router.use(verifyToken, requireRole("admin"))

router.get("/users", listUsers)
router.get("/transactions", listTransactions)
router.patch("/users/:id/block", setUserBlocked)
router.patch("/users/:id/role", setUserRole)
router.delete("/users/:id", deleteUser)

export default router
