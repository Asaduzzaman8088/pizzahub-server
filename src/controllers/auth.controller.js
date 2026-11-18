import { User } from "../models/User.js"
import { env } from "../config/env.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { hashPassword, comparePassword } from "../utils/password.js"
import { signToken, setAuthCookie, clearAuthCookie } from "../middlewares/auth.js"
import { isPremiumActive } from "../utils/subscription.js"
import { auth } from "../config/auth.js"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z]).{6,}$/
const PASSWORD_MESSAGE =
  "Password must be at least 6 characters long and include at least one uppercase and one lowercase letter."

function authErrorMessage(error, fallback = "Authentication failed.") {
  return error?.body?.message || error?.message || fallback
}

export function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: user.image || "",
    role: user.role,
    authProvider: user.authProvider || "local",
    businessName: user.businessName || "",
    isBlocked: user.isBlocked,
    subscriptionPlan: user.subscriptionPlan || "free",
    subscriptionExpiresAt: user.subscriptionExpiresAt || null,
    isPremium: isPremiumActive(user),
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
  if (!PASSWORD_PATTERN.test(String(password))) {
    throw ApiError.badRequest(PASSWORD_MESSAGE)
  }
  if (!["customer", "vendor"].includes(role)) {
    throw ApiError.badRequest("You can only register as a customer or a vendor.")
  }
  if (role === "vendor" && !businessName?.trim()) {
    throw ApiError.badRequest("A business name is required for vendor accounts.")
  }

  const normalizedEmail = email.toLowerCase().trim()
  const existing = await User.findOne({ email: normalizedEmail })
  if (existing) {
    throw ApiError.conflict("An account with this email already exists.")
  }

  let authUserId
  try {
    const result = await auth.api.signUpEmail({
      body: {
        name: name.trim(),
        email: normalizedEmail,
        password: String(password),
        image: image || undefined,
      },
    })
    authUserId = result?.user?.id
  } catch (error) {
    const message = authErrorMessage(error)
    if (/exist/i.test(message)) {
      throw ApiError.conflict("An account with this email already exists.")
    }
    throw ApiError.badRequest(message)
  }

  if (!authUserId) {
    throw ApiError.badRequest("Could not create your account. Please try again.")
  }

  let user
  try {
    user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      authUserId,
      image: image || "",
      role,
      businessName: role === "vendor" ? businessName.trim() : undefined,
    })
  } catch (error) {
    // Roll back the Better Auth user if the business profile could not be saved.
    try {
      const ctx = await auth.$context
      await ctx.internalAdapter.deleteUser(authUserId)
    } catch {
      /* best-effort cleanup */
    }
    throw error
  }

  const token = signToken(user)
  setAuthCookie(res, token)

  res.status(201).json({ success: true, token, user: sanitizeUser(user) })
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    throw ApiError.badRequest("Email and password are required.")
  }

  const normalizedEmail = email.toLowerCase().trim()
  const providedPassword = String(password)

  let authUser = null
  try {
    const result = await auth.api.signInEmail({
      body: { email: normalizedEmail, password: providedPassword },
    })
    authUser = result?.user || null
  } catch {
    // Fall back to legacy bcrypt accounts created before Better Auth was wired in.
  }

  let user = await User.findOne({ email: normalizedEmail }).select("+password")

  if (!user && authUser) {
    user = await User.create({
      name: authUser.name || normalizedEmail.split("@")[0],
      email: normalizedEmail,
      authUserId: authUser.id,
      image: authUser.image || "",
      role: "customer",
    })
  }

  if (!user) {
    throw ApiError.unauthorized("Invalid email or password.")
  }

  if (!authUser) {
    if (!user.password) {
      if (user.authProvider === "google") {
        throw ApiError.badRequest(
          "This account was registered using Google. Please sign in with Google."
        )
      }
      throw ApiError.unauthorized("Invalid email or password.")
    }

    const matches = await comparePassword(providedPassword, user.password)
    if (!matches) {
      throw ApiError.unauthorized("Invalid email or password.")
    }

    // Transparently migrate legacy accounts into Better Auth on first login.
    try {
      const result = await auth.api.signUpEmail({
        body: {
          name: user.name,
          email: normalizedEmail,
          password: providedPassword,
          image: user.image || undefined,
        },
      })
      if (result?.user?.id) {
        user.authUserId = result.user.id
        await user.save()
      }
    } catch {
      /* keep legacy authentication working even if migration fails */
    }
  } else if (user.authUserId !== authUser.id) {
    user.authUserId = authUser.id
    await user.save()
  }

  if (user.isBlocked) {
    throw ApiError.forbidden("Your account has been blocked. Please contact support.")
  }

  const token = signToken(user)
  setAuthCookie(res, token)

  res.status(200).json({ success: true, token, user: sanitizeUser(user) })
})

export const googleAuth = asyncHandler(async (req, res) => {
  const { credential, accessToken, isDemo, role = "customer", businessName } = req.body

  let profile = null

  if (credential) {
    // 1. Google ID Token from Google Identity Services
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    )
    if (!response.ok) {
      throw ApiError.badRequest("Invalid or expired Google credential.")
    }
    const data = await response.json()
    if (!data.email) {
      throw ApiError.badRequest("Unable to retrieve email from Google.")
    }
    if (!env.GOOGLE_CLIENT_ID) {
      throw ApiError.badRequest("Google sign-in is not configured on the server.")
    }
    if (data.aud !== env.GOOGLE_CLIENT_ID) {
      throw ApiError.unauthorized("Google token audience mismatch.")
    }
    if (data.azp && data.azp !== env.GOOGLE_CLIENT_ID) {
      throw ApiError.unauthorized("Google token authorized party mismatch.")
    }
    profile = {
      sub: data.sub,
      email: data.email.toLowerCase().trim(),
      name: data.name || data.email.split("@")[0],
      picture: data.picture || "",
      emailVerified: data.email_verified === "true" || data.email_verified === true,
    }
  } else if (accessToken) {
    // 2. Google OAuth2 Access Token
    if (!env.GOOGLE_CLIENT_ID) {
      throw ApiError.badRequest("Google sign-in is not configured on the server.")
    }

    const tokenInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
    )
    if (!tokenInfoResponse.ok) {
      throw ApiError.badRequest("Invalid or expired Google access token.")
    }
    const data = await tokenInfoResponse.json()
    const audience = data.aud || data.audience
    if (audience && audience !== env.GOOGLE_CLIENT_ID) {
      throw ApiError.unauthorized("Google token audience mismatch.")
    }
    if (data.azp && data.azp !== env.GOOGLE_CLIENT_ID) {
      throw ApiError.unauthorized("Google token authorized party mismatch.")
    }

    // The tokeninfo endpoint does not reliably include the profile photo,
    // so fetch the full profile (name + picture) from the userinfo endpoint.
    let info = null
    try {
      const infoResponse = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${encodeURIComponent(accessToken)}`
      )
      if (infoResponse.ok) {
        info = await infoResponse.json()
      }
    } catch {
      /* fall back to tokeninfo data below */
    }

    const email = (info?.email || data.email || "").toLowerCase().trim()
    if (!email) {
      throw ApiError.badRequest("Unable to retrieve email from Google account.")
    }

    profile = {
      sub: info?.sub || data.sub || data.user_id,
      email,
      name: info?.name || data.name || email.split("@")[0],
      picture: info?.picture || data.picture || "",
      emailVerified:
        info?.email_verified === true ||
        data.email_verified === true ||
        data.email_verified === "true" ||
        data.verified_email === true,
    }
  } else if (isDemo && env.NODE_ENV !== "production") {
    // 3. Fallback demo mode for development testing before setting up Google Cloud Console credentials
    const demoEmail = req.body.demoEmail || "google.user@example.com"
    const demoName = req.body.demoName || "Google Explorer"
    profile = {
      sub: `demo_${Date.now()}`,
      email: demoEmail.toLowerCase().trim(),
      name: demoName,
      picture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
      emailVerified: true,
    }
  } else {
    throw ApiError.badRequest("Google credential or access token is required.")
  }

  if (!profile.emailVerified) {
    throw ApiError.badRequest("Your Google account email has not been verified.")
  }

  let user = await User.findOne({
    $or: [{ email: profile.email }, { googleId: profile.sub }],
  })

  if (user) {
    if (user.isBlocked) {
      throw ApiError.forbidden("Your account has been blocked. Please contact support.")
    }

    let modified = false
    if (!user.googleId) {
      user.googleId = profile.sub
      modified = true
    }
    const currentImageIsGoogle = user.image && /googleusercontent\.com/i.test(user.image)
    if (profile.picture && (!user.image || currentImageIsGoogle)) {
      if (user.image !== profile.picture) {
        user.image = profile.picture
        modified = true
      }
    }
    if (user.authProvider !== "google" && !user.password) {
      user.authProvider = "google"
      modified = true
    }
    if (modified) {
      await user.save()
    }
  } else {
    const assignedRole = ["customer", "vendor"].includes(role) ? role : "customer"
    user = await User.create({
      name: profile.name,
      email: profile.email,
      image: profile.picture,
      googleId: profile.sub,
      authProvider: "google",
      role: assignedRole,
      businessName:
        assignedRole === "vendor" ? (businessName?.trim() || `${profile.name}'s Kitchen`) : undefined,
    })
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
  if (image !== undefined) {
    const value = String(image).trim()
    if (value && !/^https?:\/\//i.test(value)) {
      throw ApiError.badRequest("Profile image must be a valid http(s) URL.")
    }
    user.image = value
  }
  if (businessName !== undefined && user.role === "vendor") {
    user.businessName = String(businessName).trim()
  }

  if (newPassword) {
    if (!PASSWORD_PATTERN.test(String(newPassword))) {
      throw ApiError.badRequest(PASSWORD_MESSAGE)
    }

    const providedCurrent = String(currentPassword || "")

    if (user.authUserId) {
      try {
        await auth.api.signInEmail({ body: { email: user.email, password: providedCurrent } })
      } catch {
        throw ApiError.badRequest("Current password is incorrect.")
      }
      const ctx = await auth.$context
      const hashed = await ctx.password.hash(String(newPassword))
      await ctx.internalAdapter.updatePassword(user.authUserId, hashed)
    } else {
      const matches = user.password
        ? await comparePassword(providedCurrent, user.password)
        : false
      if (!matches) {
        throw ApiError.badRequest("Current password is incorrect.")
      }
      user.password = await hashPassword(String(newPassword))
    }
  }

  await user.save()
  res.status(200).json({ success: true, user: sanitizeUser(user) })
})
