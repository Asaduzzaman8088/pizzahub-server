import mongoose from "mongoose"

const transactionSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Vendor reference is required"],
    },
    plan: {
      type: String,
      enum: ["premium"],
      default: "premium",
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },
    currency: {
      type: String,
      default: "usd",
      lowercase: true,
    },
    stripeSessionId: {
      type: String,
      required: [true, "Stripe session ID is required"],
    },
    stripeSubscriptionId: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["succeeded", "pending", "failed"],
      default: "succeeded",
    },
  },
  {
    timestamps: true,
  }
)

transactionSchema.index({ stripeSessionId: 1 }, { unique: true })
transactionSchema.index({ vendorId: 1, createdAt: -1 })

export const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema)
