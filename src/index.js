import { app } from "./app.js"
import { env } from "./config/env.js"
import { connectDB } from "./config/db.js"

async function startServer() {
  const server = app.listen(env.PORT, () => {
    console.log(`[PizzaHub Server] Running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`)
    console.log(`[PizzaHub Server] Health check: http://localhost:${env.PORT}/api/health`)
  })

  // Connect to MongoDB asynchronously so server starts immediately
  connectDB().catch((err) => {
    console.warn(`[MongoDB] Initial connection deferred: ${err.message}`)
  })

  // Graceful shutdown
  const gracefulShutdown = (signal) => {
    console.log(`\n[PizzaHub Server] Received ${signal}. Closing HTTP server...`)
    server.close(() => {
      console.log("[PizzaHub Server] HTTP server closed gracefully.")
      process.exit(0)
    })
  }

  process.on("SIGINT", () => gracefulShutdown("SIGINT"))
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
}

startServer()
