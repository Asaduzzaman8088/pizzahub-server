import { Wishlist } from "../models/Wishlist.js"
import { MenuItem } from "../models/MenuItem.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { serializeItem } from "./menu.controller.js"

const WISHLIST_POPULATE = [
  { path: "itemId", populate: { path: "vendorId", select: "name businessName image" } },
]

export const getWishlist = asyncHandler(async (req, res) => {
  const entries = await Wishlist.find({ customerId: req.user._id })
    .populate(WISHLIST_POPULATE)
    .sort({ createdAt: -1 })

  const items = entries.filter((e) => e.itemId).map((e) => serializeItem(e.itemId))
  res.status(200).json({
    success: true,
    count: items.length,
    itemIds: entries.filter((e) => e.itemId).map((e) => e.itemId._id.toString()),
    items,
  })
})

export const addToWishlist = asyncHandler(async (req, res) => {
  const { itemId } = req.body
  if (!itemId) throw ApiError.badRequest("An itemId is required.")

  const item = await MenuItem.findById(itemId)
  if (!item) throw ApiError.notFound("Pizza not found.")

  await Wishlist.findOneAndUpdate(
    { customerId: req.user._id, itemId: item._id },
    { customerId: req.user._id, itemId: item._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  res.status(201).json({ success: true, message: "Added to your wishlist." })
})

export const removeFromWishlist = asyncHandler(async (req, res) => {
  await Wishlist.findOneAndDelete({ customerId: req.user._id, itemId: req.params.itemId })
  res.status(200).json({ success: true, message: "Removed from your wishlist." })
})
