import mongoose from "mongoose"
import { app } from "./app.js"
import { env } from "./config/env.js"
import { connectDB } from "./config/db.js"

async function startServer() {
  await connectDB()

  const server = app.listen(env.PORT, () => {
    console.log(`[PizzaHub Server] Running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`)
    console.log(`[PizzaHub Server] Health check: http://localhost:${env.PORT}/api/health`)
  })

  const gracefulShutdown = (signal) => {
    console.log(`\n[PizzaHub Server] Received ${signal}. Shutting down...`)
    server.close(async () => {
      await mongoose.connection.close()
      console.log("[PizzaHub Server] HTTP server and database connection closed.")
      process.exit(0)
    })
  }

  process.on("SIGINT", () => gracefulShutdown("SIGINT"))
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
  process.on("unhandledRejection", (reason) => {
    console.error("[PizzaHub Server] Unhandled rejection:", reason)
  })
}

startServer()
