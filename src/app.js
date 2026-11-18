import express from "express"
import cors from "cors"
import morgan from "morgan"
import helmet from "helmet"
import cookieParser from "cookie-parser"
import rateLimit from "express-rate-limit"
import { env } from "./config/env.js"
import apiRoutes from "./routes/index.js"
import { errorHandler, notFoundHandler } from "./middlewares/error.js"

export const app = express()

app.use(helmet({ crossOriginResourcePolicy: false }))

if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"))
}

const allowedOrigins = [env.CLIENT_URL, "http://localhost:3000", "http://127.0.0.1:3000"]

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        callback(null, true)
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`))
      }
    },
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

app.use("/api", apiRoutes)

app.use(notFoundHandler)
app.use(errorHandler)
