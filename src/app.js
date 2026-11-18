import express from "express"
import cors from "cors"
import morgan from "morgan"
import helmet from "helmet"
import cookieParser from "cookie-parser"
import rateLimit from "express-rate-limit"
import { toNodeHandler } from "better-auth/node"
import { env, getAllowedOrigins } from "./config/env.js"
import { connectDB } from "./config/db.js"
import { auth } from "./config/auth.js"
import apiRoutes from "./routes/index.js"
import { errorHandler, notFoundHandler } from "./middlewares/error.js"

export const app = express()

// Required for correct client IPs and rate limiting behind Vercel / reverse proxies.
app.set("trust proxy", 1)

app.use(helmet({ crossOriginResourcePolicy: false }))

if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"))
}

const allowedOrigins = getAllowedOrigins()

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ success: false, message: "Origin not allowed by CORS." })
  }
  next()
})

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
)

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === "/api/health",
    message: { success: false, message: "Too many requests. Please slow down." },
  })
)

// Stripe webhooks require the raw body, so this must be registered before express.json()
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }))

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))
app.use(cookieParser())

// Ensure a single database connection in both long-running and serverless environments.
app.use(async (req, res, next) => {
  try {
    await connectDB()
    next()
  } catch (error) {
    next(error)
  }
})

// Better Auth handles its own authentication endpoints (sign-up, sign-in, sessions, OAuth).
app.all("/api/better-auth/*", toNodeHandler(auth))

app.use("/api", apiRoutes)

app.use(notFoundHandler)
app.use(errorHandler)
