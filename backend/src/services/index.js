import { Product, Order, Coupon, Review } from '../models/index.js';
import { HttpError } from '../middleware/index.js';
export const round = (n) => Math.round(n * 100) / 100;

export async function applyCoupon(code, subtotal) {
  if (!code) return { coupon: null, discount: 0 };
  const c = await Coupon.findOne({ code: code.trim().toUpperCase(), isActive: true });
  if (!c) throw new HttpError(400, 'Invalid coupon code');
  if (c.expiry && c.expiry < new Date()) throw new HttpError(400, 'Coupon has expired');
  if (c.usageLimit && c.usedCount >= c.usageLimit) throw new HttpError(400, 'Coupon usage limit reached');
  if (subtotal < c.minSubtotal) throw new HttpError(400, `Minimum order value is ₹${c.minSubtotal}`);
  const raw = c.discountType === 'percent' ? (subtotal * c.value) / 100 : c.value;
  return { coupon: c, discount: round(Math.min(raw, subtotal)) };
}

// Atomic: the status flip and stockRestored flag guarantee stock is restored at most once.
export async function cancelOrder(filter, allowed) {
  const o = await Order.findOneAndUpdate(
    { ...filter, status: { $in: allowed }, stockRestored: false },
    { status: 'Cancelled', stockRestored: true }, { new: true });
  if (!o) return null;
  await Product.bulkWrite(o.items.map((i) => ({ updateOne: { filter: { _id: i.productId }, update: { $inc: { stock: i.quantity } } } })));
  if (o.couponCode) await Coupon.updateOne({ code: o.couponCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
  return o;
}

export async function recalcRating(productId) {
  const [r] = await Review.aggregate([{ $match: { productId, hidden: false } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
  await Product.updateOne({ _id: productId }, { ratingAvg: r ? Math.round(r.avg * 10) / 10 : 0, ratingCount: r?.n || 0 });
}
