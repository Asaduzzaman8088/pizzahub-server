import { MenuItem } from "../models/MenuItem.js"
import { Review } from "../models/Review.js"

export async function recalculateItemRating(itemId) {
  const [agg] = await Review.aggregate([
    { $match: { itemId } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ])

  await MenuItem.findByIdAndUpdate(itemId, {
    rating: agg ? Number(agg.average.toFixed(1)) : 0,
    reviewCount: agg ? agg.count : 0,
  })
}
