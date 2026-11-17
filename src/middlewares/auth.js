import * as jose from "jose"
import { env } from "../config/env.js"
import { User } from "../models/User.js"

export async function verifyToken(req, res, next) {
  try {
    let token = null

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1]
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. No token provided.",
      })
    }

    const secret = new TextEncoder().encode(env.JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret)

    const user = await User.findById(payload.id || payload._id || payload.sub).select("-password")
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists.",
      })
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended by an administrator.",
      })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.code === "ERR_JWT_EXPIRED" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
      })
    }
    return res.status(401).json({
      success: false,
      message: "Invalid or malformed authentication token.",
    })
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Access restricted to role(s): ${allowedRoles.join(", ")}.`,
      })
    }

    next()
  }
}

export async function generateToken(payload) {
  const secret = new TextEncoder().encode(env.JWT_SECRET)
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN || "7d")
    .sign(secret)
}
