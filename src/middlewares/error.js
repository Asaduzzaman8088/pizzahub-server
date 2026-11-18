import { env } from "../config/env.js"

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Resource not found at ${req.originalUrl}`,
  })
}

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500)
  let message = err.message || "An unexpected internal server error occurred."

  if (err.name === "CastError") {
    statusCode = 400
    message = `Invalid value for ${err.path}: ${err.value}`
  } else if (err.name === "ValidationError") {
    statusCode = 400
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(" ")
  } else if (err.code === 11000) {
    statusCode = 409
    message = `Duplicate value for: ${Object.keys(err.keyValue || {}).join(", ")}`
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401
    message = "Invalid authentication token."
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401
    message = "Your session has expired. Please sign in again."
  }

  if (!err.statusCode && statusCode >= 500) {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err)
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: env.NODE_ENV === "development" && statusCode >= 500 ? err.stack : undefined,
  })
}
