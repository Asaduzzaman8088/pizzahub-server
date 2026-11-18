import { Review } from "../models/Review.js"
import { MenuItem } from "../models/MenuItem.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { recalculateItemRating } from "../utils/ratings.js"

export function serializeReview(review) {
  const customer = review.customerId && review.customerId._id ? review.customerId : null
  return {
    id: review._id.toString(),
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    customer: customer
      ? { id: customer._id.toString(), name: customer.name, image: customer.image }
      : null,
  }
}

export const listReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ itemId: req.params.itemId })
    .populate("customerId", "name image")
    .sort({ createdAt: -1 })
  res.status(200).json({ success: true, count: reviews.length, reviews: reviews.map(serializeReview) })
})

export const upsertReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body
  const parsedRating = Number(rating)

  if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    throw ApiError.badRequest("Rating must be a whole number between 1 and 5.")
  }
  if (!comment?.trim() || comment.trim().length < 3) {
    throw ApiError.badRequest("Please write a comment of at least 3 characters.")
  }

  const item = await MenuItem.findById(req.params.itemId)
  if (!item) throw ApiError.notFound("Pizza not found.")

  const review = await Review.findOneAndUpdate(
    { itemId: item._id, customerId: req.user._id },
    { rating: parsedRating, comment: comment.trim() },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate("customerId", "name image")

  await recalculateItemRating(item._id)

  res.status(200).json({ success: true, review: serializeReview(review) })
})

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)
  if (!review) throw ApiError.notFound("Review not found.")

  const isOwner = String(review.customerId) === String(req.user._id)
  if (!isOwner && req.user.role !== "admin") {
    throw ApiError.forbidden("You can only delete your own reviews.")
  }

  const itemId = review.itemId
  await review.deleteOne()
  await recalculateItemRating(itemId)

  res.status(200).json({ success: true, message: "Review deleted." })
})
