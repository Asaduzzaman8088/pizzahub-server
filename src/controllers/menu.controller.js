import { MenuItem } from "../models/MenuItem.js"
import { Review } from "../models/Review.js"
import { Wishlist } from "../models/Wishlist.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { optionalAuth, verifyToken, requireRole } from "../middlewares/auth.js"

const CATEGORY_LABELS = {
  neapolitan: "Neapolitan Wood-Fired",
  "new-york": "New York Foldable",
  "deep-dish": "Chicago Deep Dish",
  detroit: "Detroit Square",
  gourmet: "Gourmet White",
  vegan: "Vegan & Plant-Based",
  "gluten-free": "Gluten-Free Cauliflower",
}

export function serializeItem(item) {
  const vendor = item.vendorId && item.vendorId._id ? item.vendorId : null
  return {
    id: item._id.toString(),
    itemName: item.itemName,
    name: item.itemName,
    category: item.category,
    categoryLabel: CATEGORY_LABELS[item.category] || item.category,
    description: item.description,
    longDescription: item.longDescription || item.description,
    price: item.price,
    location: item.location,
    images: item.images,
    status: item.status,
    isFeatured: item.isFeatured,
    rating: item.rating || 0,
    reviewCount: item.reviewCount || 0,
    deliveryTime: item.deliveryTime || "30-40 min",
    deliveryFee: item.deliveryFee || 0,
    isVegetarian: item.isVegetarian,
    isSpicy: item.isSpicy,
    isGlutenFree: item.isGlutenFree,
    doughFermentation: item.doughFermentation || "",
    ovenTemperature: item.ovenTemperature || "",
    ingredients: item.ingredients || [],
    nutritionalInfo: item.nutritionalInfo || { calories: 0, protein: "", carbs: "", fat: "" },
    vendorId: vendor ? vendor._id.toString() : item.vendorId?.toString(),
    vendorName: vendor?.businessName || vendor?.name || "PizzaHub Vendor",
    vendorLocation: item.location,
    vendorAddress: item.location,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

const VENDOR_POPULATE = { path: "vendorId", select: "name businessName image email" }

function buildSort(sort) {
  switch (sort) {
    case "price-asc":
      return { price: 1 }
    case "price-desc":
      return { price: -1 }
    case "rating":
      return { rating: -1 }
    case "oldest":
      return { createdAt: 1 }
    default:
      return { createdAt: -1 }
  }
}

export const listMenuItems = asyncHandler(async (req, res) => {
  const {
    search,
    category,
    location,
    vendorId,
    featured,
    sort,
    status,
    page = 1,
    limit = 12,
  } = req.query

  const filter = {}

  if (req.user?.role === "admin" && status) {
    filter.status = status
  } else if (req.user?.role === "vendor" && req.query.vendorId === "me") {
    filter.vendorId = req.user._id
  } else {
    filter.status = "approved"
  }

  if (search) {
    filter.$or = [
      { itemName: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ]
  }
  if (category && CATEGORY_LABELS[category]) filter.category = category
  if (location) filter.location = { $regex: location, $options: "i" }
  if (vendorId && vendorId !== "me") filter.vendorId = vendorId
  if (featured === "true") filter.isFeatured = true

  const pageNum = Math.max(1, Number(page) || 1)
  const limitNum = Math.min(50, Math.max(1, Number(limit) || 12))

  const [items, total] = await Promise.all([
    MenuItem.find(filter)
      .populate(VENDOR_POPULATE)
      .sort(buildSort(sort))
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    MenuItem.countDocuments(filter),
  ])

  res.status(200).json({
    success: true,
    count: items.length,
    total,
    page: pageNum,
    pages: Math.max(1, Math.ceil(total / limitNum)),
    items: items.map(serializeItem),
  })
})

export const getMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id).populate(VENDOR_POPULATE)
  if (!item) throw ApiError.notFound("Pizza not found.")

  const isOwner = req.user && item.vendorId && String(item.vendorId._id) === String(req.user._id)
  const isAdmin = req.user?.role === "admin"
  if (item.status !== "approved" && !isOwner && !isAdmin) {
    throw ApiError.notFound("Pizza not found.")
  }

  const [ratingAgg] = await Review.aggregate([
    { $match: { itemId: item._id } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ])

  res.status(200).json({
    success: true,
    item: {
      ...serializeItem(item),
      rating: ratingAgg ? Number(ratingAgg.average.toFixed(1)) : item.rating || 0,
      reviewCount: ratingAgg ? ratingAgg.count : item.reviewCount || 0,
    },
  })
})

export const getMyVendorItems = asyncHandler(async (req, res) => {
  const items = await MenuItem.find({ vendorId: req.user._id })
    .populate(VENDOR_POPULATE)
    .sort({ createdAt: -1 })
  res.status(200).json({ success: true, count: items.length, items: items.map(serializeItem) })
})

export const listAllItemsAdmin = asyncHandler(async (req, res) => {
  const filter = {}
  if (req.query.status) filter.status = req.query.status
  if (req.query.category) filter.category = req.query.category
  if (req.query.search) {
    filter.itemName = { $regex: req.query.search, $options: "i" }
  }
  const items = await MenuItem.find(filter)
    .populate(VENDOR_POPULATE)
    .sort({ createdAt: -1 })
    .limit(500)
  res.status(200).json({ success: true, count: items.length, items: items.map(serializeItem) })
})

function parseItemPayload(body, { isAdmin, isVendor }) {
  const itemName = body.itemName || body.name
  const payload = {}

  if (itemName !== undefined) {
    if (!String(itemName).trim()) throw ApiError.badRequest("Item name is required.")
    payload.itemName = String(itemName).trim()
  }
  if (body.category !== undefined) payload.category = body.category
  if (body.description !== undefined) {
    if (!String(body.description).trim()) throw ApiError.badRequest("Description is required.")
    payload.description = String(body.description).trim()
  }
  if (body.price !== undefined) {
    const price = Number(body.price)
    if (Number.isNaN(price) || price < 0) throw ApiError.badRequest("Price must be a positive number.")
    payload.price = price
  }
  if (body.location !== undefined) {
    if (!String(body.location).trim()) throw ApiError.badRequest("Location is required.")
    payload.location = String(body.location).trim()
  }
  if (body.images !== undefined) {
    if (!Array.isArray(body.images) || body.images.filter(Boolean).length === 0) {
      throw ApiError.badRequest("At least one image URL is required.")
    }
    payload.images = body.images.filter(Boolean)
  }
  if (body.longDescription !== undefined) payload.longDescription = body.longDescription
  if (body.deliveryTime !== undefined) payload.deliveryTime = body.deliveryTime
  if (body.deliveryFee !== undefined) payload.deliveryFee = Math.max(0, Number(body.deliveryFee) || 0)
  if (body.isVegetarian !== undefined) payload.isVegetarian = Boolean(body.isVegetarian)
  if (body.isSpicy !== undefined) payload.isSpicy = Boolean(body.isSpicy)
  if (body.isGlutenFree !== undefined) payload.isGlutenFree = Boolean(body.isGlutenFree)
  if (body.doughFermentation !== undefined) payload.doughFermentation = body.doughFermentation
  if (body.ovenTemperature !== undefined) payload.ovenTemperature = body.ovenTemperature
  if (body.ingredients !== undefined && Array.isArray(body.ingredients)) payload.ingredients = body.ingredients
  if (body.nutritionalInfo !== undefined) payload.nutritionalInfo = body.nutritionalInfo

  if (isAdmin && body.status !== undefined) payload.status = body.status
  if (isAdmin && body.isFeatured !== undefined) payload.isFeatured = Boolean(body.isFeatured)
  if (isVendor) payload.isFeatured = false

  return payload
}

export const createMenuItem = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === "admin"
  const payload = parseItemPayload(req.body, { isAdmin, isVendor: !isAdmin })

  const required = ["itemName", "category", "description", "price", "location", "images"]
  const missing = required.filter((key) => payload[key] === undefined)
  if (missing.length > 0) {
    throw ApiError.badRequest(`Missing required fields: ${missing.join(", ")}.`)
  }

  if (!isAdmin) {
    const vendor = req.user
    const activeCount = await MenuItem.countDocuments({
      vendorId: vendor._id,
      status: { $in: ["pending", "approved"] },
    })
    if (vendor.subscriptionPlan !== "premium" && activeCount >= 3) {
      throw ApiError.forbidden(
        "Free vendor accounts can list up to 3 active pizzas. Upgrade to Premium for unlimited listings."
      )
    }
    payload.vendorId = vendor._id
    payload.status = "pending"
    payload.isFeatured = false
    if (!req.body.location && vendor.businessName) payload.location = vendor.businessName
  } else {
    payload.vendorId = req.body.vendorId
    if (!payload.vendorId) throw ApiError.badRequest("A vendorId is required when creating as admin.")
    payload.status = req.body.status || "approved"
    payload.isFeatured = Boolean(req.body.isFeatured)
  }

  const item = await MenuItem.create(payload)
  await item.populate(VENDOR_POPULATE)

  res.status(201).json({ success: true, item: serializeItem(item) })
})

export const updateMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id)
  if (!item) throw ApiError.notFound("Pizza not found.")

  const isAdmin = req.user.role === "admin"
  const isOwner = String(item.vendorId) === String(req.user._id)
  if (!isAdmin && !isOwner) throw ApiError.forbidden("You can only edit your own menu items.")

  const payload = parseItemPayload(req.body, { isAdmin, isVendor: !isAdmin })
  Object.assign(item, payload)

  if (!isAdmin) {
    item.status = "pending"
    item.isFeatured = false
  }

  await item.save()
  await item.populate(VENDOR_POPULATE)

  res.status(200).json({ success: true, item: serializeItem(item) })
})

export const deleteMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id)
  if (!item) throw ApiError.notFound("Pizza not found.")

  const isAdmin = req.user.role === "admin"
  const isOwner = String(item.vendorId) === String(req.user._id)
  if (!isAdmin && !isOwner) throw ApiError.forbidden("You can only delete your own menu items.")

  await Promise.all([
    Review.deleteMany({ itemId: item._id }),
    Wishlist.deleteMany({ itemId: item._id }),
    item.deleteOne(),
  ])

  res.status(200).json({ success: true, message: "Menu item deleted." })
})

export const setItemStatus = asyncHandler(async (req, res) => {
  const { status } = req.body
  if (!["pending", "approved", "rejected", "inactive"].includes(status)) {
    throw ApiError.badRequest("Invalid status value.")
  }
  const item = await MenuItem.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  ).populate(VENDOR_POPULATE)
  if (!item) throw ApiError.notFound("Pizza not found.")
  res.status(200).json({ success: true, item: serializeItem(item) })
})

export const setItemFeatured = asyncHandler(async (req, res) => {
  const item = await MenuItem.findByIdAndUpdate(
    req.params.id,
    { isFeatured: Boolean(req.body.isFeatured) },
    { new: true }
  ).populate(VENDOR_POPULATE)
  if (!item) throw ApiError.notFound("Pizza not found.")
  res.status(200).json({ success: true, item: serializeItem(item) })
})

export const menuGuards = {
  publicList: optionalAuth,
  publicDetail: optionalAuth,
  vendorOnly: [verifyToken, requireRole("vendor", "admin")],
  adminOnly: [verifyToken, requireRole("admin")],
  authenticated: verifyToken,
}
