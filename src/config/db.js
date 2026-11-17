import mongoose from "mongoose"
import { env } from "./env.js"

let isConnected = false

export async function connectDB() {
  if (isConnected) {
    return
  }

  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    isConnected = true
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host} (DB: ${conn.connection.name})`)
  } catch (error) {
    console.error(`[MongoDB] Connection error:`, error.message)
    // In dev without running mongo instance, allow app to boot and retry
    if (env.NODE_ENV === "production") {
      process.exit(1)
    }
  }
}

mongoose.connection.on("disconnected", () => {
  isConnected = false
  console.warn("[MongoDB] Disconnected from database.")
})

mongoose.connection.on("error", (err) => {
  console.error("[MongoDB] Runtime error:", err.message)
})
