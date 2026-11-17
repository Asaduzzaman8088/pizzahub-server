import { env } from "../config/env.js"

export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Resource not found at ${req.originalUrl}`,
  })
}

export function errorHandler(err, req, res, next) {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode
  console.error(`[Error] ${req.method} ${req.url}:`, err.message)

  res.status(statusCode).json({
    success: false,
    message: err.message || "An unexpected internal server error occurred.",
    stack: env.NODE_ENV === "development" ? err.stack : undefined,
  })
}
