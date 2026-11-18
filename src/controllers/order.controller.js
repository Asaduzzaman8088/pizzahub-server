import { Order } from "../models/Order.js"
import { MenuItem } from "../models/MenuItem.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"

export const ORDER_POPULATE = [
  { path: "itemId", select: "itemName images price location category" },
  { path: "vendorId", select: "name businessName image email" },
  { path: "customerId", select: "name email image" },
]

export function serializeOrder(order) {
  const item = order.itemId && order.itemId._id ? order.itemId : null
  const vendor = order.vendorId && order.vendorId._id ? order.vendorId : null
  const customer = order.customerId && order.customerId._id ? order.customerId : null

  return {
    id: order._id.toString(),
    status: order.status,
    quantity: order.quantity,
    unitPrice: order.unitPrice,
    totalPrice: order.totalPrice,
    deliveryDate: order.deliveryDate,
    deliveryAddress: order.deliveryAddress,
    message: order.message,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    item: item
      ? {
          id: item._id.toString(),
          name: item.itemName,
          images: item.images,
          price: item.price,
          location: item.location,
          category: item.category,
        }
      : null,
    vendor: vendor
      ? {
          id: vendor._id.toString(),
          name: vendor.businessName || vendor.name,
          image: vendor.image,
          email: vendor.email,
        }
      : null,
    customer: customer
      ? { id: customer._id.toString(), name: customer.name, email: customer.email, image: customer.image }
      : null,
  }
}

export const createOrder = asyncHandler(async (req, res) => {
  const { itemId, quantity = 1, deliveryDate, deliveryAddress, message } = req.body

  if (!itemId) throw ApiError.badRequest("A pizza (itemId) is required.")
  if (!deliveryDate) throw ApiError.badRequest("A delivery date is required.")
  if (!deliveryAddress?.trim()) throw ApiError.badRequest("A delivery address is required.")

  const parsedDate = new Date(deliveryDate)
  if (Number.isNaN(parsedDate.getTime())) {
    throw ApiError.badRequest("Delivery date is invalid.")
  }

  const item = await MenuItem.findById(itemId)
  if (!item || item.status !== "approved" || item.isAvailable === false) {
    throw ApiError.notFound("This pizza is not available for ordering.")
  }

  const qty = Math.min(20, Math.max(1, Number(quantity) || 1))

  const dayStart = new Date(parsedDate)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)

  const duplicate = await Order.findOne({
    customerId: req.user._id,
    itemId: item._id,
    status: { $in: ["pending", "accepted"] },
    deliveryDate: { $gte: dayStart, $lt: dayEnd },
  })
  if (duplicate) {
    throw ApiError.conflict(
      "You already have an active order for this pizza on the selected delivery date."
    )
  }

  const order = await Order.create({
    itemId: item._id,
    vendorId: item.vendorId,
    customerId: req.user._id,
    deliveryDate: parsedDate,
    deliveryAddress: deliveryAddress.trim(),
    message: message?.trim() || "",
    quantity: qty,
    unitPrice: item.price,
    totalPrice: Number((item.price * qty).toFixed(2)),
  })

  await order.populate(ORDER_POPULATE)
  res.status(201).json({ success: true, order: serializeOrder(order) })
})

export const listMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ customerId: req.user._id })
    .populate(ORDER_POPULATE)
    .sort({ createdAt: -1 })
  res.status(200).json({ success: true, count: orders.length, orders: orders.map(serializeOrder) })
})

export const listVendorOrders = asyncHandler(async (req, res) => {
  const filter = { vendorId: req.user._id }
  if (req.query.status) filter.status = req.query.status
  const orders = await Order.find(filter)
    .populate(ORDER_POPULATE)
    .sort({ createdAt: -1 })
  res.status(200).json({ success: true, count: orders.length, orders: orders.map(serializeOrder) })
})

export const listAllOrders = asyncHandler(async (req, res) => {
  const filter = {}
  if (req.query.status) filter.status = req.query.status
  const orders = await Order.find(filter)
    .populate(ORDER_POPULATE)
    .sort({ createdAt: -1 })
    .limit(500)
  res.status(200).json({ success: true, count: orders.length, orders: orders.map(serializeOrder) })
})

export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(ORDER_POPULATE)
  if (!order) throw ApiError.notFound("Order not found.")

  const userId = String(req.user._id)
  const isOwner =
    String(order.customerId?._id) === userId || String(order.vendorId?._id) === userId
  if (!isOwner && req.user.role !== "admin") {
    throw ApiError.forbidden("You cannot view this order.")
  }

  res.status(200).json({ success: true, order: serializeOrder(order) })
})

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body
  const validStatuses = ["pending", "accepted", "rejected", "cancelled"]
  if (!validStatuses.includes(status)) {
    throw ApiError.badRequest("Invalid order status.")
  }

  const order = await Order.findById(req.params.id)
  if (!order) throw ApiError.notFound("Order not found.")

  const isAdmin = req.user.role === "admin"
  const isVendor = String(order.vendorId) === String(req.user._id)
  const isCustomer = String(order.customerId) === String(req.user._id)

  let allowed = false
  if (isAdmin) {
    allowed = true
  } else if (isVendor) {
    allowed = order.status === "pending" && ["accepted", "rejected"].includes(status)
  } else if (isCustomer) {
    allowed = order.status === "pending" && status === "cancelled"
  }

  if (!allowed) {
    throw ApiError.badRequest("This status change is not permitted for this order.")
  }

  order.status = status
  await order.save()
  await order.populate(ORDER_POPULATE)

  res.status(200).json({ success: true, order: serializeOrder(order) })
})
