import { Router } from "express"
import healthRoutes from "./health.js"
import authRoutes from "./auth.js"
import reviewRoutes from "./reviews.js"
import menuRoutes from "./menu.js"
import orderRoutes from "./orders.js"
import wishlistRoutes from "./wishlist.js"
import stripeRoutes from "./stripe.js"
import dashboardRoutes from "./dashboard.js"
import adminRoutes from "./admin.js"

const apiRouter = Router()

apiRouter.use(healthRoutes)
apiRouter.use("/auth", authRoutes)
apiRouter.use(reviewRoutes)
apiRouter.use("/menu", menuRoutes)
apiRouter.use("/orders", orderRoutes)
apiRouter.use("/wishlist", wishlistRoutes)
apiRouter.use("/stripe", stripeRoutes)
apiRouter.use("/dashboard", dashboardRoutes)
apiRouter.use("/admin", adminRoutes)

apiRouter.get("/", (req, res) => {
  res.status(200).json({
    name: "PizzaHub API",
    version: "1.0.0",
    description: "Artisan Pizza Ordering & Multi-Vendor Management Platform",
    endpoints: {
      health: "GET /api/health",
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        logout: "POST /api/auth/logout",
        me: "GET /api/auth/me",
        updateProfile: "PATCH /api/auth/me",
      },
      menu: {
        list: "GET /api/menu",
        detail: "GET /api/menu/:id",
        vendorMine: "GET /api/menu/vendor/mine",
        create: "POST /api/menu",
        update: "PATCH /api/menu/:id",
        remove: "DELETE /api/menu/:id",
        adminAll: "GET /api/menu/admin/all",
        approve: "PATCH /api/menu/:id/status",
        feature: "PATCH /api/menu/:id/feature",
        availability: "PATCH /api/menu/:id/availability",
      },
      orders: {
        create: "POST /api/orders",
        mine: "GET /api/orders/my",
        vendor: "GET /api/orders/vendor",
        updateStatus: "PATCH /api/orders/:id/status",
      },
      reviews: {
        list: "GET /api/menu/:itemId/reviews",
        upsert: "POST /api/menu/:itemId/reviews",
        remove: "DELETE /api/reviews/:id",
      },
      wishlist: {
        list: "GET /api/wishlist",
        add: "POST /api/wishlist",
        remove: "DELETE /api/wishlist/:itemId",
      },
      stripe: {
        checkout: "POST /api/stripe/create-checkout-session",
        status: "GET /api/stripe/status",
        webhook: "POST /api/stripe/webhook",
      },
      dashboard: {
        admin: "GET /api/dashboard/admin",
        vendor: "GET /api/dashboard/vendor",
        customer: "GET /api/dashboard/customer",
      },
      admin: {
        users: "GET /api/admin/users",
        blockUser: "PATCH /api/admin/users/:id/block",
        changeRole: "PATCH /api/admin/users/:id/role",
        deleteUser: "DELETE /api/admin/users/:id",
        transactions: "GET /api/admin/transactions",
      },
    },
  })
})

export default apiRouter
