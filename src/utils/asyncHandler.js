/**
 * Wraps async route handlers so rejected promises are forwarded to Express'
 * error middleware (Express 4 does not catch them automatically).
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)
