import { User } from "../models/User.js"
import { Order } from "../models/Order.js"
import { MenuItem } from "../models/MenuItem.js"
import { Review } from "../models/Review.js"
import { Wishlist } from "../models/Wishlist.js"
import { Transaction } from "../models/Transaction.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { serializeOrder, ORDER_POPULATE } from "./order.controller.js"

function toCountMap(rows) {
  return rows.reduce((acc, row) => {
    acc[row._id] = row.count
    return acc
  }, {})
}

export const adminStats = asyncHandler(async (req, res) => {
  const [
    usersByRole,
    ordersByStatus,
    revenueAgg,
    totalItems,
    pendingItems,
    totalTransactions,
    recentOrders,
  ] = await Promise.all([
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { status: "accepted" } },
      { $group: { _id: null, revenue: { $sum: "$totalPrice" } } },
    ]),
    MenuItem.countDocuments(),
    MenuItem.countDocuments({ status: "pending" }),
    Transaction.countDocuments(),
    Order.find().populate(ORDER_POPULATE).sort({ createdAt: -1 }).limit(5),
  ])

  const roleCounts = toCountMap(usersByRole)
  const statusCounts = toCountMap(ordersByStatus)
  const totalUsers = usersByRole.reduce((sum, r) => sum + r.count, 0)
  const totalOrders = ordersByStatus.reduce((sum, r) => sum + r.count, 0)

  res.status(200).json({
    success: true,
    stats: {
      totalUsers,
      usersByRole: {
        customer: roleCounts.customer || 0,
        vendor: roleCounts.vendor || 0,
        admin: roleCounts.admin || 0,
      },
      totalOrders,
      ordersByStatus: {
        pending: statusCounts.pending || 0,
        accepted: statusCounts.accepted || 0,
        rejected: statusCounts.rejected || 0,
        cancelled: statusCounts.cancelled || 0,
      },
      revenue: revenueAgg[0]?.revenue || 0,
      totalItems,
      pendingItems,
      totalTransactions,
    },
    recentOrders: recentOrders.map(serializeOrder),
  })
})

export const vendorStats = asyncHandler(async (req, res) => {
  const vendorId = req.user._id

  const [items, orders, recentOrders] = await Promise.all([
    MenuItem.find({ vendorId }).select("status price rating reviewCount"),
    Order.find({ vendorId }).select("status totalPrice"),
    Order.find({ vendorId }).populate(ORDER_POPULATE).sort({ createdAt: -1 }).limit(5),
  ])

  const ordersByStatus = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {})

  res.status(200).json({
    success: true,
    stats: {
      totalItems: items.length,
      approvedItems: items.filter((i) => i.status === "approved").length,
      pendingItems: items.filter((i) => i.status === "pending").length,
      rejectedItems: items.filter((i) => i.status === "rejected").length,
      totalOrders: orders.length,
      ordersByStatus: {
        pending: ordersByStatus.pending || 0,
        accepted: ordersByStatus.accepted || 0,
        rejected: ordersByStatus.rejected || 0,
        cancelled: ordersByStatus.cancelled || 0,
      },
      revenue: orders
        .filter((o) => o.status === "accepted")
        .reduce((sum, o) => sum + (o.totalPrice || 0), 0),
      subscriptionPlan: req.user.subscriptionPlan || "free",
      subscriptionExpiresAt: req.user.subscriptionExpiresAt || null,
    },
    recentOrders: recentOrders.map(serializeOrder),
  })
})

export const customerStats = asyncHandler(async (req, res) => {
  const customerId = req.user._id

  const [orders, wishlistCount, reviewCount, recentOrders] = await Promise.all([
    Order.find({ customerId }).select("status totalPrice"),
    Wishlist.countDocuments({ customerId }),
    Review.countDocuments({ customerId }),
    Order.find({ customerId }).populate(ORDER_POPULATE).sort({ createdAt: -1 }).limit(5),
  ])

  const ordersByStatus = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {})

  res.status(200).json({
    success: true,
    stats: {
      totalOrders: orders.length,
      ordersByStatus: {
        pending: ordersByStatus.pending || 0,
        accepted: ordersByStatus.accepted || 0,
        rejected: ordersByStatus.rejected || 0,
        cancelled: ordersByStatus.cancelled || 0,
      },
      totalSpent: orders
        .filter((o) => o.status === "accepted")
        .reduce((sum, o) => sum + (o.totalPrice || 0), 0),
      wishlistCount,
      reviewCount,
    },
    recentOrders: recentOrders.map(serializeOrder),
  })
})
