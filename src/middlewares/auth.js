import jwt from "jsonwebtoken"
import { env } from "../config/env.js"
import { User } from "../models/User.js"

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: SEVEN_DAYS_MS,
  }
}

export function generateToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN })
}

export function signToken(user) {
  return generateToken({ id: user._id.toString(), role: user.role })
}

export function setAuthCookie(res, token) {
  res.cookie(env.COOKIE_NAME, token, cookieOptions())
}

export function clearAuthCookie(res) {
  const { maxAge, ...options } = cookieOptions()
  res.clearCookie(env.COOKIE_NAME, options)
}

function extractToken(req) {
  const header = req.headers.authorization
  if (header && header.startsWith("Bearer ")) {
    return header.slice(7).trim()
  }
  return req.cookies?.[env.COOKIE_NAME] || null
}

async function resolveUser(req, token) {
  const decoded = jwt.verify(token, env.JWT_SECRET)
  const user = await User.findById(decoded.id)
  if (!user) {
    const error = new Error("The account linked to this token no longer exists.")
    error.statusCode = 401
    throw error
  }
  if (user.isBlocked) {
    const error = new Error("Your account has been blocked. Contact support.")
    error.statusCode = 403
    throw error
  }
  return user
}

export async function verifyToken(req, res, next) {
  try {
    const token = extractToken(req)
    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required." })
    }
    req.user = await resolveUser(req, token)
    req.userId = req.user._id.toString()
    next()
  } catch (error) {
    next(error)
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req)
    if (token) {
      req.user = await resolveUser(req, token)
      req.userId = req.user._id.toString()
    }
  } catch {
    req.user = undefined
    req.userId = undefined
  }
  next()
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required." })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of: ${roles.join(", ")}.`,
      })
    }
    next()
  }
}
