import { User } from "../models/User.js"
import { Order } from "../models/Order.js"
import { MenuItem } from "../models/MenuItem.js"
import { Review } from "../models/Review.js"
import { Wishlist } from "../models/Wishlist.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { sanitizeUser } from "./auth.controller.js"

export const listUsers = asyncHandler(async (req, res) => {
  const { search, role, page = 1, limit = 20 } = req.query
  const filter = {}

  if (role && ["customer", "vendor", "admin"].includes(role)) filter.role = role
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { businessName: { $regex: search, $options: "i" } },
    ]
  }

  const pageNum = Math.max(1, Number(page) || 1)
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20))

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    User.countDocuments(filter),
  ])

  res.status(200).json({
    success: true,
    total,
    page: pageNum,
    pages: Math.max(1, Math.ceil(total / limitNum)),
    users: users.map(sanitizeUser),
  })
})

export const setUserBlocked = asyncHandler(async (req, res) => {
  const { isBlocked } = req.body
  if (typeof isBlocked !== "boolean") {
    throw ApiError.badRequest("isBlocked must be a boolean.")
  }
  if (String(req.params.id) === String(req.user._id)) {
    throw ApiError.badRequest("You cannot block your own account.")
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBlocked },
    { new: true, runValidators: true }
  )
  if (!user) throw ApiError.notFound("User not found.")

  res.status(200).json({ success: true, user: sanitizeUser(user) })
})

export const setUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body
  if (!["customer", "vendor", "admin"].includes(role)) {
    throw ApiError.badRequest("Invalid role.")
  }
  if (String(req.params.id) === String(req.user._id) && role !== "admin") {
    throw ApiError.badRequest("You cannot remove your own admin role.")
  }

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true })
  if (!user) throw ApiError.notFound("User not found.")

  res.status(200).json({ success: true, user: sanitizeUser(user) })
})

export const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    throw ApiError.badRequest("You cannot delete your own account.")
  }

  const user = await User.findById(req.params.id)
  if (!user) throw ApiError.notFound("User not found.")

  const itemIds = await MenuItem.find({ vendorId: user._id }).distinct("_id")

  await Promise.all([
    Order.deleteMany({ $or: [{ vendorId: user._id }, { customerId: user._id }] }),
    Review.deleteMany({ $or: [{ customerId: user._id }, { itemId: { $in: itemIds } }] }),
    Wishlist.deleteMany({ $or: [{ customerId: user._id }, { itemId: { $in: itemIds } }] }),
    MenuItem.deleteMany({ vendorId: user._id }),
    user.deleteOne(),
  ])

  res.status(200).json({ success: true, message: "User and related data deleted." })
})
