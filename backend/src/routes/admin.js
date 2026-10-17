import { Router } from 'express';
import { z } from 'zod';
import { User, Product, Order, Coupon, Review } from '../models/index.js';
import { auth, admin, wrap, validate, HttpError } from '../middleware/index.js';
import { cancelOrder, recalcRating } from '../services/index.js';

const r = Router(); r.use(auth, admin);
const paging = (q, d = 20) => { const page = Math.max(1, +q.page || 1), limit = Math.min(100, +q.limit || d); return { page, limit, skip: (page - 1) * limit }; };

r.get('/products', wrap(async (req, res) => {
  const { page, limit, skip } = paging(req.query);
  const f = req.query.q ? { title: new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } : {};
  const [items, total] = await Promise.all([Product.find(f).populate('categoryId', 'name').sort('-createdAt').skip(skip).limit(limit), Product.countDocuments(f)]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

r.get('/orders', wrap(async (req, res) => {
  const { page, limit, skip } = paging(req.query); const f = req.query.status ? { status: req.query.status } : {};
  const [items, total] = await Promise.all([Order.find(f).populate('userId', 'name email').sort('-createdAt').skip(skip).limit(limit), Order.countDocuments(f)]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));
const NEXT = { Placed: ['Confirmed', 'Cancelled'], Confirmed: ['Completed', 'Cancelled'] };
r.patch('/orders/:id/status', validate(z.object({ status: z.enum(['Confirmed', 'Completed', 'Cancelled']) })), wrap(async (req, res) => {
  const o = await Order.findById(req.params.id); if (!o) throw new HttpError(404, 'Order not found');
  const { status } = req.body;
  if (!(NEXT[o.status] || []).includes(status)) throw new HttpError(400, `Cannot change status from ${o.status} to ${status}`);
  const done = status === 'Cancelled' ? await cancelOrder({ _id: o._id }, [o.status]) : await Order.findOneAndUpdate({ _id: o._id, status: o.status }, { status }, { new: true });
  if (!done) throw new HttpError(409, 'Order was updated by someone else, please refresh');
  res.json({ order: done });
}));

r.get('/users', wrap(async (req, res) => {
  const { page, limit, skip } = paging(req.query); const f = { role: 'customer' };
  const [items, total] = await Promise.all([User.find(f).sort('-createdAt').skip(skip).limit(limit), User.countDocuments(f)]);
  const counts = await Order.aggregate([{ $match: { userId: { $in: items.map((u) => u._id) }, status: { $ne: 'Cancelled' } } }, { $group: { _id: '$userId', orders: { $sum: 1 }, spent: { $sum: '$total' } } }]);
  const m = new Map(counts.map((c) => [String(c._id), c]));
  res.json({ items: items.map((u) => ({ ...u.toObject(), orders: m.get(String(u._id))?.orders || 0, spent: m.get(String(u._id))?.spent || 0 })), total, page, pages: Math.ceil(total / limit) });
}));
r.patch('/users/:id', validate(z.object({ isActive: z.boolean() })), wrap(async (req, res) => {
  const u = await User.findOneAndUpdate({ _id: req.params.id, role: 'customer' }, req.body, { new: true });
  if (!u) throw new HttpError(404, 'Customer not found'); res.json({ user: u });
}));

const couponSchema = z.object({ code: z.string().min(3).max(30), discountType: z.enum(['percent', 'fixed']), value: z.number().min(1),
  minSubtotal: z.number().min(0).default(0), expiry: z.string().nullable().optional(), usageLimit: z.number().int().min(0).default(0), isActive: z.boolean().optional() })
  .refine((c) => c.discountType !== 'percent' || c.value <= 100, { message: 'percent cannot exceed 100', path: ['value'] });
r.get('/coupons', wrap(async (req, res) => res.json({ items: await Coupon.find().sort('-createdAt') })));
r.post('/coupons', validate(couponSchema), wrap(async (req, res) => res.status(201).json({ coupon: await Coupon.create({ ...req.body, expiry: req.body.expiry || undefined }) })));
r.patch('/coupons/:id', validate(z.object({ isActive: z.boolean().optional(), usageLimit: z.number().int().min(0).optional(), expiry: z.string().nullable().optional() })), wrap(async (req, res) => {
  const c = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!c) throw new HttpError(404, 'Coupon not found'); res.json({ coupon: c });
}));
r.delete('/coupons/:id', wrap(async (req, res) => { await Coupon.deleteOne({ _id: req.params.id }); res.json({ message: 'Deleted' }); }));

r.get('/reviews', wrap(async (req, res) => res.json({ items: await Review.find().populate('userId', 'name').populate('productId', 'title').sort('-createdAt').limit(100) })));
r.patch('/reviews/:id/hide', validate(z.object({ hidden: z.boolean() })), wrap(async (req, res) => {
  const rv = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!rv) throw new HttpError(404, 'Review not found');
  await recalcRating(rv.productId); res.json({ review: rv });
}));

r.get('/analytics/overview', wrap(async (req, res) => {
  const live = { status: { $ne: 'Cancelled' } }, since = new Date(Date.now() - 30 * 864e5);
  const [tot, statusCounts, salesByDay, topProducts, lowStock, customers, products] = await Promise.all([
    Order.aggregate([{ $match: live }, { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$total' } } }]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { ...live, createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Order.aggregate([{ $match: live }, { $unwind: '$items' }, { $group: { _id: '$items.productId', title: { $first: '$items.title' }, units: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } }, { $sort: { units: -1 } }, { $limit: 5 }]),
    Product.find({ isActive: true, stock: { $lte: 5 } }).select('title stock').sort('stock').limit(10),
    User.countDocuments({ role: 'customer' }), Product.countDocuments({ isActive: true })]);
  const { orders = 0, revenue = 0 } = tot[0] || {};
  res.json({ orders, revenue, avgOrderValue: orders ? Math.round(revenue / orders) : 0, customers, products,
    statusCounts: Object.fromEntries(statusCounts.map((s) => [s._id, s.count])), salesByDay: salesByDay.map((d) => ({ date: d._id, revenue: d.revenue, orders: d.orders })), topProducts, lowStock });
}));
export default r;
