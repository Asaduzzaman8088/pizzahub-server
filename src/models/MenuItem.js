import mongoose from "mongoose"

const menuItemSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Vendor reference is required"],
    },
    itemName: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: [
          "classic",
          "vegetarian",
          "meat-lovers",
          "specialty",
          "sides",
          "beverages",
        ],
        message: "{VALUE} is not a supported category",
      },
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be non-negative"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one item image is required",
      },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "inactive"],
      default: "pending",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    longDescription: {
      type: String,
      trim: true,
      default: "",
    },
    deliveryTime: {
      type: String,
      default: "30-40 min",
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: [0, "Delivery fee must be non-negative"],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isVegetarian: {
      type: Boolean,
      default: false,
    },
    isSpicy: {
      type: Boolean,
      default: false,
    },
    isGlutenFree: {
      type: Boolean,
      default: false,
    },
    doughFermentation: {
      type: String,
      default: "",
    },
    ovenTemperature: {
      type: String,
      default: "",
    },
    ingredients: {
      type: [String],
      default: [],
    },
    nutritionalInfo: {
      calories: { type: Number, default: 0 },
      protein: { type: String, default: "" },
      carbs: { type: String, default: "" },
      fat: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
  }
)

menuItemSchema.index({ status: 1, isFeatured: -1, createdAt: -1 })
menuItemSchema.index({ category: 1, status: 1 })
menuItemSchema.index({ vendorId: 1, status: 1 })

export const MenuItem = mongoose.models.MenuItem || mongoose.model("MenuItem", menuItemSchema)
