import mongoose from "mongoose"
import { env } from "./env.js"

let isConnected = false

export async function connectDB() {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true
    return
  }

  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise()
    isConnected = true
    return
  }

  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    isConnected = true
    console.log(
      `[MongoDB] Connected successfully to host: ${conn.connection.host} (DB: ${conn.connection.name})`
    )
  } catch (error) {
    isConnected = false
    console.error(`[MongoDB] Connection error:`, error.message)
    // In development, keep the app booted so the UI can show a friendly error.
    // In production (including serverless), fail the request instead of hanging.
    if (env.NODE_ENV === "production") {
      throw error
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
