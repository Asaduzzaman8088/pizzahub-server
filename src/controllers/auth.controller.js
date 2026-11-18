import { User } from "../models/User.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { hashPassword, comparePassword } from "../utils/password.js"
import { signToken, setAuthCookie, clearAuthCookie } from "../middlewares/auth.js"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: user.image || "",
    role: user.role,
    businessName: user.businessName || "",
    isBlocked: user.isBlocked,
    subscriptionPlan: user.subscriptionPlan || "free",
    subscriptionExpiresAt: user.subscriptionExpiresAt || null,
    createdAt: user.createdAt,
  }
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = "customer", businessName, image } = req.body

  if (!name?.trim() || !email?.trim() || !password) {
    throw ApiError.badRequest("Name, email and password are required.")
  }
  if (!EMAIL_PATTERN.test(email)) {
    throw ApiError.badRequest("Please provide a valid email address.")
  }
  if (String(password).length < 6) {
    throw ApiError.badRequest("Password must be at least 6 characters long.")
  }
  if (!["customer", "vendor"].includes(role)) {
    throw ApiError.badRequest("You can only register as a customer or a vendor.")
  }
  if (role === "vendor" && !businessName?.trim()) {
    throw ApiError.badRequest("A business name is required for vendor accounts.")
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() })
  if (existing) {
    throw ApiError.conflict("An account with this email already exists.")
  }

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: await hashPassword(String(password)),
    image: image || "",
    role,
    businessName: role === "vendor" ? businessName.trim() : undefined,
  })

  const token = signToken(user)
  setAuthCookie(res, token)

  res.status(201).json({ success: true, token, user: sanitizeUser(user) })
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    throw ApiError.badRequest("Email and password are required.")
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password")
  if (!user || !user.password) {
    throw ApiError.unauthorized("Invalid email or password.")
  }

  const matches = await comparePassword(String(password), user.password)
  if (!matches) {
    throw ApiError.unauthorized("Invalid email or password.")
  }

  if (user.isBlocked) {
    throw ApiError.forbidden("Your account has been blocked. Please contact support.")
  }

  const token = signToken(user)
  setAuthCookie(res, token)

  res.status(200).json({ success: true, token, user: sanitizeUser(user) })
})

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res)
  res.status(200).json({ success: true, message: "Logged out successfully." })
})

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: sanitizeUser(req.user) })
})

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, image, businessName, currentPassword, newPassword } = req.body
  const user = await User.findById(req.user._id).select("+password")
  if (!user) throw ApiError.notFound("User not found.")

  if (name !== undefined) {
    if (!String(name).trim()) throw ApiError.badRequest("Name cannot be empty.")
    user.name = String(name).trim()
  }
  if (image !== undefined) user.image = image
  if (businessName !== undefined && user.role === "vendor") {
    user.businessName = String(businessName).trim()
  }

  if (newPassword) {
    if (String(newPassword).length < 6) {
      throw ApiError.badRequest("New password must be at least 6 characters long.")
    }
    const matches = user.password
      ? await comparePassword(String(currentPassword || ""), user.password)
      : false
    if (!matches) {
      throw ApiError.badRequest("Current password is incorrect.")
    }
    user.password = await hashPassword(String(newPassword))
  }

  await user.save()
  res.status(200).json({ success: true, user: sanitizeUser(user) })
})
