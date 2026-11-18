export function isPremiumActive(user) {
  if (!user || user.subscriptionPlan !== "premium") return false
  if (!user.subscriptionExpiresAt) return true
  return new Date(user.subscriptionExpiresAt).getTime() > Date.now()
}
