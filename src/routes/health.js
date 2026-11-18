import { Router } from "express"
import mongoose from "mongoose"
import { connectDB } from "../config/db.js"

const router = Router()

router.get("/health", async (req, res) => {
  await connectDB().catch(() => {})
  const dbState = mongoose.connection.readyState
  const dbStatusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  }

  res.status(200).json({
    status: "ok",
    service: "pizzahub-server",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatusMap[dbState] || "unknown",
      readyState: dbState,
    },
  })
})

export default router
