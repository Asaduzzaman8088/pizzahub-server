import { Router } from "express"
import healthRoutes from "./health.js"

const apiRouter = Router()

// Health check
apiRouter.use(healthRoutes)

// API root welcome
apiRouter.get("/", (req, res) => {
  res.status(200).json({
    name: "PizzaHub API",
    version: "1.0.0",
    description: "Artisan Pizza Ordering & Multi-Vendor Management Platform",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth (Phase 2)",
      menu: "/api/menu (Phase 4)",
      orders: "/api/orders (Phase 5)",
      stripe: "/api/stripe (Phase 6)",
      dashboard: "/api/dashboard (Phase 7)",
    },
  })
})

export default apiRouter
