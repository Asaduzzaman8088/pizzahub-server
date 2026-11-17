import express from "express"
import cors from "cors"
import morgan from "morgan"
import * as cookie from "cookie"
import { env } from "./config/env.js"
import apiRoutes from "./routes/index.js"
import { errorHandler, notFoundHandler } from "./middlewares/error.js"

export const app = express()

// Request Logging
if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"))
}

// CORS Whitelist
const allowedOrigins = [
  env.CLIENT_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
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

// Stripe Webhook needs the raw payload - parse raw body only on webhook route
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }))

// Body parsers for standard routes
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Simple cookie parser using 'cookie'
app.use((req, res, next) => {
  const cookieHeader = req.headers.cookie
  req.cookies = cookieHeader ? cookie.parse(cookieHeader) : {}
  next()
})

// Mount API routes
app.use("/api", apiRoutes)

// 404 & Global Error Handlers
app.use(notFoundHandler)
app.use(errorHandler)
