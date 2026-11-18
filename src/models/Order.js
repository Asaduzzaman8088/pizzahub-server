import mongoose from "mongoose"

const orderSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: [true, "Menu item reference is required"],
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Vendor reference is required"],
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer reference is required"],
    },
    deliveryDate: {
      type: Date,
      required: [true, "Delivery date is required"],
    },
    deliveryAddress: {
      type: String,
      required: [true, "Delivery address is required"],
      trim: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, "Quantity must be at least 1"],
    },
    unitPrice: {
      type: Number,
      default: 0,
      min: [0, "Unit price must be non-negative"],
    },
    totalPrice: {
      type: Number,
      default: 0,
      min: [0, "Total price must be non-negative"],
    },
    message: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
)

orderSchema.index({ customerId: 1, createdAt: -1 })
orderSchema.index({ vendorId: 1, status: 1, createdAt: -1 })
orderSchema.index({ status: 1, createdAt: -1 })

export const Order = mongoose.models.Order || mongoose.model("Order", orderSchema)
