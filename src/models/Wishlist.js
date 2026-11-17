import mongoose from "mongoose"

const wishlistSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer reference is required"],
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: [true, "Menu item reference is required"],
    },
  },
  {
    timestamps: true,
  }
)

wishlistSchema.index({ customerId: 1, itemId: 1 }, { unique: true })

export const Wishlist = mongoose.models.Wishlist || mongoose.model("Wishlist", wishlistSchema)
