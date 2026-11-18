import mongoose from "mongoose"

const reviewSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: [true, "Menu item reference is required"],
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer reference is required"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    comment: {
      type: String,
      required: [true, "Review comment is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

reviewSchema.index({ itemId: 1, customerId: 1 }, { unique: true })
reviewSchema.index({ itemId: 1, createdAt: -1 })

export const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema)
