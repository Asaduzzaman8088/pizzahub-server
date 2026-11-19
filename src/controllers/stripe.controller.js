import Stripe from "stripe"
import { env } from "../config/env.js"
import { User } from "../models/User.js"
import { MenuItem } from "../models/MenuItem.js"
import { Transaction } from "../models/Transaction.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { isPremiumActive } from "../utils/subscription.js"

const PREMIUM_DAYS = 30

let stripeClient = null

function getStripe() {
  if (!env.STRIPE_SECRET_KEY) return null
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY)
  }
  return stripeClient
}

async function activatePremium({ vendorId, sessionId, subscriptionId, amount }) {
  const expiresAt = new Date(Date.now() + PREMIUM_DAYS * 24 * 60 * 60 * 1000)

  await User.findByIdAndUpdate(vendorId, {
    subscriptionPlan: "premium",
    subscriptionExpiresAt: expiresAt,
  })

  await Transaction.findOneAndUpdate(
    { stripeSessionId: sessionId },
    {
      vendorId,
      plan: "premium",
      amount: amount || 5,
      currency: "usd",
      stripeSessionId: sessionId,
      stripeSubscriptionId: subscriptionId || "",
      status: "succeeded",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  // Premium benefit: feature the vendor's listings on the homepage.
  await MenuItem.updateMany({ vendorId }, { isFeatured: true })

  return expiresAt
}

async function downgradeVendor(vendorId) {
  if (!vendorId) return
  await User.findByIdAndUpdate(vendorId, {
    subscriptionPlan: "free",
    subscriptionExpiresAt: null,
  })
  // Remove the premium featured placement when the plan ends.
  await MenuItem.updateMany({ vendorId }, { isFeatured: false })
}

async function findVendorIdBySubscription(subscriptionId) {
  if (!subscriptionId) return null
  const transaction = await Transaction.findOne({ stripeSubscriptionId: subscriptionId }).select(
    "vendorId"
  )
  return transaction?.vendorId || null
}

export const getSubscriptionStatus = asyncHandler(async (req, res) => {
  const active = isPremiumActive(req.user)

  res.status(200).json({
    success: true,
    plan: active ? "premium" : "free",
    subscriptionExpiresAt: active ? req.user.subscriptionExpiresAt : null,
    stripeConfigured: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PREMIUM_PRICE_ID),
  })
})

export const createCheckoutSession = asyncHandler(async (req, res) => {
  const stripe = getStripe()
  if (!stripe) {
    throw new ApiError(
      503,
      "Stripe is not configured on the server. Add STRIPE_SECRET_KEY and STRIPE_PREMIUM_PRICE_ID to enable checkout."
    )
  }
  if (!env.STRIPE_PREMIUM_PRICE_ID) {
    throw new ApiError(503, "STRIPE_PREMIUM_PRICE_ID is missing from the server environment.")
  }
  if (req.user.role !== "vendor") {
    throw ApiError.forbidden("Only vendor accounts can purchase the Premium plan.")
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: env.STRIPE_PREMIUM_PRICE_ID, quantity: 1 }],
    success_url: `${env.CLIENT_URL}/payment/success`,
    cancel_url: `${env.CLIENT_URL}/payment/cancel`,
    customer_email: req.user.email,
    client_reference_id: req.user._id.toString(),
    metadata: { vendorId: req.user._id.toString(), plan: "premium" },
  })

  res.status(200).json({ success: true, id: session.id, url: session.url })
})

export const handleWebhook = async (req, res) => {
  const stripe = getStripe()
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ success: false, message: "Stripe webhook is not configured." })
  }

  const signature = req.headers["stripe-signature"]
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return res
      .status(400)
      .json({ success: false, message: `Webhook signature verification failed: ${err.message}` })
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object
      const vendorId = session.metadata?.vendorId || session.client_reference_id
      if (vendorId) {
        await activatePremium({
          vendorId,
          sessionId: session.id,
          subscriptionId: session.subscription,
          amount: session.amount_total ? session.amount_total / 100 : 5,
        })
      }
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object
      const vendorId =
        subscription.metadata?.vendorId ||
        (await findVendorIdBySubscription(subscription.id))
      await downgradeVendor(vendorId)
    } else if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object
      if (["canceled", "unpaid", "incomplete_expired"].includes(subscription.status)) {
        const vendorId =
          subscription.metadata?.vendorId ||
          (await findVendorIdBySubscription(subscription.id))
        await downgradeVendor(vendorId)
      }
    } else if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object
      if (invoice.subscription) {
        await Transaction.updateMany(
          { stripeSubscriptionId: invoice.subscription },
          { status: "failed" }
        )
      }
    }

    res.status(200).json({ received: true })
  } catch (err) {
    console.error("[Stripe] Webhook handling failed:", err)
    res.status(500).json({ success: false, message: "Webhook handling failed." })
  }
}

/**
 * Development-only helper so the Premium flow can be demoed without real
 * Stripe keys. Disabled in production.
 */
export const simulatePremiumUpgrade = asyncHandler(async (req, res) => {
  if (env.NODE_ENV === "production") {
    throw ApiError.notFound("Not available.")
  }
  if (req.user.role !== "vendor") {
    throw ApiError.forbidden("Only vendors can upgrade.")
  }

  const sessionId = `demo_${req.user._id}_${Date.now()}`
  const expiresAt = await activatePremium({
    vendorId: req.user._id,
    sessionId,
    subscriptionId: `demo_sub_${Date.now()}`,
    amount: 5,
  })

  res.status(200).json({
    success: true,
    message: "Demo Premium activated for 30 days.",
    subscriptionPlan: "premium",
    subscriptionExpiresAt: expiresAt,
  })
})
